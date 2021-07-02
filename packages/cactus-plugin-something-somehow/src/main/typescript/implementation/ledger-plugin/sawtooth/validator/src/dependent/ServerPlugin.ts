/*
 * Copyright 2021 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 * 
 * ServerPlugin.js
 */

/*
 * Summary:
 * Connector: a part dependent on endchains
 * Define and implement the function according to the connection destination dependent part (ADAPTER) on the core side.
 */

// configuration file
var SplugConfig = require('./PluginConfig.js');
import { config } from '../core/config/default';
// Log settings
import { getLogger } from "log4js";
const logger = getLogger('ServerPlugin[' + process.pid + ']');
logger.level = config.logLevel;
// utility
var SplugUtil = require('./PluginUtil.js');
import { ValidatorAuthentication } from './ValidatorAuthentication';
// Load libraries, SDKs, etc. according to specifications of endchains as needed
var Web3 = require('web3');


/*
 * ServerPlugin
 * Class definition for server plugins
 */
export class ServerPlugin {
    /*
     * constructors
     */
    constructor(){
        // Define dependent specific settings
    }

    /*
     * isExistFunction
     *
     * @param {String} funcName: The function name to check.
     *
     * @return {Boolean} true: Yes./false: does not exist.
     *
     * @desc Return if end-chain specific funtion is implemented
     *       Scope of this function is in this class
     *       Functions that should not be called directly should be implemented outside this class like utilities.
     */
    isExistFunction(funcName) {
        if(this[funcName]!=undefined) {
            return true;
        } else {
            return false;
        }
    }

    // Define an arbitrary function and implement it according to specifications of end-chains
    /*
     * getNumericBalance
     * Get numerical balance
     *
     * @param {Object} args JSON Object
     * {
     *      "referedAddress":<reference account>,
     *      "reqID":<request ID> (option)
     * }
     * @return {Object} JSON object
     */
    getNumericBalance(args) {
        // * The Web3 API can be used synchronously, but each function is always an asynchronous specification because of the use of other APIs such as REST,
        return new Promise((resolve, reject) => {
            logger.info("getNumericBalance start");
            var retObj = {};

            var referedAddress = args.args.args[0];
            var reqID = args['reqID'];


            if(referedAddress === undefined) {
                let emsg = "JSON parse error!";
                logger.info(emsg);
                retObj = {
                    "resObj" : {
                        "status" : 504,
                        "errorDetail" : emsg
                    }
                };
                return reject(retObj);
            }
            var ethargs = referedAddress;
            // Handling exceptions to absorb the difference of interest.
            try {
                var web3 = new Web3();
                web3.setProvider(new web3.providers.HttpProvider(SplugConfig.provider));
                var balance = web3.eth.getBalance(ethargs);
                var amountVal = balance.toNumber();
                retObj = {
                    "resObj" : {
                        "status" : 200,
                        "amount" : amountVal
                    }
                };
                logger.debug("##getNumericBalance: add reqID");
                if (reqID !== undefined) {
                    retObj["id"] = reqID;
                }
                logger.debug(`##getNumericBalance: retObj: ${JSON.stringify(retObj)}`);
                return resolve(retObj);
            } catch (e) {
                let emsg = e.toString().replace(/Error: /g , "");
                logger.error(emsg);
                retObj = {
                    "resObj" : {
                        "status" : 504,
                        "errorDetail" : emsg
                    }
                };
                logger.debug("##getNumericBalance: add reqID");
                if (reqID !== undefined) {
                    retObj["id"] = reqID;
                }
                logger.debug(`##getNumericBalance: retObj: ${JSON.stringify(retObj)}`);
                return reject(retObj);
            }
        });
    }

