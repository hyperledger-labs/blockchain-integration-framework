/*
 * Copyright 2020-2021 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * ContractInfoHolder.ts
 */

import { DBAccess } from './DBAccess';
import { ConfigUtil } from '../util/ConfigUtil';

const fs = require('fs');
const path = require('path');
const config: any = ConfigUtil.getConfig();
import { getLogger } from "log4js";
const moduleName = 'ContractInfoHolder';
const logger = getLogger(`${moduleName}`);
logger.level = config.logLevel;

export class ContractInfoHolder {
    contractInfo: [] = [];

    constructor() {
        // TODO: Get contract information for all contracts
        const dbAccess: DBAccess = new DBAccess();
        this.contractInfo = dbAccess.getContractInfo();
    }

    getContractInfo(contractName?: string): string {
        // TODO: Get information about the specified LedgerPlugin

        if (contractName) {
            let ret: string = "";
            this.contractInfo.forEach(info => {
                if (info['contractName'] === contractName) {
                    ret = JSON.stringify(info);
                }
            });
            if (ret === "") {
                logger.warn('ContractInfo is Not Found : contractName = ' + contractName);
            }
            return ret;
        } else {
            return JSON.stringify(this.contractInfo);
        }
    }
}
