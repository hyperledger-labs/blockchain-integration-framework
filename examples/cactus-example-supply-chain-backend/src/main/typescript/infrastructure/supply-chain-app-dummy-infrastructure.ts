import { Account } from "web3-core";
import { v4 as uuidv4 } from "uuid";
import {
  Logger,
  Checks,
  LogLevelDesc,
  LoggerProvider,
} from "@hyperledger/cactus-common";
import { PluginRegistry } from "@hyperledger/cactus-core";
import { PluginLedgerConnectorBesu } from "@hyperledger/cactus-plugin-ledger-connector-besu";
import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";
import {
  PluginLedgerConnectorQuorum,
  Web3SigningCredentialType,
} from "@hyperledger/cactus-plugin-ledger-connector-quorum";
import {
  BesuTestLedger,
  FabricTestLedgerV1,
  QuorumTestLedger,
} from "@hyperledger/cactus-test-tooling";

import BambooHarvestRepositoryJSON from "../../json/generated/BambooHarvestRepository.json";
import BookshelfRepositoryJSON from "../../json/generated/BookshelfRepository.json";
import {
  IEthContractDeployment,
  ISupplyChainContractDeploymentInfo,
  IFabricContractDeployment,
  //  OrgEnv,
} from "@hyperledger/cactus-example-supply-chain-business-logic-plugin";
import {
  PluginLedgerConnectorFabric,
  DefaultEventHandlerStrategy,
} from "@hyperledger/cactus-plugin-ledger-connector-fabric";
import { DiscoveryOptions } from "fabric-network";
import { SHIPMENT_CONTRACT_GO_SOURCE } from "../../go/shipment";
import { IPluginKeychain } from "@hyperledger/cactus-core-api";

export const org1Env = {
  CORE_PEER_LOCALMSPID: "Org1MSP",
  CORE_PEER_ADDRESS: "peer0.org1.example.com:7051",
  CORE_PEER_MSPCONFIGPATH:
    "/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp",
  CORE_PEER_TLS_ROOTCERT_FILE:
    "/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt",
  ORDERER_TLS_ROOTCERT_FILE:
    "/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem",
};

export interface ISupplyChainAppDummyInfrastructureOptions {
  logLevel?: LogLevelDesc;
  keychain?: IPluginKeychain;
}

/**
 * Contains code that is meant to simulate parts of a production grade deployment
 * that would otherwise not be part of the application itself.
 *
 * The reason for this being in existence is so that we can have tutorials that
 * are self-contained instead of starting with a multi-hour setup process where
 * the user is expected to set up ledgers from scratch with all the bells and
 * whistles.
 * The sole purpose of this is to have people ramp up with Cactus as fast as
 * possible.
 */
export class SupplyChainAppDummyInfrastructure {
  public static readonly CLASS_NAME = "SupplyChainAppDummyInfrastructure";

  public readonly besu: BesuTestLedger;
  public readonly quorum: QuorumTestLedger;
  public readonly fabric: FabricTestLedgerV1;
  public readonly keychain: IPluginKeychain;
  private readonly log: Logger;
  private _quorumAccount?: Account;
  private _besuAccount?: Account;

  public get quorumAccount(): Account {
    if (!this._quorumAccount) {
      throw new Error(`Must call deployContracts() first.`);
    } else {
      return this._quorumAccount;
    }
  }

  public get besuAccount(): Account {
    if (!this._besuAccount) {
      throw new Error(`Must call deployContracts() first.`);
    } else {
      return this._besuAccount;
    }
  }

  public get className(): string {
    return SupplyChainAppDummyInfrastructure.CLASS_NAME;
  }

  constructor(
    public readonly options: ISupplyChainAppDummyInfrastructureOptions,
  ) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(options, `${fnTag} arg options`);

