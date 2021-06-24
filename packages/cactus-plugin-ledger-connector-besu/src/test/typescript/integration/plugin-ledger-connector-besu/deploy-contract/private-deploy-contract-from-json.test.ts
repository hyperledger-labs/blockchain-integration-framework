import test, { Test } from "tape-promise/tape";
import HelloWorldContractJson from "../../../../solidity/hello-world-contract/HelloWorld.json";
import Web3 from "web3";
import Web3EEAClient, { IPrivateTransactionReceipt } from "web3-eea";
import { BesuMpTestLedger } from "@hyperledger/cactus-test-tooling";
import { LogLevelDesc } from "../../../../../../../cactus-common/node_modules/loglevel";
import { AbiItem } from "web3-utils";

const testCase = "Executes private transactions on Hyperledger Besu";
const logLevel: LogLevelDesc = "TRACE";

// WARNING: the keys here are demo purposes ONLY. Please use a tool like Orchestrate or EthSigner for production, rather than hard coding private keys
const keysStatic = {
  tessera: {
    member1: {
      publicKey: "BULeR8JyUWhiuuCMU/HLA0Q5pzkYT+cHII3ZKBey3Bo=",
    },
    member2: {
      publicKey: "QfeDAys9MPDs2XHExtc84jKGHxZg/aj52DTh0vtA3Xc=",
    },
    member3: {
      publicKey: "1iTZde/ndBHvzhcl7V68x44Vx7pl8nwx9LqnM/AfJUg=",
    },
  },
  besu: {
    member1: {
      url: "http://127.0.0.1:20000",
      wsUrl: "ws://127.0.0.1:20001",
      privateKey:
        "8f2a55949038a9610f50fb23b5883af3b4ecb3c3bb792cbcefbd1542c692be63",
    },
    member2: {
      url: "http://127.0.0.1:20002",
      wsUrl: "ws://127.0.0.1:20003",
      privateKey:
        "c87509a1c067bbde78beb793e6fa76530b6382a4c0241e5e4a9ec0a0f44dc0d3",
    },
    member3: {
      url: "http://127.0.0.1:20004",
      wsUrl: "ws://127.0.0.1:20005",
      privateKey:
        "ae6ae8e5ccbfb04590405997ee2d52d2b330726137b875053c36d94e974d162f",
    },
    ethsignerProxy: {
      url: "http://127.0.0.1:18545",
      accountAddress: "9b790656b9ec0db1936ed84b3bea605873558198",
    },
  },
};

