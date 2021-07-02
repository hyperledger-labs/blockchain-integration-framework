#!/usr/bin/env node

/*
 * Copyright 2021 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 * 
 * www.js
 */

/* Summary:
 * Connector: a part independent of end-chains
 */

/**
 * Module dependencies.
 */

import app from '../app';
const debug = require('debug')('connector:server');
import https = require('https');
import { config } from '../config/default';
import fs = require('fs');

// Log settings
import { getLogger } from "log4js";
const logger = getLogger('connector_main[' + process.pid + ']');
logger.level = config.logLevel;

// implementation class of a part dependent of end-chains (server plugin)
import { ServerPlugin } from '../../dependent/ServerPlugin';
const Splug = new ServerPlugin();

// destination dependency (MONITOR) implementation class
import { ServerMonitorPlugin } from '../../dependent/ServerMonitorPlugin';
const Smonitor = new ServerMonitorPlugin();

/**
 * Get port from environment and store in Express.
 */

const sslport = normalizePort(process.env.PORT || config.sslParam.port);
app.set('port', sslport);

// Specify private key and certificate
const sslParam = {
    key: fs.readFileSync(config.sslParam.key),
    cert: fs.readFileSync(config.sslParam.cert)
};

/**
 * Create HTTPS server.
 */

const server = https.createServer(sslParam, app);   // Start as an https server.
const io = require('socket.io')(server);

/**
 * Listen on provided port, on all network interfaces.
 */

server.listen(sslport, function(){
    console.log('listening on *:' + sslport);
});
server.on('error', onError);
server.on('listening', onListening);

/**
 * Normalize a port into a number, string, or false.
 */

function normalizePort(val) {
  var port = parseInt(val, 10);

  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
}

/**
 * Event listener for HTTPS server "error" event.
 */

function onError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  const bind = typeof sslport === 'string'
    ? 'Pipe ' + sslport
    : 'Port ' + sslport;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(bind + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
}

/**
 * Event listener for HTTPS server "listening" event.
 */

function onListening() {
  const addr = server.address();
  const bind = typeof addr === 'string'
    ? 'pipe ' + addr
    : 'port ' + addr.port;
  debug('Listening on ' + bind);
}

io.on('connection', function(client) {
    logger.info('Client ' + client.id + ' connected.');

    /**
     * request: The server plugin's request to execute a function
     * @param {JSON} data: Request Body (following format)
     * JSON: {
     *          "func":        (string) Function name ,// For example : "transferNumericAsset"
     *          "args":        (Object) argument// for example , {"from" : "xxx" , "to" : "yyy" , "value" : "10,000"}
     *       }
    **/
    client.on('request', function(data) {
        const func = data.func;
        const args = data.args;
        if (data.reqID !== undefined) {
            logger.info(`##add reqID: ${data.reqID}`);
            args["reqID"] = data.reqID;
        }
        logger.info('##[HL-BC] Invoke smart contract to transfer asset(D1)');
        logger.info('*** REQUEST ***');
        logger.info('Client ID :' + client.id);
        logger.info('Data  :' + JSON.stringify(data));

        // Check for the existence of the specified function and call it if it exists.
        if (Splug.isExistFunction(func)) {
            // Can be called with Server plugin function name.
            Splug[func](args)
            .then((respObj) => {
                logger.info('*** RESPONSE ***');
                logger.info('Client ID :' + client.id);
                logger.info('Response  :' + JSON.stringify(respObj));
                client.emit("response", respObj);
            })
            .catch((errObj) => {
                logger.error('*** ERROR ***');
                logger.error('Client ID :' + client.id);
                logger.error('Detail    :' + JSON.stringify(errObj));
                client.emit("connector_error", errObj);
            });
        } else {
            // No such function
            const emsg = "Function " + func + " not found!";
            logger.error(emsg);
            const retObj = {
                "status" : 504,
                "errorDetail" : emsg
            };
            client.emit("connector_error", retObj);
        }
    });

    client.on('request2', function(data) {
        const func = data.method.method;
        const args = {};
        args["contract"] = data.contract;
        args["method"] = data.method;
        args["args"] = data.args;
        if (data.reqID !== undefined) {
            logger.info(`##add reqID: ${data.reqID}`);
            args["reqID"] = data.reqID;
        }
        logger.info('##[HL-BC] Invoke smart contract to transfer asset(D1)');
        logger.info('*** REQUEST ***');
        logger.info('Client ID :' + client.id);
        logger.info('Data  :' + JSON.stringify(data));

        // Check for the presence of a request ID.
        if ((data.method.type === "evaluateTransaction")
         || (data.method.type === "submitTransaction")) {
            // Call a synchronous method.
            Splug.contractTransaction(args)
            .then((respObj) => {
                logger.info('*** RESPONSE ***');
                logger.info('Client ID :' + client.id);
                logger.info('Response  :' + JSON.stringify(respObj));
                client.emit("response", respObj);
            })
            .catch((errObj) => {
                logger.error('*** ERROR ***');
                logger.error('Client ID :' + client.id);
                logger.error('Detail    :' + JSON.stringify(errObj));
                client.emit("connector_error", errObj);
            });
        } else if (data.method.type === "sendSignedTransaction") {
            // Call an asynchronous method.
            Splug.sendSignedProposal(args)
            .then((respObj) => {
                logger.info('*** RESPONSE ***');
                logger.info('Client ID :' + client.id);
                logger.info('Response  :' + JSON.stringify(respObj));
                client.emit("response", respObj);
            })
            .catch((errObj) => {
                logger.error('*** ERROR ***');
                logger.error('Client ID :' + client.id);
                logger.error('Detail    :' + JSON.stringify(errObj));
                client.emit("connector_error", errObj);
            });
        } else {
            // No such function
            const emsg = "Function " + func + " not found!";
            logger.error(emsg);
            const retObj = {
                "status" : 504,
                "errorDetail" : emsg
            };
            client.emit("connector_error", retObj);
        }
    });

    /**
     * startMonitor: starting block generation event monitoring
    **/
    client.on('startMonitor', function() {
        // Callback to receive monitoring results
        const cb = function(callbackData) {
            let emitType = "";
            if(callbackData.status == 200) {
                emitType = "eventReceived";
                logger.info('event data callbacked.');
            } else {
                emitType = "monitor_error";
            }
            client.emit(emitType, callbackData);
        }

        Smonitor.startMonitor(client.id, cb);
    });

    /**
     * stopMonitor: block generation events monitoring stopping
    **/
    // I think it is more common to stop from the disconnect described later, but I will prepare for it.
    client.on('stopMonitor', function(reason) {
        Smonitor.stopMonitor(client.id);
    });

    client.on('disconnect', function(reason) {
        // Unexpected disconnect as well as explicit disconnect request can be received here
        logger.info('Client ' + client.id + ' disconnected.');
        logger.info('Reason    :' + reason);
        // Stop monitoring if disconnected client is for event monitoring
        Smonitor.stopMonitor(client.id);
    });

});

