/*
 * Copyright 2020-2021 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * TransactionManagement.ts
 */

import { Request } from 'express';
import { BusinessLogicPlugin } from '../business-logic-plugin/BusinessLogicPlugin';
import { BLPRegistry } from './util/BLPRegistry';
import { LPInfoHolder } from './util/LPInfoHolder';
import { json2str } from '../ledger-plugin/DriverCommon'
import { VerifierBase } from '../ledger-plugin/VerifierBase';
import { VerifierEventListener, LedgerEvent } from '../ledger-plugin/LedgerPlugin';
import { getTargetBLPInstance } from '../config/BLP_config';
import { ConfigUtil } from './util/ConfigUtil';

const fs = require('fs');
const path = require('path');
const config: any = ConfigUtil.getConfig();
import { getLogger } from "log4js";
const moduleName = 'TransactionManagement';
const logger = getLogger(`${moduleName}`);
logger.level = config.logLevel;

export class TransactionManagement {
    private blpRegistry: BLPRegistry = null;                    // Verifier information used in business logic
//    private connectInfo: LPInfoHolder = null;                   // connection information
//    private verifierArray: [] = [];                             // Verifier
    // private txIDMapInfo: Map<string, string> = null;
    private tradeIDMapInfo: Map<string, string> = null;

    constructor() {
        this.blpRegistry = new BLPRegistry();
//        this.connectInfo = new LPInfoHolder();
        // this.blpMap = new Map();
        // this.txIDMapInfo = new Map();
        this.tradeIDMapInfo = new Map();
    }


    // Start business logic
    startBusinessLogic(req: Request): string {

        // businessLogicID
        const businessLogicID = req.body.businessLogicID;
        logger.info(`businessLogicID: ${businessLogicID}`);
        // tradeID Numbering/Setup
        const tradeID = this.createTradeID();
        logger.info(`tradeID: ${tradeID}`);

        // object judgment
        if ((businessLogicID === "guks32pf") || (businessLogicID === "h40Q9eMD") || (businessLogicID === "j71S9gLN")) {

            const blp = getTargetBLPInstance(businessLogicID);
            if (blp === null) {
                logger.warn(`##startBusinessLogic(): not found BusinessLogicPlugin. businessLogicID: ${businessLogicID}`);
                return;
            }

            logger.debug("created instance");

            // Start BusinessLogicCartrade
            this.setTradeIDMapInfo(tradeID, businessLogicID);
            blp.startTransaction(req, businessLogicID, tradeID);
            logger.debug("start cartrade");
        }

        return tradeID;
    }


    createTradeID(): string {
        // NOTE: tradeID is "(GMT date when the API was accepted) - (serial number)"

        // TODO: Trailing number-generating part not implemented
        //  NOTE: The last serial number is fixed "001" for 2020/9 months.
        const currentTime: Date = new Date();
        const tradeID: string = currentTime.getFullYear()
            + ('0' + (currentTime.getMonth() + 1)).slice(-2)
            + ('0' + currentTime.getDate()).slice(-2)
            + ('0' + currentTime.getHours()).slice(-2)
            + ('0' + currentTime.getMinutes()).slice(-2)
            + ('0' + currentTime.getSeconds()).slice(-2)
            + ('00' + currentTime.getMilliseconds()).slice(-3)
            + "-001";   // NOTE: Serial number for the same time. Since the priority is low, it is fixed at "001" at this time.
        return tradeID;
    }


    // Get state of operation
    getOperationStatus(tradeID: string): object {

        const businessLogicID = this.getBusinessLoginIDByTradeID(tradeID);
        if (businessLogicID === null) {
            logger.warn(`##getOperationStatus(): not found BusinessLogicPlugin. tradeID: ${tradeID}`);
            return;
        }

        const blp = getTargetBLPInstance(businessLogicID);
        if (blp === null) {
            logger.warn(`##getOperationStatus(): not found BusinessLogicPlugin. businessLogicID: ${businessLogicID}`);
            return;
        }

        const transactionStatusData = blp.getOperationStatus(tradeID);

        return transactionStatusData;

    }


    // Set business logic config
    setBusinessLogicConfig(req: Request): object {

        // businessLogicID
        const businessLogicID = req.body.businessLogicID;
        logger.info(`businessLogicID: ${businessLogicID}`);

        // object judgment
        let result: {} = {};
        if (businessLogicID === "h40Q9eMD") {

            const blp = getTargetBLPInstance(businessLogicID);
            if (blp === null) {
                logger.warn(`##startBusinessLogic(): not found BusinessLogicPlugin. businessLogicID: ${businessLogicID}`);
                return;
            }

            logger.debug("created instance");

            // Set business logic config
            logger.debug(`meterParams = ${req.body.meterParams}`);
            result = blp.setConfig(req.body.meterParams);
            logger.debug("set business logic config");
        }

        return result;
    }

/*
    // Get Verifier
    getVerifier(validatorId: string, monitorOptions = {}): VerifierBase {

        // Return Verifier
        // If you have already made it, please reply. If you haven't made it yet, make it and reply.
        if (this.verifierArray[validatorId]) {
            return this.verifierArray[validatorId];
        }
        else {
            const ledgerPluginInfo: string = this.connectInfo.getLegerPluginInfo(validatorId);
            // TODO: I want to manage an instance using the validatorId as a key instead of a dedicated member variable
            this.verifierArray[validatorId] = new VerifierBase(ledgerPluginInfo);
            logger.debug("##startMonitor");
            this.verifierArray[validatorId].setEventListener(this);
            this.verifierArray[validatorId].startMonitor(monitorOptions);
            return this.verifierArray[validatorId];
        }

    }
*/

