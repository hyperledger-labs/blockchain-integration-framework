/*
 * Copyright 2019-2020 Fujitsu Laboratories Ltd.
 * SPDX-License-Identifier: Apache-2.0
 * 
 * validatorDriver_queryCar.js
 */

////////
// Usage
// TODO: 
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

// ## Request for "changeCarOwner"
var carID = "CAR11";
var reqID = "req12345";

const contract = {"channelName": "mychannel", "contractName": "fabcar"};
const method = {type: "evaluateTransaction", command: "queryCar"};
const args = {"args": [carID]};

// function param
const requestData = {
    contract: contract,
    method: method,
    args: args,
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
    socket.emit('request2', requestData);
}

setTimeout(requestStartMonitor, 2000); // TODO:
setTimeout(sendRequest, 4000);

}
