/*
 * Copyright 2021 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 * 
 * validatorDriver_sendRawTransaction.js
 */

////////
// Usage
// 1) Set parameter to parameter variable
//      [parameter variables of sendRawTransaction] fromAddress,fromAddressPkey,toAddress,amount,amount
// 2) execute
//
////////

{

// Validator test program.(socket.io client)
var io = require('socket.io-client');
var config = require('config');

// Specify the server (Validator) of the communication destination
var validatorUrl = config.validatorUrl;
console.log('validatorUrl: ' + validatorUrl);
var options = {
    rejectUnauthorized: false, // temporary avoidance since self-signed certificates are used
    reconnection : false,
    timeout : 20000
};
var socket = io(validatorUrl, options);

// for signing
var Common = require('ethereumjs-common').default;
var Tx = require('ethereumjs-tx').Transaction;
const Web3 = require('web3');
var gethUrl = config.gethUrl;
console.log('gethUrl: ' + gethUrl);
const provider = new Web3.providers.HttpProvider(gethUrl);
const web3 = new Web3(provider);

//ethereumjs-tx2.1.2_support
const customCommon = Common.forCustomChain(
    'mainnet',
    {
        name: config.chainName,
        networkId: config.networkId,
        chainId: config.chainId,
    },
    'petersburg',
)

// for test
// ec1-accounts[0] Address: {ec709e1774f0ce4aba47b52a499f9abaaa159f71}, pkey: 40d7e5931a6e0807d3ebd70518f635dbf575975d3bb564ff34c99be416067c89
// ec1-accounts[1] Address: {36e146d5afab61ab125ee671708eeb380aea05b6}, pkey: 13a45756bc314465c4ae2ff0eb9ab58cf72453c04604d8fa14393eb25ce96d06
// ec1-accounts[2] Address: {06fc56347d91c6ad2dae0c3ba38eb12ab0d72e97}, pkey: cb5d48d371916a4ea1627189d8af4f642a5d72746a06b559780c3f5932658207
// ec1-accounts[3] Address: {9d624f7995e8bd70251f8265f2f9f2b49f169c55}, pkey: 3d966c433eb650f40287debacd92afb9c390024e359f9f719b2ca6c0ab07339a
// ec1-accounts[4] Address: {2666a32bf7594ab5395d766dcfbf03d557dab538}, pkey: 918b9b842a633c04e7e97b917d091736334dab6dd71fdc1dcbf0c763014caaf4

// ## Request Params
var fromAddress = "36e146d5afab61ab125ee671708eeb380aea05b6";
var fromAddressPkey = "13a45756bc314465c4ae2ff0eb9ab58cf72453c04604d8fa14393eb25ce96d06";
var toAddress = "06fc56347d91c6ad2dae0c3ba38eb12ab0d72e97";
var amount = 100;

var gas = 21000;

const json2str = (jsonObj) => {
    try {
        return JSON.stringify(jsonObj);
    }
    catch (error) {
        return null;
    }
}

const makeTxTransferNumericAsset = () => {
    //web3_v1.2.9_support
    web3.eth.getTransactionCount('0x' + fromAddress).then(_nance => {
        var txnCount = _nance;
        //  NOTE: No need to count up.

        var gasPrice = web3.eth.gasPrice;

        var privKey = Buffer.from(fromAddressPkey, 'hex');
        console.log('##privKey=' + fromAddressPkey);
        var rawTx = {
            "nonce": web3.utils.toHex(txnCount),
            "to": '0x' + toAddress,
            "value": amount,
            "gas": gas,

        }
        console.log('txnCount=' + web3.utils.toHex(txnCount));
        console.log('##rawTx=' + json2str(rawTx));
        var tx = new Tx(rawTx, { common: customCommon },);
        tx.sign(privKey);
        var serializedTx = tx.serialize();
        var serializedTxHex = '0x' + serializedTx.toString('hex');
        console.log('##serializedTxHex=' + serializedTxHex);

        var func = "sendRawTransaction";

        var args = {
            serializedTx: serializedTxHex
        };
        // function param
        const requestData = {
            contract: {}, // NOTE: Since contract does not need to be specified, specify an empty object.
            method: {type: "web3Eth", command: "sendRawTransaction"},
            args: {"args": [serializedTxHex]}
        };

        console.log('exec sendRequest()');
        console.log('#[send]requestData: ' + json2str(requestData));
        socket.emit('request2', requestData);
    })
}


socket.on('connect_error', (err) => {
  console.log('####connect_error:', err);
  // end communication
  socket.disconnect();
  process.exit(0);
});

socket.on('connect_timeout', (err) => {
  console.log('####Error:', err);
  // end communication
  socket.disconnect();
  process.exit(0);
});

socket.on('error', (err) => {
  console.log('####Error:', err);
});

socket.on('eventReceived', function (res) {
    // output the data received from the client
    console.log('#[recv]eventReceived, res: ' + json2str(res));
});


const requestStopMonitor = () => {
    console.log('##exec requestStopMonitor()');
    socket.emit('stopMonitor');
    
    setTimeout(function(){
      // end communication
      socket.disconnect();
      process.exit(0);
    },5000);
}

// request StartMonitor
const requestStartMonitor = () => {
    console.log('##exec requestStartMonitor()');
    socket.emit('startMonitor');
    
    setTimeout(requestStopMonitor,15000);
}


setTimeout(requestStartMonitor, 2000);
setTimeout(makeTxTransferNumericAsset, 4000);

}
