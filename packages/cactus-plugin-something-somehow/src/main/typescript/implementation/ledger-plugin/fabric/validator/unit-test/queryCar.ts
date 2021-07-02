/*
 * Copyright 2019-2020 Fujitsu Laboratories Ltd.
 * SPDX-License-Identifier: Apache-2.0
 * 
 * queryCar.js
 */

////////
// Usage
// TODO: 
//
////////

{
'use strict';

const { FileSystemWallet, Gateway } = require('fabric-network');
const fs = require('fs');
const path = require('path');

const ccpPath = path.resolve(__dirname, 'config', 'connection.json');
const ccpJSON = fs.readFileSync(ccpPath, 'utf8');
const ccp = JSON.parse(ccpJSON);

// TODO: 
const walletPath = path.resolve(__dirname, 'wallet');


const userName = 'user1';
const channelName = 'mychannel';

async function queryCars() {
    try {

        // Create a new file system based wallet for managing identities.
        const wallet = new FileSystemWallet(walletPath);
        console.log(`Wallet path: ${walletPath}`);

        // Check to see if we've already enrolled the user.
        const userExists = await wallet.exists(userName);
        if (!userExists) {
            console.log('An identity for the user "' + userName + '" does not exist in the wallet');
            console.log('Run the registerUser.js application before retrying');
            return;
        }

        // Create a new gateway for connecting to our peer node.
        const gateway = new Gateway();
        await gateway.connect(ccp, { wallet, identity: userName, discovery: { enabled: false } });

        // Get the network (channel) our contract is deployed to.
        const network = await gateway.getNetwork('mychannel');

        // Get the contract from the network.
        const contract = network.getContract('fabcar');

        // Evaluate the specified transaction.
        if (process.argv.length > 2) {
            const key = process.argv[2];
            //console.log('##queryCar Params: ' + key);
            console.log(`##queryCar Params: ${key}`);
            const result = await contract.evaluateTransaction('queryCar', key);
            console.log(`Transaction has been evaluated, result is: ${result.toString()}`);
        }
        else {
            console.log('##queryAllCars: ');
            const result = await contract.evaluateTransaction('queryAllCars');
            console.log(`Transaction has been evaluated, result is: ${result.toString()}`);
        }

    } catch (error) {
        console.error(`Failed to evaluate transaction: ${error}`);
        process.exit(1);
    }
}

queryCars();
}
