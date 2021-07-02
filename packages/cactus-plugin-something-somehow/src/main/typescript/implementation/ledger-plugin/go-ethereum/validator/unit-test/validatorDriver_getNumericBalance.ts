/*
 * Copyright 2021 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 * 
 * validatorDriver_getNumericBalance.js
 */

////////
// Usage
// 1) Set parameter to parameter variable
//      [parameter variables of getNumericBalance] referredAddress
// 2) Specify the function to execute with "requestData"
// 3) execute
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

// for test
// ec1-accounts[0] Address: {ec709e1774f0ce4aba47b52a499f9abaaa159f71}
// ec1-accounts[1] Address: {36e146d5afab61ab125ee671708eeb380aea05b6}
// ec1-accounts[2] Address: {06fc56347d91c6ad2dae0c3ba38eb12ab0d72e97}
// ec1-accounts[3] Address: {9d624f7995e8bd70251f8265f2f9f2b49f169c55}
// ec1-accounts[4] Address: {2666a32bf7594ab5395d766dcfbf03d557dab538}

// ## Request for "getNumericBalance"
var referedAddress = "36e146d5afab61ab125ee671708eeb380aea05b6";
var reqID = "reqID_001";

// function param
const requestData = {
    contract: {}, // NOTE: Since contract does not need to be specified, specify an empty object.
    method: {type: "web3Eth", command: "getBalance"},
    args: {"args": [referedAddress]},
    // args: {"args": {"args": [referedAddress]}},
    reqID: reqID
};

const requestData_A = {
    contract: {}, // NOTE: Since contract does not need to be specified, specify an empty object.
    func: "getNumericBalance",
    args: {"args": {"args": [referedAddress]}},
    reqID: reqID
};



const json2str = (jsonObj) => {
    try {
        return JSON.stringify(jsonObj);
    }
    catch (error) {
        return null;
    }
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


const sendRequest = () => {
    // 
    console.log('exec sendRequest()');
    console.log('#[send]requestData: ' + json2str(requestData));
    socket.emit('request', requestData_A);
    // socket.emit('request2', requestData);
}

setTimeout(requestStartMonitor, 2000);
setTimeout(sendRequest, 4000);

}
