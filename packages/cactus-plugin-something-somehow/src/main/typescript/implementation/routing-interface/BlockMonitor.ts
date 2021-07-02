/*
 * Copyright 2021 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * BlockMonitor.ts
 */

import { LedgerOperation } from '../business-logic-plugin/LedgerOperation';
import { LPInfoHolder } from './util/LPInfoHolder';
import { VerifierBase } from '../ledger-plugin/VerifierBase';
import { ConfigUtil } from './util/ConfigUtil';
import { LedgerEvent } from '../ledger-plugin/LedgerPlugin';

const fs = require('fs');
const path = require('path');
const config: any = ConfigUtil.getConfig();
import { getLogger } from "log4js";
const moduleName = 'BlockMonitor';
const logger = getLogger(`${moduleName}`);
logger.level = config.logLevel;

export class BlockMonitor {
    private connectInfo: LPInfoHolder = null;                   // connection information
    private verifierSawtooth: VerifierBase = null;

    constructor() {
        this.connectInfo = new LPInfoHolder();
    }

    sawtoothBlockMonitoring(): Promise<any> {
        return new Promise((resolve, reject) => {
            if (this.verifierSawtooth === null) {
                logger.debug("create verifierSawtooth");
                const ledgerPluginInfo: string = this.connectInfo.getLegerPluginInfo("sawtooth");
                this.verifierSawtooth = new VerifierBase(ledgerPluginInfo);
                this.verifierSawtooth.setEventListener(this);
                const option = {
                    "filterKey":"intkey"
                }
                this.verifierSawtooth.startMonitor(option);
            }

            const response = {
                "status": 200
            }
            resolve(response);
        });
    }


    onEvent(ledgerEvent: LedgerEvent): void {
        logger.debug(`####in onEvent: event: ${JSON.stringify(ledgerEvent)}`);
    }

}
