/*
 * Copyright 2021 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 * 
 * geth_getBlock.js
 */

// File for direct operation of geth
// checking block information
import { SplugConfig } from './PluginConfig';
const Web3 = require('web3');
const web3 = new Web3();
web3.setProvider(new web3.providers.HttpProvider(SplugConfig.provider));
const res = web3.eth.getBlock(0); // get 0th block information
console.log(res);
