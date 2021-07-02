/*
 * Copyright 2021 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * ServerMonitorPlugin.js
 */

/*
 * Summary:
 * Monitoring class of connection destination dependent part of linkage server
 * Used when performing continuous monitoring.
 * Processing that ends with reception of a single event is supported by implementing a unique function in ServerPlugin.
 * Unlike ServerPlugin, it does not basically handle its own functions.
 */


// Basic package dependency declaration
var process = require('process');
// IF declaration for fabric
var sdk = require('./fabricaccess.js');
// config file
import { SplugConfig } from './PluginConfig';
import { config } from '../core/config/default';
// Log settings
import { getLogger } from "log4js";
const logger = getLogger('ServerMonitorPlugin[' + process.pid + ']');
logger.level = config.logLevel;
// utility
import { ValidatorAuthentication } from './ValidatorAuthentication';


/*
 * ServerMonitorPlugin
 * Server monitoring class definition
 */
export class ServerMonitorPlugin {

    _filterTable: object;
    _network;
    _eh;

    constructor() {
    // Define settings specific to the dependent part
        // Initializing filter during monitoring
        this._filterTable = {};
        this._network = SplugConfig; //channelID, mspid, peer settings, etc.
        this._eh = null;
    }

    /*
     * startMonitor
     * Start monitoring
     * @param {string} clientId : Client ID of the monitoring start request source
     * @param {function} cb : Callback function that receives the monitoring result at any time
     */
    startMonitor(clientId, cb) {
        logger.info('*** START MONITOR ***');
        logger.info('Client ID :' + clientId);
        var filter = this._filterTable[clientId];
        var network = this._network;
        var channel = null;

        if (!filter) {
            sdk.GetClientAndChannel()
            .then((retobj) => {
                channel  = retobj.channel; //Set the returned channel
                this._filterTable[clientId] = retobj.client;
                return sdk.GetSubmitter(retobj.client)
            })
            .then((submitter) => {
                var peer = this._filterTable[clientId].newPeer(network.fabric.peers[0].requests);
                this._eh = channel.newChannelEventHub(peer);
                logger.info('Connecting the event hub');
                this._eh.registerBlockEvent((block) => {
                    var txlist = []; 
                    logger.info('*** Block Event ***');
                    console.log('##[HL-BC] Notify new block data(D2)');
                    logger.info('chain id :' + network.fabric.channelName);
                    logger.info("blocknumber : " + block.header.number);
                    var len = block.data.data.length;
                    logger.info('data.data.length :' + len);
                    console.log('##[HL-BC] Validate transactions(D3)');
                    console.log('##[HL-BC] digital sign on valid transaction(D4)');
                    for (var i = 0; i < len; i++) {
                        var payload = block.data.data[i].payload;
                        var channel_header = payload.header.channel_header;
                        if (channel_header.type == 3) { //'ENDORSER_TRANSACTION'
                            var txid = channel_header.tx_id;
                            logger.info('transaction id :' + txid);
                            var transaction = payload.data;
                            var actionPayload = transaction.actions[0].payload;
                            var proposalPayload = actionPayload.chaincode_proposal_payload;
                            var invocationSpec = proposalPayload.input;
                            // Can obtain chaincode name and argument list (function name at the beginning) from invocationSpec
                            var ccid = invocationSpec.chaincode_spec.chaincode_id.name;
                            logger.info('chaincode id :' + ccid);
                            // Only notify transactions from the chaincode used in ServerPlugin
                            if (ccid == network.fabric.chaincodeId) {
                                var args = invocationSpec.chaincode_spec.input.args;
                                logger.info('args.length :' + args.length);
                                for (var j = 0; j < args.length; j++) {
                                    // code must be specified for toString
                                    args[j] = args[j].toString('utf8');
                                    logger.info('args[' + j + '] :' + args[j]);
                                }
                                var func = args[0];
                                args.shift();

                                // Interpretation of response
                                var resp = actionPayload.action.proposal_response_payload.extension.response.payload;
                                logger.info('resp :' + resp);

                                //The transaction data should include the following.
                                txlist.push({
                                    "chaincodeId":ccid,
                                    "txId":txid,
                                    "func":func,
                                    "args":args
                                });
                            }
                        }
                    }
                    logger.info('*** SEND BLOCK DATA ***');
                    logger.debug(`txlist = ${JSON.stringify(txlist)}`);
                    const signedTxlist = ValidatorAuthentication.sign({"blockData":txlist});
                    logger.debug(`signedTxlist = ${signedTxlist}`);
                    var retObj = {
                        "status"    : 200,
                        "blockData" : signedTxlist
                    };
                    cb(retObj);

                });
                this._eh.connect(true); //fullBlock=true
            })
            .catch((err) => {
                logger.error(err);
                var errObj = {
                    "status" : 504,
                    "errorDetail" : err
                };
                cb(errObj);
            });
        } else {
            logger.info('target filter has already start watching.');
        }
    }


    /*
     * stopMonitor
     * Stop monitoring
     * @param {string} clientId : Client ID of the monitoring stop request source
     */
    stopMonitor(clientId) {
        var filter = this._filterTable[clientId];

        if (filter) {
            // Stop filter & remove from table
            if (this._eh == null) {
                logger.error('EventHub does not exist');
                return;
            }
            if (this._eh.isconnected()) {
                logger.info('Disconnecting the event hub');
                this._eh.disconnect();
            }
            delete this._filterTable[clientId];
        }
    }

};