test.skip(testCase, async (t: Test) => {
  // At development time one can specify this environment variable if there is
  // a multi-party network already running, which is doable with something like
  // this on the terminal:
  // docker run   --rm   --privileged   --publish 2222:22   --publish 3000:3000   --publish 8545:8545   --publish 8546:8546   --publish 9001:9001   --publish 9081:9081   --publish 9082:9082   --publish 9083:9083   --publish 9090:9090   --publish 18545:18545   --publish 20000:20000   --publish 20001:20001   --publish 20002:20002   --publish 20003:20003   --publish 20004:20004   --publish 20005:20005   --publish 25000:25000   petermetz/cactus-besu-multi-party-all-in-one:0.1.2
  //
  // The upside of this approach is that a new container is not launched from
  // scratch for every test execution which enables faster iteration.
  const preWarmedLedger = process.env.CACTUS_TEST_PRE_WARMED_LEDGER === "true";

  let keys: any;
  if (preWarmedLedger) {
    keys = keysStatic;
  } else {
    const ledger = new BesuMpTestLedger({ logLevel });
    test.onFinish(() => ledger.stop());
    await ledger.start();
    keys = await ledger.getKeys();
  }

  const rpcApiHttpHostMember1 = keys.besu.member1.url;
  const rpcApiHttpHostMember2 = keys.besu.member2.url;
  const rpcApiHttpHostMember3 = keys.besu.member3.url;

  const web3Member1 = new Web3(rpcApiHttpHostMember1);
  const web3Member2 = new Web3(rpcApiHttpHostMember2);
  const web3Member3 = new Web3(rpcApiHttpHostMember3);

  const chainIdMember1 = await web3Member1.eth.getChainId();
  t.comment(`chainIdMember1=${chainIdMember1}`);
  const chainIdMember2 = await web3Member2.eth.getChainId();
  t.comment(`chainIdMember2=${chainIdMember2}`);
  const chainIdMember3 = await web3Member3.eth.getChainId();
  t.comment(`chainIdMember3=${chainIdMember3}`);

  const web3EeaMember1 = Web3EEAClient(web3Member1, chainIdMember1);
  t.ok(web3EeaMember1, "web3EeaMember1 truthy OK");

  const web3EeaMember2 = Web3EEAClient(web3Member2, chainIdMember2);
  t.ok(web3EeaMember2, "web3EeaMember2 truthy OK");

  const web3EeaMember3 = Web3EEAClient(web3Member3, chainIdMember3);
  t.ok(web3EeaMember3, "web3EeaMember3 truthy OK");

  const privacyMarkerTxHash = await web3EeaMember1.eea.sendRawTransaction({
    data: "0x" + HelloWorldContractJson.bytecode,
    privateFrom: keys.tessera.member1.publicKey,
    privateFor: [
      keys.tessera.member1.publicKey,
      keys.tessera.member2.publicKey,
    ],
    privateKey: keys.besu.member1.privateKey,
    gasLimit: 3000000,
  });

  t.ok(privacyMarkerTxHash, "privacyMarkerTxHash truthy OK");

  const contractDeployReceipt = (await web3EeaMember1.priv.getTransactionReceipt(
    privacyMarkerTxHash,
    keys.tessera.member1.publicKey,
  )) as IPrivateTransactionReceipt;

  t.ok(contractDeployReceipt, "contractDeployReceipt truthy OK");
  const receipt = contractDeployReceipt as IPrivateTransactionReceipt;

  const { contractAddress } = receipt;
  t.comment(`Private contract address: ${contractAddress}`);
  t.ok(contractAddress, "contractAddress truthy OK");

  // Check that the third node does not see the transaction of the contract
  // deployment that was sent to node 1 and 2 only, not 3.
  const txReceiptNever = await web3EeaMember3.priv.getTransactionReceipt(
    privacyMarkerTxHash,
    keys.tessera.member3.publicKey,
  );
  t.notok(txReceiptNever, "txReceiptNever falsy OK");

  // Check that node 1 and 2 can indeed see the transaction for the contract
  // deployment that was sent to them and them only (node 3 was left out)

  // Note that changing this to use web3EeaMember3 breaks it and I'm suspecting
  // that this is what's plaguing the tests that are based on the connector
  // which is instantiated with a single web3+web3 EEA client.
  // What I will try next is to have 3 connectors each with a web3 EEA client
  // that points to one of the 3 nodes and see if that makes it work.
  const txReceiptAlways1 = await web3EeaMember1.priv.getTransactionReceipt(
    privacyMarkerTxHash,
    keys.tessera.member1.publicKey,
  );
  t.ok(txReceiptAlways1, "txReceiptAlways1 truthy OK");

  const txReceiptAlways2 = await web3EeaMember2.priv.getTransactionReceipt(
    privacyMarkerTxHash,
    keys.tessera.member2.publicKey,
  );
  t.ok(txReceiptAlways2, "txReceiptAlways2 truthy OK");

  const contract = new web3Member1.eth.Contract(
    HelloWorldContractJson.abi as never,
  );
  const setNameAbi = contract["_jsonInterface"].find(
    (e) => e.name === "setName",
  ) as AbiItem & { signature: string; inputs: AbiItem[] };
  t.ok(setNameAbi, "setNameAbi truthy OK");
  t.ok(setNameAbi.inputs, "setNameAbi.inputs truthy OK");
  t.ok(setNameAbi.signature, "setNameAbi.signature truthy OK");

  const getNameAbi = contract["_jsonInterface"].find(
    (e) => e.name === "getName",
  ) as AbiItem & { signature: string; inputs: AbiItem[] };
  t.ok(getNameAbi, "getNameAbi truthy OK");
  t.ok(getNameAbi.inputs, "getNameAbi.inputs truthy OK");
  t.ok(getNameAbi.signature, "getNameAbi.signature truthy OK");

  {
    t.comment("Checking if member1 can call setName()");
    const functionArgs = web3Member1.eth.abi
      .encodeParameters(setNameAbi.inputs, ["ProfessorCactus - #1"])
      .slice(2);
    const functionParams = {
      to: contractDeployReceipt.contractAddress,
      data: setNameAbi.signature + functionArgs,
      privateFrom: keys.tessera.member1.publicKey,
      privateFor: [keys.tessera.member2.publicKey],
      privateKey: keys.besu.member1.privateKey,
    };
    const transactionHash = await web3EeaMember1.eea.sendRawTransaction(
      functionParams,
    );
    t.comment(`Transaction hash: ${transactionHash}`);
    t.ok(transactionHash, "transactionHash truthy OK");

    const result = await web3EeaMember1.priv.getTransactionReceipt(
      transactionHash,
      keys.tessera.member1.publicKey,
    );
    t.comment(`Transaction receipt for set() call: ${JSON.stringify(result)}`);
    t.ok(result, "set() result member 1 truthy OK");
  }

  {
    t.comment("Checking if member1 can see new name via getName()");
    const functionArgs = web3Member1.eth.abi
      .encodeParameters(getNameAbi.inputs, [])
      .slice(2);

    const fnParams = {
      to: contractDeployReceipt.contractAddress,
      data: getNameAbi.signature + functionArgs,
      privateFrom: keys.tessera.member1.publicKey,
      privateFor: [keys.tessera.member2.publicKey],
      privateKey: keys.besu.member1.privateKey,
    };

    const privacyGroupId = web3EeaMember1.priv.generatePrivacyGroup(fnParams);
    const callOutput = await web3EeaMember1.priv.call({
      privacyGroupId,
      to: contractDeployReceipt.contractAddress,
      data: contract.methods.getName().encodeABI(),
      from: "LieutenantCactus",
    });
    t.comment(`getName Call output: ${JSON.stringify(callOutput)}`);
    t.ok(callOutput, "callOutput truthy OK");
    const name = web3EeaMember1.eth.abi.decodeParameter("string", callOutput);
    t.equal(name, "ProfessorCactus - #1", "getName() member 1 equals #1");
  }

  {
    // Member 3 cannot see into the privacy group of 1 and 2 so the getName
    // will not return the value that was set earlier in that privacy group.
    t.comment("Checking if member3 can see new name via getName()");
    const fnParams = {
      to: contractDeployReceipt.contractAddress,
      data: contract.methods.getName().encodeABI(),
      privateFrom: keys.tessera.member1.publicKey,
      privateFor: [keys.tessera.member2.publicKey],
      privateKey: keys.besu.member3.privateKey,
    };

    const privacyGroupId = web3EeaMember3.priv.generatePrivacyGroup(fnParams);
    const callOutput = await web3EeaMember3.priv.call({
      privacyGroupId,
      to: contractDeployReceipt.contractAddress,
      data: getNameAbi.signature,
      from: "LieutenantCactus",
    });
    t.comment(`getName member3 output: ${JSON.stringify(callOutput)}`);
    t.equal(callOutput, "0x", "member3 getName callOutput === 0x OK");
  }

  {
    t.comment("Checking if member2 can call setName()");
    const functionArgs = web3Member2.eth.abi
      .encodeParameters(setNameAbi.inputs, ["ProfessorCactus - #2"])
      .slice(2);
    const functionParams = {
      to: contractDeployReceipt.contractAddress,
      data: setNameAbi.signature + functionArgs,
      privateFrom: keys.tessera.member2.publicKey,
      privateFor: [keys.tessera.member2.publicKey],
      privateKey: keys.besu.member2.privateKey,
    };
    const transactionHash = await web3EeaMember2.eea.sendRawTransaction(
      functionParams,
    );
    t.comment(`Transaction hash: ${transactionHash}`);
    t.ok(transactionHash, "transactionHash truthy OK");

    const result = await web3EeaMember2.priv.getTransactionReceipt(
      transactionHash,
      keys.tessera.member1.publicKey,
    );
    t.comment(`Transaction receipt for set() call: ${JSON.stringify(result)}`);
    t.ok(result, "set() result member 2 truthy OK");
  }

  {
    t.comment("Checking if member3 can call setName()");
    const functionArgs = web3Member3.eth.abi
      .encodeParameters(setNameAbi.inputs, ["ProfessorCactus - #3"])
      .slice(2);
    const functionParams = {
      to: contractDeployReceipt.contractAddress,
      data: setNameAbi.signature + functionArgs,
      privateFrom: keys.tessera.member3.publicKey,
      privateKey: keys.besu.member3.privateKey,
      privateFor: [keys.tessera.member2.publicKey],
    };
    const transactionHash = await web3EeaMember3.eea.sendRawTransaction(
      functionParams,
    );
    t.comment(`setName tx hash for member 3: ${transactionHash}`);
    t.ok(transactionHash, "setName tx hash for member 3 truthy OK");

    const result = await web3EeaMember3.priv.getTransactionReceipt(
      transactionHash,
      keys.tessera.member1.publicKey,
    );
    t.comment(`Transaction receipt for set() call: ${JSON.stringify(result)}`);
    t.ok(result, "set() result for member 3 truthy OK");
  }

  t.end();
});
