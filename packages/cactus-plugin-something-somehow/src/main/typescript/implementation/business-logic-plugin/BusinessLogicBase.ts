/*
 * Copyright 2020-2021 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * BusinessLogicBase.ts
 */

import { Request } from 'express';
import { BusinessLogicPlugin } from './BusinessLogicPlugin';
import { VerifierEventListener, LedgerEvent } from '../ledger-plugin/LedgerPlugin';
import { json2str } from '../ledger-plugin/DriverCommon'
import { ConfigUtil } from '../routing-interface/util/ConfigUtil';

const fs = require('fs');
const path = require('path');
const config: any = ConfigUtil.getConfig();
import { getLogger } from "log4js";
const moduleName = 'BusinessLogicBase';
const logger = getLogger(`${moduleName}`);
logger.level = config.logLevel;

export class BusinessLogicBase implements BusinessLogicPlugin {
    eventFilter: object | null = null;

    startTransaction(req: Request, businessLogicID: string, tradeID: string): void {
        // NOTE: This method implements the BisinessLogcPlugin operation(* Override by subclass)
    }

    executeNextTransaction(txInfo: object, txId: string): void {
        // NOTE: This method implements the BisinessLogcPlugin operation(* Override by subclass)
    }

    getOperationStatus(tradeID: string): object {
        // NOTE: This method implements the BisinessLogcPlugin operation(* Override by subclass)
        return {};
    }

    setConfig(data: []): object {
        // NOTE: This method implements the BisinessLogcPlugin operation(* Override by subclass)
        return {};
    }

    onEvent(ledgerEvent: LedgerEvent, targetIndex: number): void {
        // NOTE: This method implements the BisinessLogcPlugin operation(* Override by subclass)
    }

    getEventFilter(): object | null {
        logger.debug(`##called getEventFilter: ${json2str(this.eventFilter)}`);
        return this.eventFilter;
    }

    setEventFilter(filter: object): void {
        logger.debug(`##called setEventFilter(before): ${json2str(this.eventFilter)}`);
        this.eventFilter = filter;
        logger.debug(`##called setEventFilter(after): ${json2str(this.eventFilter)}`);
    }

    getEventDataNum(ledgerEvent: LedgerEvent): number {
        // NOTE: This method implements the BisinessLogcPlugin operation(* Override by subclass)
        return 0;
    }

    getTxIDFromEvent(ledgerEvent: LedgerEvent, targetIndex: number): string | null {
        // NOTE: This method implements the BisinessLogcPlugin operation(* Override by subclass)
        return null;
    }

    hasTxIDInTransactions(txID: string): boolean {
        // NOTE: This method implements the BisinessLogcPlugin operation(* Override by subclass)
        return false;
    }
}
