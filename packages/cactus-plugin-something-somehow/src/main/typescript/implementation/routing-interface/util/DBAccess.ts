/*
 * Copyright 2020-2021 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * DBAccess.ts
 */

import { ConfigUtil } from '../util/ConfigUtil';

const fs = require('fs');
const path = require('path');
const configDefault: any = ConfigUtil.getConfig();
const configVerifier: any = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../config/verifier-config.json"), 'utf8'));
const configContract: any = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../config/contractInfo.json"), 'utf8'));

export class DBAccess {
    ledgerPluginInfo: [];
    contractInfo: [];
    blpRegistryInfo: [];

    constructor() {
        // TODO: DB Access Initialization
    }

    getLedgerPluginInfo(): [] {
        // TODO: Future access to DB for connection information

        this.ledgerPluginInfo = configVerifier.ledgerPluginInfo;
        return this.ledgerPluginInfo;
    }

    getContractInfo(): [] {
        // TODO: Future access to DB for contract information

        this.contractInfo = configContract.contractInfo;
        return this.contractInfo;
    }

    getBLPRegistryInfo(): [] {
        // TODO: Future access to DB for business logic plugin information

        this.blpRegistryInfo = configDefault.blpRegistry;
        return this.blpRegistryInfo;
    }
}