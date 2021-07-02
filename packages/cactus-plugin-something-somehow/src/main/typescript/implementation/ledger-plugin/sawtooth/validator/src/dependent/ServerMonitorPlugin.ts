/*
 * Copyright 2021 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 * 
 * ServerMonitorPlugin.js
 */

/*
 * Summary:
 * Connector: monitoring class of a part dependent on end-chains
 * Used in the case of monitoring continuously.
 * Processing that ends with the acceptance of a single event is handled by a custom function implementation in server plugins.
 * Unlike server plugins, it basically does not handle its own functions.
 */

// configuration file
import { SplugConfig } from './PluginConfig';
const SplugUtil = require('./PluginUtil');
import { config } from '../core/config/default';
// Log settings
import { getLogger } from "log4js";
const logger = getLogger('ServerMonitorPlugin[' + process.pid + ']');
logger.level = config.logLevel;
// utility
import { ValidatorAuthentication } from './ValidatorAuthentication';
const XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;

/*
 * ServerMonitorPlugin
 * Class definitions of server monitoring 
 */
export class ServerMonitorPlugin {

      currentBlockNumber: Number;

    /*
     * constructors
     */
    constructor(){
        // Define dependent specific settings
        this.currentBlockNumber = -1;
    }

    /*
     * startMonitor
     * Start Monitoring
     * @param {string} clientId: Client ID from which monitoring start request was made
     * @param {string} filterKey: Key to filter blocks
     * @param {function} cb: A callback function that receives monitoring results at any time.
     */
    startMonitor(clientId, filterKey, cb) {
        logger.info('*** START MONITOR ***');
        logger.info('Client ID :' + clientId);
        logger.debug(`filterKey = ${filterKey}`);

        const that = this;
        const httpReq = new XMLHttpRequest();
        httpReq.onload = function() {
            const responseObj = JSON.parse(httpReq.responseText);
            that.currentBlockNumber = parseInt(responseObj.data[0].header.block_num);
            logger.debug(`responseObj = ${JSON.stringify(responseObj)}`);
            logger.debug(`currentBlockNumber = ${that.currentBlockNumber}`);
            that.periodicMonitoring(clientId, filterKey, cb);
        };
        httpReq.open(config.blockMonitor.request.method, config.blockMonitor.request.host + config.blockMonitor.request.getLatestBlockNumberCommand);
        httpReq.send();
    }

    /*
     * periodicMonitoring
     * Periodic monitoring
     * @param {string} clientId: Client ID from which monitoring start request was made
     * @param {string} filterKey: Key to filter blocks
     * @param {function} cb: A callback function that receives monitoring results at any time.
     */
    periodicMonitoring(clientId, filterKey, cb) {
        logger.info('*** START PERIODIC MONITORING ***');

        const that = this;

        let httpReq = new XMLHttpRequest();
        httpReq.onload = function() {
            const responseObj = JSON.parse(httpReq.responseText);
            logger.debug(`responseObj = ${JSON.stringify(responseObj)}`);
            
            let newBlockNumber = -1;
            for (let blockData of responseObj.data) {
                const targetBlockNumber = parseInt(blockData.header.block_num);
                if (targetBlockNumber === that.currentBlockNumber) {
                    continue;
                }
                const transactionDataArray = [];
                for (let batchData of blockData.batches) {
                    logger.debug(`transaction_ids.length = ${batchData.header.transaction_ids.length}`);
                    if (batchData.header.transaction_ids.length < 1) {
                        logger.debug(`skip block (No transactions) = ${targetBlockNumber}`);
                        continue;
                    }
                    for (let transactionData of batchData.transactions) {
                        if (transactionData.header.family_name !== filterKey) {
                            logger.debug(`skip transaction (Not target) = ${transactionData.header_signature}`);
                            continue;
                        }
                        const transactionDataPlus = Object.assign({}, transactionData);
                        transactionDataPlus["payload_decoded"] =  SplugUtil.deccodeCbor(SplugUtil.decodeBase64(transactionData.payload));
                        transactionDataArray.push(transactionDataPlus);
                    }
                }
                if (newBlockNumber < targetBlockNumber) {
                    newBlockNumber = targetBlockNumber;
                }
                if (transactionDataArray.length > 0) {
                    logger.info('*** SEND TRANSACTION DATA ***');
                    logger.debug(`transactionDataArray = ${JSON.stringify(transactionDataArray)}`);
                    const signedTransactionDataArray = ValidatorAuthentication.sign({"blockData":transactionDataArray});
                    logger.debug(`signedTransactionDataArray = ${signedTransactionDataArray}`);
                    const retObj = {
                        "status"    : 200,
                        "blockData" : signedTransactionDataArray
                    };
                    cb(retObj);
                }
            }

            if (that.currentBlockNumber < newBlockNumber) {
                that.currentBlockNumber = newBlockNumber;
            }
            logger.debug(`currentBlockNumber = ${that.currentBlockNumber}`);
        };
        let timerBlockMonitoring = setInterval(function() {
            const callURL = config.blockMonitor.request.host + config.blockMonitor.request.periodicMonitoringCommand1 + SplugUtil.convertBlockNumber(that.currentBlockNumber) + config.blockMonitor.request.periodicMonitoringCommand2;
            logger.debug(`call URL = ${callURL}`);
            httpReq.open(config.blockMonitor.request.method, callURL);
            httpReq.send();
//clearInterval(timerBlockMonitoring);
        }, config.blockMonitor.pollingInterval);

    }


    /*
     * stopMonitor
     * monitoring stop
     * @param {string} clientId: Client ID from which monitoring stop request was made
     */
/*
    stopMonitor(clientId) {
        // Implement a process to end EC monitoring
        var filter = this._filterTable[clientId];
        if (filter) {
            // Stop the filter & Remove it from table
            logger.info('stop watching and remove filter.');
            filter.stopWatching();
            delete this._filterTable[clientId];
        }
    }
*/

}