    /*
     * transferNumericAsset
     * Transfer numerical asset
     *
     * @param {Object} args JSON Object
     * {
     *      "fromAddress":<sender account>,
     *      "toAddress":<receiver account>,
     *      "amount":<transfering amount>,
     *      "reqID":<request ID> (option)
     * }
     * @return {Object} JSON object
     */
    transferNumericAsset(args) {
        return new Promise((resolve, reject) => {
            logger.info("transferNumericAsset start");

            var retObj = {};
            var sendArgs = {};
            var sendFunction = 'sendTransaction';
            // const funcParam = args;
            const funcParam = args.args.args[0];
            var reqID = args['reqID'];

            if((funcParam["fromAddress"]==undefined)||(funcParam["toAddress"]==undefined)||
               (funcParam["amount"]==undefined)) {
                let emsg = "JSON parse error!";
                logger.error(emsg);
                retObj = {
                    "resObj" : {
                        "status" : 504,
                        "errorDetail" : emsg
                    }
                };
                return reject(retObj);
            }
            // Dealing with exponentiation strings.
            var amount = SplugUtil.convNum(funcParam["amount"], 0);

            // Create an argument object for sendTransaction.
            sendArgs = {
                "from" : funcParam["fromAddress"],
                "to" : funcParam["toAddress"],
                "value" : amount
            };


            logger.info('send_func  :' + sendFunction);
            logger.info('sendArgs  :' + JSON.stringify(sendArgs));

            // Handle the exception once to absorb the difference of interest.
            try {
                var web3 = new Web3();
                web3.setProvider(new web3.providers.HttpProvider(SplugConfig.provider));
                var res = web3.eth[sendFunction](sendArgs);

                retObj = {
                    "resObj" : {
                        "status" : 200,
                        "txid" : res
                    }
                };
                logger.debug("##transferNumericAsset: add reqID");
                if (reqID !== undefined) {
                    retObj["reqID"] = reqID;
                }
                logger.debug(`##transferNumericAsset: retObj: ${JSON.stringify(retObj)}`);
                return resolve(retObj);
            } catch (e) {
                let emsg = e.toString().replace(/Error: /g , "");
                logger.error(emsg);
                retObj = {
                    "resObj" : {
                        "status" : 504,
                        "errorDetail" : emsg
                    }
                };
                logger.debug("##transferNumericAsset: add reqID");
                if (reqID !== undefined) {
                    retObj["reqID"] = reqID;
                }
                logger.debug(`##transferNumericAsset: retObj: ${JSON.stringify(retObj)}`);
                return reject(retObj);
            }
        });
    }

    /*
     * sendRawTransaction
     * send row trancastion
     *
     * @param {Object} args JSON Object
     * {
     *      "serializedTx":<Serialized and signed transaction>
     * }
     * @return {Object} JSON object
     */
    sendRawTransaction(args) {
        return new Promise((resolve, reject) => {
            logger.info("sendRawTransaction(start");

            var retObj = {};
            var sendArgs = {};
            var sendFunction = 'sendTransaction';
            const funcParam = args.args.args[0];

            if(funcParam["serializedTx"]==undefined) {
                let emsg = "JSON parse error!";
                logger.error(emsg);
                retObj = {
                    "status" : 504,
                    "errorDetail" : emsg
                };
                return reject(retObj);
            }
            
            var serializedTx = funcParam["serializedTx"];
            logger.info('serializedTx  :' + serializedTx);
            
            // Handle the exception once to absorb the difference of interest.
            try {
                var web3 = new Web3();
                web3.setProvider(new web3.providers.HttpProvider(SplugConfig.provider));
                var res = web3.eth.sendRawTransaction(serializedTx);

                retObj = {
                    "status" : 200,
                    "txid" : res
                };
                return resolve(retObj);
            } catch (e) {
                let emsg = e.toString().replace(/Error: /g , "");
                logger.error(emsg);
                retObj = {
                    "status" : 504,
                    "errorDetail" : emsg
                };
                return reject(retObj);
            }
        });
    }


