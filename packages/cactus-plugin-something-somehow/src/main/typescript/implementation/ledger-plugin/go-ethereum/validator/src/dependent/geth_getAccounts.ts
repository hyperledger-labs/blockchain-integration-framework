/*
 * Copyright 2021 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 * 
 * geth_getAccounts.js
 */

// File for direct operation of geth
// Account & balance checking
import { SplugConfig } from './PluginConfig';
const Web3 = require('web3');
const web3 = new Web3();
web3.setProvider(new web3.providers.HttpProvider(SplugConfig.provider));
const accounts = web3.eth.accounts;
for (var i=0; i<accounts.length; i++){
    console.log("accounts[" + i + "]");
    console.log("    address:" + accounts[i]);
    const res = web3.eth.getBalance(accounts[i]);
    console.log("    balance:" + res.toString(10));
}