    // Get validator to use
    getValidatorToUse(businessLogicId: string): string {
        return this.blpRegistry.getBLPRegistryInfo(businessLogicId);
    }


    // interface VerifierEventListener
    onEvent(ledgerEvent: LedgerEvent): void {
//        logger.debug(`####in onEvent: event: ${json2str(ledgerEvent)}`);
        const eventNum = this.getEventNum(ledgerEvent);
        if (eventNum === 0) {
            logger.warn(`onEvent(): invalid event, event num is zero., ledgerEvent.verifierId: ${ledgerEvent.verifierId}`);
            return;
        }

        for (let i = 0; i < eventNum; i++) {
            const blp = this.getBLPInstanceFromEvent(ledgerEvent, i);
            if (blp !== null) {
                logger.debug(`onEvent: call BLP#onEvent()`);
                blp.onEvent(ledgerEvent, i);
            }
        }
    }


    private getEventNum(ledgerEvent: LedgerEvent): number {
//        logger.debug(`##getEventNum: event: ${ledgerEvent}`);
        for (const businessLogicID of this.blpRegistry.getBusinessLogicIDList()) {
            logger.debug(`####getEventNum(): businessLogicID: ${businessLogicID}`);
            const blp = getTargetBLPInstance(businessLogicID);
            if (blp === null) {
                logger.warn(`getEventNum(): not found, businessLogicID: ${businessLogicID}`);
                continue;
            }

            const eventNum = blp.getEventDataNum(ledgerEvent);
            if (eventNum !== 0) {
                logger.debug(`##getEventNum: target businessLogicID: ${businessLogicID}`);
                return eventNum;
            }
        }

        // not found.
        logger.warn(`getEventNum(): not found(The corresponding BLP does not exist.)`);
        return 0;
    }


    private getBLPInstanceFromEvent(ledgerEvent: LedgerEvent, targetIndex: number): BusinessLogicPlugin | null {
        const txID = this.getTxIDFromEvent(ledgerEvent, targetIndex);
        if (txID === null) {
            logger.warn(`getBLPInstanceFromEvent: not found txID`);
            return;
        }
        logger.debug(`getBLPInstanceFromEvent: txID: ${txID}`);

        return this.getBLPInstanceFromTxID(txID);
    }


    private getTxIDFromEvent(ledgerEvent: LedgerEvent, targetIndex: number): string | null {
//        logger.debug(`##getTxIDFromEvent: event: ${ledgerEvent}`);
        for (const businessLogicID of this.blpRegistry.getBusinessLogicIDList()) {
            logger.debug(`####getTxIDFromEvent(): businessLogicID: ${businessLogicID}`);
            const blp = getTargetBLPInstance(businessLogicID);
            if (blp === null) {
                logger.warn(`getTxIDFromEvent(): not found, businessLogicID: ${businessLogicID}`);
                continue;
            }

            const txID = blp.getTxIDFromEvent(ledgerEvent, targetIndex);
            if (txID !== null) {
                logger.debug(`##getTxIDFromEvent: target blp: ${txID}`);
                return txID;
            }
        }

        // not found.
        logger.warn(`getTxIDFromEvent(): not found(The corresponding BLP does not exist.)`);
        return null;
    }


    private getBLPInstanceFromTxID(txID: string): BusinessLogicPlugin | null {
        logger.debug(`##getBLPInstanceFromTxID: txID: ${txID}`);
        for (const businessLogicID of this.blpRegistry.getBusinessLogicIDList()) {
            logger.debug(`####getBLPInstanceFromTxID(): businessLogicID: ${businessLogicID}`);
            const blp = getTargetBLPInstance(businessLogicID);
            if (blp === null) {
                logger.warn(`getBLPInstanceFromTxID(): not found, businessLogicID: ${businessLogicID}`);
                continue;
            }

//            if (blp.hasTxIDInTransactions(txID)) {
                logger.debug(`####getBLPInstanceFromTxID(): found!, businessLogicID: ${businessLogicID}`);
                return blp;
//            }
        }

        // not found.
        logger.warn(`getBLPInstanceFromTxID(): not found(The corresponding BLP does not exist.)`);
        return null;
    }


    private setTradeIDMapInfo(tradeID: string, businessLogicID: string): void {
        this.tradeIDMapInfo.set(tradeID, businessLogicID);
    }


    private getBusinessLoginIDByTradeID(tradeID: string): string | null {
        if (this.tradeIDMapInfo.has(tradeID)) {
            return this.tradeIDMapInfo.get(tradeID);
        }
        return null;
    }
}
