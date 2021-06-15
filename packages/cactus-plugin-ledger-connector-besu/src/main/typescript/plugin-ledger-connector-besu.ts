import { Server } from "http";
import { Server as SecureServer } from "https";

import type { Server as SocketIoServer } from "socket.io";
import type { Socket as SocketIoSocket } from "socket.io";
import type { Express } from "express";
import { promisify } from "util";
import { Optional } from "typescript-optional";
import Web3 from "web3";
import { AbiItem } from "web3-utils";

import { Contract, ContractSendMethod } from "web3-eth-contract";
import { TransactionReceipt } from "web3-eth";
import {
  GetBalanceV1Request,
  GetBalanceV1Response,
} from "./generated/openapi/typescript-axios/index";

import {
  GetPastLogsV1Request,
  GetPastLogsV1Response,
} from "./generated/openapi/typescript-axios/index";
import {
  ConsensusAlgorithmFamily,
  IPluginLedgerConnector,
  IWebServiceEndpoint,
  IPluginWebService,
  ICactusPlugin,
  ICactusPluginOptions,
} from "@hyperledger/cactus-core-api";

import {
  PluginRegistry,
  consensusHasTransactionFinality,
} from "@hyperledger/cactus-core";

import {
  Checks,
  CodedError,
  IJsObjectSignerOptions,
  JsObjectSigner,
  KeyConverter,
  KeyFormat,
  Logger,
  LoggerProvider,
  LogLevelDesc,
} from "@hyperledger/cactus-common";

import { DeployContractSolidityBytecodeEndpoint } from "./web-services/deploy-contract-solidity-bytecode-endpoint";

import {
  WatchBlocksV1,
  ConsistencyStrategy,
  DeployContractSolidityBytecodeV1Request,
  DeployContractSolidityBytecodeV1Response,
  EthContractInvocationType,
  InvokeContractV1Request,
  InvokeContractV1Response,
  ReceiptType,
  RunTransactionRequest,
  RunTransactionResponse,
  SignTransactionRequest,
  SignTransactionResponse,
  Web3SigningCredentialCactusKeychainRef,
  Web3SigningCredentialPrivateKeyHex,
  Web3SigningCredentialType,
  GetTransactionV1Request,
  GetTransactionV1Response,
} from "./generated/openapi/typescript-axios/";

import { RunTransactionEndpoint } from "./web-services/run-transaction-endpoint";
import { InvokeContractEndpoint } from "./web-services/invoke-contract-endpoint";
import { isWeb3SigningCredentialNone } from "./model-type-guards";
import { BesuSignTransactionEndpointV1 } from "./web-services/sign-transaction-endpoint-v1";
import { PrometheusExporter } from "./prometheus-exporter/prometheus-exporter";
import {
  GetPrometheusExporterMetricsEndpointV1,
  IGetPrometheusExporterMetricsEndpointV1Options,
} from "./web-services/get-prometheus-exporter-metrics-endpoint-v1";
import { WatchBlocksV1Endpoint } from "./web-services/watch-blocks-v1-endpoint";
import { GetBalanceEndpoint } from "./web-services/get-balance-endpoint";

export const E_KEYCHAIN_NOT_FOUND = "cactus.connector.besu.keychain_not_found";

export interface IPluginLedgerConnectorBesuOptions
  extends ICactusPluginOptions {
  rpcApiHttpHost: string;
  rpcApiWsHost: string;
  pluginRegistry: PluginRegistry;
  prometheusExporter?: PrometheusExporter;
  logLevel?: LogLevelDesc;
}

