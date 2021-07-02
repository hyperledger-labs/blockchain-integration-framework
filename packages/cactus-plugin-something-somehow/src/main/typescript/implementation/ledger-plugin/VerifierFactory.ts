/*
 * Copyright 2021 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * VerifierFactory.ts
 */

import { transactionManagement } from '../routing-interface/routes/index';
import { VerifierBase } from '../ledger-plugin/VerifierBase';
import { LPInfoHolder } from '../routing-interface/util/LPInfoHolder';
import { ConfigUtil } from '../routing-interface/util/ConfigUtil';

const config: any = ConfigUtil.getConfig();
import { getLogger } from "log4js";
const moduleName = 'VerifierFactory';
const logger = getLogger(`${moduleName}`);
logger.level = config.logLevel;

export class VerifierFactory {
    private connectInfo: LPInfoHolder = null;                   // connection information
    private verifierArray: [] = [];                             // Verifier

    constructor() {
        this.connectInfo = new LPInfoHolder();
    }

    // Get Verifier
    getVerifier(validatorId: string, monitorOptions: {} = {}, monitorMode: boolean = true): VerifierBase {

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
            if (monitorMode) {
                this.verifierArray[validatorId].setEventListener(transactionManagement);
                this.verifierArray[validatorId].startMonitor(monitorOptions);
            }
            return this.verifierArray[validatorId];
        }

    }
}
