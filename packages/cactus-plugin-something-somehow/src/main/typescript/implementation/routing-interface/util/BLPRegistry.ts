/*
 * Copyright 2020-2021 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * BLPRegistry.ts
 */

import { DBAccess } from './DBAccess';
import { ConfigUtil } from '../util/ConfigUtil';

const fs = require('fs');
const path = require('path');
const config: any = ConfigUtil.getConfig();
import { getLogger } from "log4js";
const moduleName = 'BLPRegistry';
const logger = getLogger(`${moduleName}`);
logger.level = config.logLevel;

export class BLPRegistry {
    blpRegistryInfo: [] = [];

    constructor() {
        const dbAccess: DBAccess = new DBAccess();
        this.blpRegistryInfo = dbAccess.getBLPRegistryInfo();
    }

    getBLPRegistryInfo(businessLogicId?: string): string {
        if (businessLogicId) {
            let ret: string = "";
            this.blpRegistryInfo.forEach(info => {
                if (info['businessLogicID'] === businessLogicId) {
                    ret = JSON.stringify(info);
                }
            });
            if (ret === "") {
                logger.warn('BLPRegistryInfo is Not Found : businessLogicId = ' + businessLogicId);
            }
            return ret;
        } else {
            return JSON.stringify(this.blpRegistryInfo);
        }
    }

    getBusinessLogicIDList(): string[] {

        const businessLogicIDList: string[] = [];
        this.blpRegistryInfo.forEach(info => {
            businessLogicIDList.push(info['businessLogicID']);
        });

        return businessLogicIDList;
    }
}