export class PluginLedgerConnectorBesu
  implements
    IPluginLedgerConnector<
      DeployContractSolidityBytecodeV1Request,
      DeployContractSolidityBytecodeV1Response,
      RunTransactionRequest,
      RunTransactionResponse
    >,
    ICactusPlugin,
    IPluginWebService {
  private readonly instanceId: string;
  public prometheusExporter: PrometheusExporter;
  private readonly log: Logger;
  private readonly web3: Web3;
  private readonly pluginRegistry: PluginRegistry;
  private contracts: {
    [name: string]: Contract;
  } = {};

  private endpoints: IWebServiceEndpoint[] | undefined;
  private httpServer: Server | SecureServer | null = null;

  public static readonly CLASS_NAME = "PluginLedgerConnectorBesu";

  public get className(): string {
    return PluginLedgerConnectorBesu.CLASS_NAME;
  }

  constructor(public readonly options: IPluginLedgerConnectorBesuOptions) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(options, `${fnTag} arg options`);
    Checks.truthy(options.rpcApiHttpHost, `${fnTag} options.rpcApiHttpHost`);
    Checks.truthy(options.rpcApiWsHost, `${fnTag} options.rpcApiWsHost`);
    Checks.truthy(options.pluginRegistry, `${fnTag} options.pluginRegistry`);
    Checks.truthy(options.instanceId, `${fnTag} options.instanceId`);

    const level = this.options.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });

    const web3WsProvider = new Web3.providers.WebsocketProvider(
      this.options.rpcApiWsHost,
    );
    this.web3 = new Web3(web3WsProvider);
    this.instanceId = options.instanceId;
    this.pluginRegistry = options.pluginRegistry;
    this.prometheusExporter =
      options.prometheusExporter ||
      new PrometheusExporter({ pollingIntervalInMin: 1 });
    Checks.truthy(
      this.prometheusExporter,
      `${fnTag} options.prometheusExporter`,
    );

    this.prometheusExporter.startMetricsCollection();
  }

  public getPrometheusExporter(): PrometheusExporter {
    return this.prometheusExporter;
  }

  public async getPrometheusExporterMetrics(): Promise<string> {
    const res: string = await this.prometheusExporter.getPrometheusMetrics();
    this.log.debug(`getPrometheusExporterMetrics() response: %o`, res);
    return res;
  }

  public getInstanceId(): string {
    return this.instanceId;
  }

  public async onPluginInit(): Promise<unknown> {
    return;
  }

  public getHttpServer(): Optional<Server | SecureServer> {
    return Optional.ofNullable(this.httpServer);
  }

  public async shutdown(): Promise<void> {
    const serverMaybe = this.getHttpServer();
    if (serverMaybe.isPresent()) {
      const server = serverMaybe.get();
      await promisify(server.close.bind(server))();
    }
  }

  async registerWebServices(
    app: Express,
    wsApi: SocketIoServer,
  ): Promise<IWebServiceEndpoint[]> {
    const { web3 } = this;
    const { logLevel } = this.options;
    const webServices = await this.getOrCreateWebServices();
    await Promise.all(webServices.map((ws) => ws.registerExpress(app)));

    wsApi.on("connection", (socket: SocketIoSocket) => {
      this.log.debug(`New Socket connected. ID=${socket.id}`);

      socket.on(WatchBlocksV1.Subscribe, () => {
        new WatchBlocksV1Endpoint({ web3, socket, logLevel }).subscribe();
      });
    });
    return webServices;
  }

  public async getOrCreateWebServices(): Promise<IWebServiceEndpoint[]> {
    if (Array.isArray(this.endpoints)) {
      return this.endpoints;
    }

    const endpoints: IWebServiceEndpoint[] = [];
    {
      const endpoint = new DeployContractSolidityBytecodeEndpoint({
        connector: this,
        logLevel: this.options.logLevel,
      });
      endpoints.push(endpoint);
    }
    {
      const endpoint = new GetBalanceEndpoint({
        connector: this,
        logLevel: this.options.logLevel,
      });
      endpoints.push(endpoint);
    }
    {
      const endpoint = new RunTransactionEndpoint({
        connector: this,
        logLevel: this.options.logLevel,
      });
      endpoints.push(endpoint);
    }
    {
      const endpoint = new InvokeContractEndpoint({
        connector: this,
        logLevel: this.options.logLevel,
      });
      endpoints.push(endpoint);
    }
    {
      const endpoint = new BesuSignTransactionEndpointV1({
        connector: this,
        logLevel: this.options.logLevel,
      });
      endpoints.push(endpoint);
    }
    {
      const opts: IGetPrometheusExporterMetricsEndpointV1Options = {
        connector: this,
        logLevel: this.options.logLevel,
      };
      const endpoint = new GetPrometheusExporterMetricsEndpointV1(opts);
      endpoints.push(endpoint);
    }
    this.endpoints = endpoints;
    return endpoints;
  }

  public getPackageName(): string {
    return `@hyperledger/cactus-plugin-ledger-connector-besu`;
  }

  public async getConsensusAlgorithmFamily(): Promise<
    ConsensusAlgorithmFamily
  > {
    return ConsensusAlgorithmFamily.Authority;
  }
  public async hasTransactionFinality(): Promise<boolean> {
    const currentConsensusAlgorithmFamily = await this.getConsensusAlgorithmFamily();

    return consensusHasTransactionFinality(currentConsensusAlgorithmFamily);
  }
  public async invokeContract(
    req: InvokeContractV1Request,
  ): Promise<InvokeContractV1Response> {
    const fnTag = `${this.className}#invokeContract()`;
    const contractName = req.contractName;
    let contractInstance: Contract;

    if (req.keychainId != undefined) {
      const networkId = await this.web3.eth.net.getId();
      const keychainPlugin = this.pluginRegistry.findOneByKeychainId(
        req.keychainId,
      );
      Checks.truthy(
        keychainPlugin,
        `${fnTag} keychain for ID:"${req.keychainId}"`,
      );
      if (!keychainPlugin.has(contractName)) {
        throw new Error(
          `${fnTag} Cannot create an instance of the contract because the contractName and the contractName of the JSON doesn't match`,
        );
      }
      const contractJSON = (await keychainPlugin.get(contractName)) as any;
      if (
        contractJSON.networks === undefined ||
        contractJSON.networks[networkId] === undefined ||
        contractJSON.networks[networkId].address === undefined
      ) {
        if (isWeb3SigningCredentialNone(req.signingCredential)) {
          throw new Error(`${fnTag} Cannot deploy contract with pre-signed TX`);
        }
        const web3SigningCredential = req.signingCredential as
          | Web3SigningCredentialPrivateKeyHex
          | Web3SigningCredentialCactusKeychainRef;

        const receipt = await this.transact({
          transactionConfig: {
            data: `0x${contractJSON.bytecode}`,
            from: web3SigningCredential.ethAccount,
            gas: req.gas,
            gasPrice: req.gasPrice,
          },
          consistencyStrategy: {
            blockConfirmations: 0,
            receiptType: ReceiptType.NodeTxPoolAck,
            timeoutMs: req.timeoutMs || 60000,
          },
          web3SigningCredential,
        });

        const address = {
          address: receipt.transactionReceipt.contractAddress,
        };
        const network = { [networkId]: address };
        contractJSON.networks = network;
        keychainPlugin.set(contractName, contractJSON);
      }
      const contract = new this.web3.eth.Contract(
        contractJSON.abi,
        contractJSON.networks[networkId].address,
      );
      this.contracts[contractName] = contract;
    } else if (
      req.keychainId == undefined &&
      req.contractAbi == undefined &&
      req.contractAddress == undefined
    ) {
      throw new Error(
        `${fnTag} Cannot invoke a contract without contract instance, the keychainId param is needed`,
      );
    }

    contractInstance = this.contracts[contractName];
    if (req.contractAbi != undefined) {
      let abi;
      if (typeof req.contractAbi === "string") {
        abi = JSON.parse(req.contractAbi);
      } else {
        abi = req.contractAbi;
      }

      const { contractAddress } = req;
      contractInstance = new this.web3.eth.Contract(abi, contractAddress);
    }

    const methodRef = contractInstance.methods[req.methodName];
    Checks.truthy(methodRef, `${fnTag} YourContract.${req.methodName}`);
    const method: ContractSendMethod = methodRef(...req.params);

    if (req.invocationType === EthContractInvocationType.Call) {
      const callOutput = await (method as any).call();
      const success = true;
      return { success, callOutput };
    } else if (req.invocationType === EthContractInvocationType.Send) {
      if (isWeb3SigningCredentialNone(req.signingCredential)) {
        throw new Error(`${fnTag} Cannot deploy contract with pre-signed TX`);
      }
      const web3SigningCredential = req.signingCredential as
        | Web3SigningCredentialPrivateKeyHex
        | Web3SigningCredentialCactusKeychainRef;
      const payload = (method.send as any).request();
      const { params } = payload;
      const [transactionConfig] = params;
      if (req.gas == undefined) {
        req.gas = await this.web3.eth.estimateGas(transactionConfig);
      }
      transactionConfig.from = web3SigningCredential.ethAccount;
      transactionConfig.gas = req.gas;
      transactionConfig.gasPrice = req.gasPrice;
      transactionConfig.value = req.value;
      transactionConfig.nonce = req.nonce;
      const txReq: RunTransactionRequest = {
        transactionConfig,
        web3SigningCredential,
        consistencyStrategy: {
          blockConfirmations: 0,
          receiptType: ReceiptType.NodeTxPoolAck,
          timeoutMs: req.timeoutMs || 60000,
        },
      };
      const out = await this.transact(txReq);
      //const transactionReceipt = out.transactionReceipt;
      const success = out.transactionReceipt.status;
      const data = { success, out };
      return data;
    } else {
      throw new Error(
        `${fnTag} Unsupported invocation type ${req.invocationType}`,
      );
    }
  }

  public async transact(
    req: RunTransactionRequest,
  ): Promise<RunTransactionResponse> {
    const fnTag = `${this.className}#transact()`;

    switch (req.web3SigningCredential.type) {
      // Web3SigningCredentialType.GETHKEYCHAINPASSWORD is removed as Hyperledger Besu doesn't support the PERSONAL api
      // for --rpc-http-api as per the discussion mentioned here
      // https://chat.hyperledger.org/channel/besu-contributors?msg=GqQXfW3k79ygRtx5Q
      case Web3SigningCredentialType.CactusKeychainRef: {
        return this.transactCactusKeychainRef(req);
      }
      case Web3SigningCredentialType.PrivateKeyHex: {
        return this.transactPrivateKey(req);
      }
      case Web3SigningCredentialType.None: {
        if (req.transactionConfig.rawTransaction) {
          return this.transactSigned(req);
        } else {
          throw new Error(
            `${fnTag} Expected pre-signed raw transaction ` +
              ` since signing credential is specified as` +
              `Web3SigningCredentialType.NONE`,
          );
        }
      }
      default: {
        throw new Error(
          `${fnTag} Unrecognized Web3SigningCredentialType: ` +
            `${req.web3SigningCredential.type} Supported ones are: ` +
            `${Object.values(Web3SigningCredentialType).join(";")}`,
        );
      }
    }
  }

  public async transactSigned(
    req: RunTransactionRequest,
  ): Promise<RunTransactionResponse> {
    const fnTag = `${this.className}#transactSigned()`;

    Checks.truthy(req.consistencyStrategy, `${fnTag}:req.consistencyStrategy`);
    Checks.truthy(
      req.transactionConfig.rawTransaction,
      `${fnTag}:req.transactionConfig.rawTransaction`,
    );
    const rawTx = req.transactionConfig.rawTransaction as string;
    this.log.debug("Starting web3.eth.sendSignedTransaction(rawTransaction) ");
    const txPoolReceipt = await this.web3.eth.sendSignedTransaction(rawTx);
    this.log.debug("Received preliminary receipt from Besu node.");

    if (txPoolReceipt instanceof Error) {
      this.log.debug(`${fnTag} sendSignedTransaction failed`, txPoolReceipt);
      throw txPoolReceipt;
    }
    this.prometheusExporter.addCurrentTransaction();

    if (
      req.consistencyStrategy.receiptType === ReceiptType.NodeTxPoolAck &&
      req.consistencyStrategy.blockConfirmations > 0
    ) {
      throw new Error(
        `${fnTag} Conflicting parameters for consistency` +
          ` strategy: Cannot wait for >0 block confirmations AND only wait ` +
          ` for the tx pool ACK at the same time.`,
      );
    }

    switch (req.consistencyStrategy.receiptType) {
      case ReceiptType.NodeTxPoolAck:
        return { transactionReceipt: txPoolReceipt };
      case ReceiptType.LedgerBlockAck:
        this.log.debug("Starting poll for ledger TX receipt ...");
        const txHash = txPoolReceipt.transactionHash;
        const { consistencyStrategy } = req;
        const ledgerReceipt = await this.pollForTxReceipt(
          txHash,
          consistencyStrategy,
        );
        this.log.debug(
          "Finished poll for ledger TX receipt: %o",
          ledgerReceipt,
        );
        return { transactionReceipt: ledgerReceipt };
      default:
        throw new Error(
          `${fnTag} Unrecognized ReceiptType: ${req.consistencyStrategy.receiptType}`,
        );
    }
  }

  public async transactPrivateKey(
    req: RunTransactionRequest,
  ): Promise<RunTransactionResponse> {
    const fnTag = `${this.className}#transactPrivateKey()`;
    const { transactionConfig, web3SigningCredential } = req;
    const {
      secret,
    } = web3SigningCredential as Web3SigningCredentialPrivateKeyHex;

    const signedTx = await this.web3.eth.accounts.signTransaction(
      transactionConfig,
      secret,
    );

    if (signedTx.rawTransaction) {
      req.transactionConfig.rawTransaction = signedTx.rawTransaction;
      return this.transactSigned(req);
    } else {
      throw new Error(
        `${fnTag} Failed to sign eth transaction. ` +
          `signedTransaction.rawTransaction is blank after .signTransaction().`,
      );
    }
  }

  public async transactCactusKeychainRef(
    req: RunTransactionRequest,
  ): Promise<RunTransactionResponse> {
    const fnTag = `${this.className}#transactCactusKeychainRef()`;
    const { transactionConfig, web3SigningCredential } = req;
    const {
      ethAccount,
      keychainEntryKey,
      keychainId,
    } = web3SigningCredential as Web3SigningCredentialCactusKeychainRef;

    // locate the keychain plugin that has access to the keychain backend
    // denoted by the keychainID from the request.
    const keychainPlugin = this.pluginRegistry.findOneByKeychainId(keychainId);

    Checks.truthy(keychainPlugin, `${fnTag} keychain for ID:"${keychainId}"`);

    // Now use the found keychain plugin to actually perform the lookup of
    // the private key that we need to run the transaction.
    const privateKeyHex = await keychainPlugin?.get<string>(keychainEntryKey);

    return this.transactPrivateKey({
      transactionConfig,
      web3SigningCredential: {
        ethAccount,
        type: Web3SigningCredentialType.PrivateKeyHex,
        secret: privateKeyHex,
      },
      consistencyStrategy: {
        blockConfirmations: 0,
        receiptType: ReceiptType.NodeTxPoolAck,
        timeoutMs: 60000,
      },
    });
  }

  public async pollForTxReceipt(
    txHash: string,
    consistencyStrategy: ConsistencyStrategy,
  ): Promise<TransactionReceipt> {
    const fnTag = `${this.className}#pollForTxReceipt()`;
    let txReceipt;
    let timedOut = false;
    let tries = 0;
    let confirmationCount = 0;
    const timeoutMs = consistencyStrategy.timeoutMs || Number.MAX_SAFE_INTEGER;
    const startedAt = new Date();

    do {
      tries++;
      timedOut = Date.now() >= startedAt.getTime() + timeoutMs;
      if (timedOut) {
        break;
      }

      txReceipt = await this.web3.eth.getTransactionReceipt(txHash);
      if (!txReceipt) {
        continue;
      }

      const latestBlockNo = await this.web3.eth.getBlockNumber();
      confirmationCount = latestBlockNo - txReceipt.blockNumber;
    } while (confirmationCount >= consistencyStrategy.blockConfirmations);

    if (!txReceipt) {
      throw new Error(`${fnTag} Timed out ${timeoutMs}ms, polls=${tries}`);
    }
    return txReceipt;
  }

  public async deployContract(
    req: DeployContractSolidityBytecodeV1Request,
  ): Promise<RunTransactionResponse> {
    const fnTag = `${this.className}#deployContract()`;
    Checks.truthy(req, `${fnTag} req`);
    if (isWeb3SigningCredentialNone(req.web3SigningCredential)) {
      throw new Error(`${fnTag} Cannot deploy contract with pre-signed TX`);
    }
    const { contractName } = req;
    if (req.keychainId != undefined && req.contractName != undefined) {
      const keychainPlugin = this.pluginRegistry.findOneByKeychainId(
        req.keychainId,
      );
      Checks.truthy(
        keychainPlugin,
        `${fnTag} keychain for ID:"${req.keychainId}"`,
      );

      const networkId = await this.web3.eth.net.getId();

      const tmpContract = new this.web3.eth.Contract(req.contractAbi);
      const deployment = tmpContract.deploy({
        data: req.bytecode,
        arguments: req.constructorArgs,
      });

      const abi = deployment.encodeABI();
      const data = abi.startsWith("0x") ? abi : `0x${abi}`;
      this.log.debug(`Deploying "${req.contractName}" with data %o`, data);

      const web3SigningCredential = req.web3SigningCredential as
        | Web3SigningCredentialPrivateKeyHex
        | Web3SigningCredentialCactusKeychainRef;
      const runTxResponse = await this.transact({
        transactionConfig: {
          data,
          from: web3SigningCredential.ethAccount,
          gas: req.gas,
          gasPrice: req.gasPrice,
        },
        consistencyStrategy: {
          blockConfirmations: 0,
          receiptType: ReceiptType.NodeTxPoolAck,
          timeoutMs: req.timeoutMs || 60000,
        },
        web3SigningCredential,
      });

      const keychainHasContract = await keychainPlugin.has(contractName);
      if (keychainHasContract) {
        this.log.debug(`Keychain has the contract, updating networks...`);

        const { transactionReceipt: receipt } = runTxResponse;
        const { status, contractAddress } = receipt;

        if (status && contractAddress) {
          const networkInfo = { address: contractAddress };

          type SolcJson = {
            abi: AbiItem[];
            networks: unknown;
          };
          const contractJSON = await keychainPlugin.get<SolcJson>(contractName);

          this.log.debug("Contract JSON: \n%o", JSON.stringify(contractJSON));

          const contract = new this.web3.eth.Contract(
            contractJSON.abi,
            contractAddress,
          );
          this.contracts[contractName] = contract;

          const network = { [networkId]: networkInfo };
          contractJSON.networks = network;

          keychainPlugin.set(contractName, contractJSON);
        }
      } else {
        throw new Error(
          `${fnTag} Cannot create an instance of the contract because the contractName and the contractName on the keychain does not match`,
        );
      }
      return runTxResponse;
    }
    throw new Error(
      `${fnTag} Cannot deploy contract without keychainId and the contractName`,
    );
  }

  public async signTransaction(
    req: SignTransactionRequest,
  ): Promise<Optional<SignTransactionResponse>> {
    const { pluginRegistry, rpcApiHttpHost, logLevel } = this.options;
    const { keychainId, keychainRef, transactionHash } = req;

    const converter = new KeyConverter();

    const web3Provider = new Web3.providers.HttpProvider(rpcApiHttpHost);
    const web3 = new Web3(web3Provider);

    // Make sure the transaction exists on the ledger first...
    const transaction = await web3.eth.getTransaction(transactionHash);
    if (!transaction) {
      return Optional.empty();
    }

    const keychain = pluginRegistry.findOneByKeychainId(keychainId);

    if (!keychain) {
      const msg = `Keychain for ID ${keychainId} not found.`;
      throw new CodedError(msg, E_KEYCHAIN_NOT_FOUND);
    }

    const pem: string = await keychain.get(keychainRef);

    const pkRaw = converter.privateKeyAs(pem, KeyFormat.PEM, KeyFormat.Raw);

    const jsObjectSignerOptions: IJsObjectSignerOptions = {
      privateKey: pkRaw,
      logLevel,
    };

    const jsObjectSigner = new JsObjectSigner(jsObjectSignerOptions);

    if (transaction !== undefined && transaction !== null) {
      const singData = jsObjectSigner.sign(transaction.input);
      const signDataHex = Buffer.from(singData).toString("hex");

      const resBody: SignTransactionResponse = { signature: signDataHex };
      return Optional.ofNullable(resBody);
    }

    return Optional.empty();
  }

  public async getBalance(
    request: GetBalanceV1Request,
  ): Promise<GetBalanceV1Response> {
    const balance = await this.web3.eth.getBalance(
      request.address,
      request.defaultBlock,
    );
    return { balance };
  }

  public async getTransaction(
    request: GetTransactionV1Request,
  ): Promise<GetTransactionV1Response> {
    const transaction = await this.web3.eth.getTransaction(
      request.transactionHash,
    );
    return { transaction };
  }

  public async getPastLogs(
    request: GetPastLogsV1Request,
  ): Promise<GetPastLogsV1Response> {
    const logs = await this.web3.eth.getPastLogs(request);
    return { logs };
  }
}