    const level = this.options.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });

    this.besu = new BesuTestLedger();
    this.quorum = new QuorumTestLedger();
    this.fabric = new FabricTestLedgerV1({
      publishAllPorts: true,
      imageName: "hyperledger/cactus-fabric-all-in-one",
      imageVersion: "2021-03-02-ssh-hotfix",
      logLevel: level,
    });

    if (this.options.keychain) {
      this.keychain = this.options.keychain;
      this.log.info("Reusing the provided keychain plugin...");
    } else {
      this.log.info("Instantiating new keychain plugin...");
      this.keychain = new PluginKeychainMemory({
        instanceId: uuidv4(),
        keychainId: uuidv4(),
        logLevel: this.options.logLevel || "INFO",
      });
    }
    this.log.info("KeychainID=%o", this.keychain.getKeychainId());
  }

  public async stop(): Promise<void> {
    try {
      this.log.info(`Stopping...`);
      await Promise.all([
        this.besu.stop().then(() => this.besu.destroy()),
        this.quorum.stop().then(() => this.quorum.destroy()),
        this.fabric.stop().then(() => this.fabric.destroy()),
      ]);
      this.log.info(`Stopped OK`);
    } catch (ex) {
      this.log.error(`Stopping crashed: `, ex);
      throw ex;
    }
  }

  public async start(): Promise<void> {
    try {
      this.log.info(`Starting dummy infrastructure...`);
      await Promise.all([
        this.besu.start(),
        this.quorum.start(),
        this.fabric.start(),
      ]);
      this.log.info(`Started dummy infrastructure OK`);
    } catch (ex) {
      this.log.error(`Starting of dummy infrastructure crashed: `, ex);
      throw ex;
    }
  }

  public async deployContracts(): Promise<ISupplyChainContractDeploymentInfo> {
    try {
      this.log.info(`Deploying smart contracts...`);

      let bambooHarvestRepository: IEthContractDeployment;
      let bookshelfRepository: IEthContractDeployment;
      let shipmentRepository: IFabricContractDeployment;

      await this.keychain.set(
        BookshelfRepositoryJSON.contractName,
        BookshelfRepositoryJSON,
      );
      await this.keychain.set(
        BambooHarvestRepositoryJSON.contractName,
        BambooHarvestRepositoryJSON,
      );
      {
        this._quorumAccount = await this.quorum.createEthTestAccount(2000000);
        const rpcApiHttpHost = await this.quorum.getRpcApiHttpHost();

        const pluginRegistry = new PluginRegistry();
        pluginRegistry.add(this.keychain);
        const connector = new PluginLedgerConnectorQuorum({
          instanceId: "PluginLedgerConnectorQuorum_Contract_Deployment",
          rpcApiHttpHost,
          logLevel: this.options.logLevel,
          pluginRegistry,
        });

        const res = await connector.deployContract({
          contractName: BambooHarvestRepositoryJSON.contractName,
          bytecode: BambooHarvestRepositoryJSON.bytecode,
          gas: 1000000,
          web3SigningCredential: {
            ethAccount: this.quorumAccount.address,
            secret: this.quorumAccount.privateKey,
            type: Web3SigningCredentialType.PrivateKeyHex,
          },
          keychainId: this.keychain.getKeychainId(),
        });
        const {
          transactionReceipt: { contractAddress },
        } = res;

        bambooHarvestRepository = {
          abi: BambooHarvestRepositoryJSON.abi,
          address: contractAddress as string,
          bytecode: BambooHarvestRepositoryJSON.bytecode,
          contractName: BambooHarvestRepositoryJSON.contractName,
          keychainId: this.keychain.getKeychainId(),
        };
      }

      {
        this._besuAccount = await this.besu.createEthTestAccount(2000000);
        const rpcApiHttpHost = await this.besu.getRpcApiHttpHost();
        const rpcApiWsHost = await this.besu.getRpcApiWsHost();

        const pluginRegistry = new PluginRegistry();
        pluginRegistry.add(this.keychain);
        const connector = new PluginLedgerConnectorBesu({
          instanceId: "PluginLedgerConnectorBesu_Contract_Deployment",
          rpcApiHttpHost,
          rpcApiWsHost,
          logLevel: this.options.logLevel,
          pluginRegistry,
        });

        const res = await connector.deployContract({
          contractName: BookshelfRepositoryJSON.contractName,
          bytecode: BookshelfRepositoryJSON.bytecode,
          contractAbi: BookshelfRepositoryJSON.abi,
          constructorArgs: [],
          gas: 1000000,
          web3SigningCredential: {
            ethAccount: this.besuAccount.address,
            secret: this.besuAccount.privateKey,
            type: Web3SigningCredentialType.PrivateKeyHex,
          },
          keychainId: this.keychain.getKeychainId(),
        });
        const {
          transactionReceipt: { contractAddress },
        } = res;

        bookshelfRepository = {
          abi: BookshelfRepositoryJSON.abi,
          address: contractAddress as string,
          bytecode: BookshelfRepositoryJSON.bytecode,
          contractName: BookshelfRepositoryJSON.contractName,
          keychainId: this.keychain.getKeychainId(),
        };
      }

      {
        const connectionProfile = await this.fabric.getConnectionProfileOrg1();
        const sshConfig = await this.fabric.getSshConfig();
        const discoveryOptions: DiscoveryOptions = {
          enabled: true,
          asLocalhost: true,
        };

        const pluginRegistry = new PluginRegistry();
        pluginRegistry.add(this.keychain);
        const connector = new PluginLedgerConnectorFabric({
          instanceId: "PluginLedgerConnectorFabric_Contract_Deployment",
          dockerBinary: "/usr/local/bin/docker",
          pluginRegistry,
          peerBinary: "peer",
          sshConfig: sshConfig,
          logLevel: this.options.logLevel || "INFO",
          connectionProfile: connectionProfile,
          cliContainerEnv: org1Env,
          discoveryOptions: discoveryOptions,
          eventHandlerOptions: {
            strategy: DefaultEventHandlerStrategy.NetworkScopeAllfortx,
          },
        });

        const res = await connector.deployContractGoSourceV1({
          tlsRootCertFiles: org1Env.CORE_PEER_TLS_ROOTCERT_FILE as string,
          targetPeerAddresses: [org1Env.CORE_PEER_ADDRESS as string],
          policyDslSource: "OR('Org1MSP.member','Org2MSP.member')",
          channelId: "mychannel",
          chainCodeVersion: "1.0.0",
          constructorArgs: { Args: [] },
          goSource: {
            body: Buffer.from(SHIPMENT_CONTRACT_GO_SOURCE).toString("base64"),
            filename: "shipment.go",
          },
          moduleName: "shipment",
          targetOrganizations: [org1Env],
          pinnedDeps: [
            "github.com/Knetic/govaluate@v3.0.0+incompatible",
            "github.com/Shopify/sarama@v1.27.0",
            "github.com/fsouza/go-dockerclient@v1.6.5",
            "github.com/grpc-ecosystem/go-grpc-middleware@v1.2.1",
            "github.com/hashicorp/go-version@v1.2.1",
            "github.com/hyperledger/fabric@v1.4.8",
            "github.com/hyperledger/fabric-amcl@v0.0.0-20200424173818-327c9e2cf77a",
            "github.com/miekg/pkcs11@v1.0.3",
            "github.com/mitchellh/mapstructure@v1.3.3",
            "github.com/onsi/ginkgo@v1.14.1",
            "github.com/onsi/gomega@v1.10.2",
            "github.com/op/go-logging@v0.0.0-20160315200505-970db520ece7",
            "github.com/pkg/errors@v0.9.1",
            "github.com/spf13/viper@v1.7.1",
            "github.com/stretchr/testify@v1.6.1",
            "github.com/sykesm/zap-logfmt@v0.0.3",
            "go.uber.org/zap@v1.16.0",
            "golang.org/x/crypto@v0.0.0-20200820211705-5c72a883971a",
            "golang.org/x/net@v0.0.0-20210503060351-7fd8e65b6420",
            "google.golang.org/grpc@v1.31.1",
          ],
        });
        this.log.debug(res);

        shipmentRepository = {
          chaincodeId: "shipment",
          channelName: "mychannel",
        };
      }

      const out: ISupplyChainContractDeploymentInfo = {
        bambooHarvestRepository,
        bookshelfRepository,
        shipmentRepository,
      };

      this.log.info(`Deployed smart contracts OK`);

      return out;
    } catch (ex) {
      this.log.error(`Deployment of smart contracts crashed: `, ex);
      throw ex;
    }
  }
}
