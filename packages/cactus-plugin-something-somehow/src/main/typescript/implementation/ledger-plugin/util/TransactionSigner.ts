/*
 * Copyright 2021 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * TransactionSigner.ts
 */
import { ConfigUtil } from '../../routing-interface/util/ConfigUtil';

const ethJsCommon = require('ethereumjs-common').default;
const ethJsTx = require('ethereumjs-tx').Transaction;
const libWeb3 = require('web3');

const fs = require('fs');
const path = require('path');
const config: any = ConfigUtil.getConfig();
const configVerifier: any = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../config/verifier-config.json"), 'utf8'));
import { getLogger } from "log4js";
const moduleName = 'TransactionEthereum';
const logger = getLogger(`${moduleName}`);
logger.level = config.logLevel;

// Fabric node-sdk
const classFabricCAService = require('fabric-ca-client');
const classClient = require('fabric-client');

// Cryptographic
const hash = require('fabric-client/lib/hash');
const jsrsa = require('jsrsasign');
const { KEYUTIL } = jsrsa;
const elliptic = require('elliptic');
const EC = elliptic.ec;

let fabricChannel = undefined;



export class TransactionSigner {
    static signTxEthereum(rawTx: object, signPkey: string): object {
        logger.debug(`####in signTxEthereum()`);
        // ethereumjs-tx2.1.2_support
        const customCommon = ethJsCommon.forCustomChain(
            configVerifier.signTxInfo.ethereum.network,
            {
                name: configVerifier.signTxInfo.ethereum.chainName,
                networkId: configVerifier.signTxInfo.ethereum.networkID,
                chainId: configVerifier.signTxInfo.ethereum.chainID,
            },
            configVerifier.signTxInfo.ethereum.hardfork
        );

        const privKey: Buffer = Buffer.from(signPkey, 'hex');
        const tx = new ethJsTx(rawTx, { common: customCommon });
        tx.sign(privKey);

        // Get Transaction ID
        const hash: Buffer = tx.hash(true);
        const txId: string = '0x' + hash.toString('hex')
        logger.debug('##txId=' + txId);

        const serializedTx: Buffer = tx.serialize();
        const serializedTxHex: string = '0x' + serializedTx.toString('hex');
        logger.debug('##serializedTxHex=' + serializedTxHex);

        const signedTx = {
            serializedTx: serializedTxHex,
            txId: txId
        };
        
        return signedTx;
    }


    static async signTxFabric(transactionProposalReq: object, certPem: string, privateKeyPem: string) {
        logger.debug(`######call signTxFabric()`);
        let invokeResponse; // Return value from chain code

        // channel object generation
        if (fabricChannel === undefined) {
            fabricChannel = await TransactionSigner.setupChannel(configVerifier.signTxInfo.fabric.channelName);
        }


        const { proposal, txId } = fabricChannel.generateUnsignedProposal(transactionProposalReq, configVerifier.signTxInfo.fabric.mspID, certPem);
        logger.debug("proposal end");
        logger.debug(`##txId: ${txId.getTransactionID()}`);
        const signedProposal = TransactionSigner.signProposal(proposal.toBuffer(), privateKeyPem);

        const targets = [];
        for (const peerInfo of configVerifier.signTxInfo.fabric.peers) {
            const peer = fabricChannel.getPeer(peerInfo.requests.split("//")[1]);
            targets.push(peer);
        }
        const sendSignedProposalReq = { signedProposal, targets };
        const proposalResponses = await fabricChannel.sendSignedProposal(sendSignedProposalReq);
        logger.debug("successfully send signedProposal")
        let allGood: boolean = true;
        for (const proposalResponse of proposalResponses) {
            let oneGood = false;
            if (proposalResponses && proposalResponse.response && proposalResponse.response.status === 200) {
                if (proposalResponse.response.payload) {
                    invokeResponse = proposalResponse.response.payload;
                }
                oneGood = true;
            } else {
                logger.debug('transaction proposal was bad');
                const resStr = proposalResponse.toString();
                const errMsg = resStr.replace("Error: ", "");
                // return reject(errMsg);
                throw new Error(errMsg);
            }
            allGood = allGood && oneGood;
        }
        // If the return value of invoke is an empty string, store txID
        if (invokeResponse === "") {
            invokeResponse = txId.getTransactionID();
        }
        // Error if all peers do not return status 200
        if (!allGood) {
            throw new Error('Failed to send Proposal or receive valid response. Response null or status is not 200. exiting...');
        }

        /**
         * End the endorse step.
         * Start to commit the tx.
         */
        const commitReq = {
            proposalResponses,
            proposal,
        };
        const commitProposal = fabricChannel.generateUnsignedTransaction(commitReq);
        logger.debug('Successfully build commit transaction proposal');

        // sign this commit proposal at local
        const signedCommitProposal = TransactionSigner.signProposal(commitProposal.toBuffer(), privateKeyPem);
        
        
        const signedTx = {
            signedCommitProposal: signedCommitProposal,
            commitReq: commitReq,
            txId: txId.getTransactionID()
        };
        
        return signedTx;
    }