    /*
     * web3Eth
     *
     * @param {Object} args JSON Object
     * {
     *      "method":<method information>,
     *      "args":<argument information>,
     *      "reqID":<request ID> (option)
     * }
     * @return {Object} JSON object
     */
    web3Eth(args) {
        return new Promise((resolve, reject) => {
            logger.info("web3Eth start");

            let retObj = {};
            const sendFunction = args.method.command;
            const sendArgs = args.args.args[0];
            const reqID = args['reqID'];

            logger.info('send_func  :' + sendFunction);
            logger.info('sendArgs  :' + JSON.stringify(sendArgs));

            // Handle the exception once to absorb the difference of interest.
            try {
                const web3 = new Web3();
                web3.setProvider(new web3.providers.HttpProvider(SplugConfig.provider));
                let result: any = null;
                if (sendArgs !== undefined) {
                    result = web3.eth[sendFunction](sendArgs);
                } else {
                    result = web3.eth[sendFunction]();
                }
                const signedResults = ValidatorAuthentication.sign({"result":result});
                retObj = {
                    "resObj" : {
                        "status" : 200,
                        "data" : signedResults
                    }
                };
                logger.debug("##web3Eth: add reqID");
                if (reqID !== undefined) {
                    retObj["id"] = reqID;
                }
                logger.debug(`##web3Eth: retObj: ${JSON.stringify(retObj)}`);
                return resolve(retObj);
            } catch (e) {
                let emsg = e.toString().replace(/Error: /g , "");
                logger.error(emsg);
                retObj = {
                    "resObj" : {
                        "status" : 504,
                        "errorDetail" : emsg
                    }
                };
                logger.debug("##web3Eth: add reqID");
                if (reqID !== undefined) {
                    retObj["id"] = reqID;
                }
                logger.debug(`##web3Eth: retObj: ${JSON.stringify(retObj)}`);
                return reject(retObj);
            }
        });
    }


    /*
     * contract
     *
     * @param {Object} args JSON Object
     * {
     *      "contract":<contract information>,
     *      "method":<method information>,
     *      "args":<argument information>,
     *      "reqID":<request ID> (option)
     * }
     * @return {Object} JSON object
     */
    contract(args) {
        return new Promise((resolve, reject) => {
            logger.info("contract start");

            let retObj = {};
            const sendCommand = args.method.command;
            const sendFunction = args.method.function;
            const sendArgs = args.args.args;
            const reqID = args['reqID'];

            logger.info('sendCommand  :' + sendCommand);
            logger.info('sendFunction  :' + sendFunction);
            logger.info('sendArgs  :' + JSON.stringify(sendArgs));

            // Handle the exception once to absorb the difference of interest.
            try {
                const web3 = new Web3();
                web3.setProvider(new web3.providers.HttpProvider(SplugConfig.provider));
                const contract = web3.eth.contract(args.contract.abi).at(args.contract.address);

                let result: any = null;
                switch (sendArgs.length) {
                  case 0:
                    logger.debug(`##contract: No args.`);
                    result = contract[sendCommand][sendFunction]();
                    break;
                  case 1:
                    logger.debug(`##contract: One arg.`);
                    result = contract[sendCommand][sendFunction](sendArgs[0]);
                    break;
                  case 2:
                    logger.debug(`##contract: Two args.`);
                    result = contract[sendCommand][sendFunction](sendArgs[0], sendArgs[1]);
                    break;
                  case 3:
                    logger.debug(`##contract: Three args.`);
                    result = contract[sendCommand][sendFunction](sendArgs[0], sendArgs[1], sendArgs[2]);
                    break;
                }
                logger.debug(`##contract: result: ${result}`);

                const signedResults = ValidatorAuthentication.sign({"result":result});
                retObj = {
                    "resObj" : {
                        "status" : 200,
                        "data" : signedResults
                    }
                };
                logger.debug("##contract: add reqID");
                if (reqID !== undefined) {
                    retObj["id"] = reqID;
                }
                logger.debug(`##contract: retObj: ${JSON.stringify(retObj)}`);
                return resolve(retObj);
            } catch (e) {
                let emsg = e.toString().replace(/Error: /g , "");
                logger.error(emsg);
                retObj = {
                    "resObj" : {
                        "status" : 504,
                        "errorDetail" : emsg
                    }
                };
                logger.debug("##contract: add reqID");
                if (reqID !== undefined) {
                    retObj["id"] = reqID;
                }
                logger.debug(`##contract: retObj: ${JSON.stringify(retObj)}`);
                return reject(retObj);
            }
        });
    }


}   /* class */

