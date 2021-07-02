/*
 * Copyright 2019-2020 Fujitsu Laboratories Ltd.
 * SPDX-License-Identifier: Apache-2.0
 * 
 * createCar.js
 */

////////
// Usage
// TODO: 
//
////////

{
'use strict';

const { FileSystemWallet, Gateway } = require('fabric-network');
//import { FileSystemWallet, Gateway } from 'fabric-network';
const fs = require('fs');
const path = require('path');

const ccpPath = path.resolve(__dirname, 'config', 'connection.json');
const ccpJSON = fs.readFileSync(ccpPath, 'utf8');
const ccp = JSON.parse(ccpJSON);

// TODO: 
const walletPath = path.resolve(__dirname, 'wallet');


// ## Request for "createCar"
const key = 'CAR102';
const make = 'Toyota';
const model = 'Harrier';
const colour = 'Black';
const owner = 'Dave';

const userName = 'user1';
const channelName = 'mychannel';

async function createCars() {
    try {

        // Create a new file system based wallet for managing identities.
        const wallet = new FileSystemWallet(walletPath);
        console.log(`Wallet path: ${walletPath}`);

        // Check to see if we've already enrolled the user.
        const userExists = await wallet.exists(userName);
        if (!userExists) {
            console.log(`An identity for the user "${userName}" does not exist in the wallet`);
            console.log('Run the registerUser.js application before retrying');
            return;
        }

        // Create a new gateway for connecting to our peer node.
        const gateway = new Gateway();
        await gateway.connect(ccp, { wallet, identity: userName, discovery: { enabled: false } });

        // Get the network (channel) our contract is deployed to.
        const network = await gateway.getNetwork(channelName);

        // Get the contract from the network.
        const contract = network.getContract('fabcar');

        // Submit the specified transaction.
        console.log(`##createCar Params: ${key}, ${make}, ${colour}, ${owner}`);
        await contract.submitTransaction('createCar', key, make, model, colour, owner);
        console.log('Transaction has been submitted');

        // Disconnect from the gateway.
        await gateway.disconnect();

    } catch (error) {
        console.error(`Failed to submit transaction: ${error}`);
        process.exit(1);
    }
}

createCars();
}