    // BEGIN Signature process=====================================================================================
    // this ordersForCurve comes from CryptoSuite_ECDSA_AES.js and will be part of the
    // stand alone fabric-sig package in future.
    static ordersForCurve = {
        'secp256r1': {
            'halfOrder': elliptic.curves.p256.n.shrn(1),
            'order': elliptic.curves.p256.n
        },
        'secp384r1': {
            'halfOrder': elliptic.curves.p384.n.shrn(1),
            'order': elliptic.curves.p384.n
        }
    };


    // this function comes from CryptoSuite_ECDSA_AES.js and will be part of the
    // stand alone fabric-sig package in future.
    static _preventMalleability(sig, curveParams) {
        const halfOrder = TransactionSigner.ordersForCurve[curveParams.name].halfOrder;
        if (!halfOrder) {
            throw new Error('Can not find the half order needed to calculate "s" value for immalleable signatures. Unsupported curve name: ' + curveParams.name);
        }

        // in order to guarantee 's' falls in the lower range of the order, as explained in the above link,
        // first see if 's' is larger than half of the order, if so, it needs to be specially treated
        if (sig.s.cmp(halfOrder) === 1) { // module 'bn.js', file lib/bn.js, method cmp()
            // convert from BigInteger used by jsrsasign Key objects and bn.js used by elliptic Signature objects
            const bigNum = TransactionSigner.ordersForCurve[curveParams.name].order;
            sig.s = bigNum.sub(sig.s);
        }

        return sig;
    }


    /**
     * this method is used for test at this moment. In future this
     * would be a stand alone package that running at the browser/cellphone/PAD
     *
     * @param {string} privateKey PEM encoded private key
     * @param {Buffer} proposalBytes proposal bytes
     */
    static sign(privateKey, proposalBytes, algorithm, keySize) {
        const hashAlgorithm = algorithm.toUpperCase();
        const hashFunction = hash[`${hashAlgorithm}_${keySize}`];
        const ecdsaCurve = elliptic.curves[`p${keySize}`];
        const ecdsa = new EC(ecdsaCurve);
        const key = KEYUTIL.getKey(privateKey);

        const signKey = ecdsa.keyFromPrivate(key.prvKeyHex, 'hex');
        const digest = hashFunction(proposalBytes);

        let sig = ecdsa.sign(Buffer.from(digest, 'hex'), signKey);
        sig = TransactionSigner._preventMalleability(sig, key.ecparams);

        return Buffer.from(sig.toDER());
    }

    static signProposal(proposalBytes, paramPrivateKeyPem) {
        logger.debug("signProposal start");

        const signature = TransactionSigner.sign(paramPrivateKeyPem, proposalBytes, 'sha2', 256);
        const signedProposal = { signature, proposal_bytes: proposalBytes };
        return signedProposal;
    }
    // END Signature process=========================================================================================


    // setup TLS for this client
    static async TLSSetup(client, enrollmentID, secret) {
        const tlsOptions = {
            trustedRoots: [],
            verify: false
        };
        logger.debug("tlssetup start");
        const caService = new classFabricCAService(configVerifier.signTxInfo.fabric.ca.URL, tlsOptions, configVerifier.signTxInfo.fabric.ca.name);
        const req = {
            enrollmentID: enrollmentID,
            enrollmentSecret: secret,
            profile: 'tls'
        };
        const enrollment = await caService.enroll(req);
        client.setTlsClientCertAndKey(enrollment.certificate, enrollment.key.toBytes());
    }


    // Creating a channel object
    static async setupChannel(channelName) {
        logger.debug("setupChannel start");
        const client = new classClient();
        await TransactionSigner.TLSSetup(client, configVerifier.signTxInfo.fabric.submitter.name, configVerifier.signTxInfo.fabric.submitter.secret);
        const channel = client.newChannel(channelName);

        // add peer to channel
        // const peerTLSCertPath = path.resolve(__dirname, './crypto-config/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tlscacerts/org1.example.com-cert.pem');
        // const peerPEMCert = fs.readFileSync(peerTLSCertPath, 'utf8');
        for (const peerInfo of configVerifier.signTxInfo.fabric.peers) {
            const peer = client.newPeer(
                peerInfo.requests
                /*{
                    pem: peerPEMCert,
                    'ssl-target-name-override': 'peer0.org1.example.com',
                }
                */
            );
            channel.addPeer(peer);
        }

        // add orderer to channel
        /*
        const ordererTLSCertPath = path.resolve(__dirname, './crypto-config/ordererOrganizations/example.com/orderers/orderer.example.com/tlscacerts/example.com-cert.pem');
        const ordererPEMCert = fs.readFileSync(ordererTLSCertPath, 'utf8');
        */
        const orderer = client.newOrderer(
            configVerifier.signTxInfo.fabric.orderer.URL
            /*{
                pem: ordererPEMCert,
                'ssl-target-name-override': 'orderer.example.com',
            }
            */
        );
        channel.addOrderer(orderer);
        // TODO: channel.initialize() should not require an signning identity
        // await channel.initialize();
        return channel;
    }

}
