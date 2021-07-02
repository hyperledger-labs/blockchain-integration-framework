/*
 * Copyright 2020-2021 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * ValidatorAuthentication.ts
 */

const fs = require('fs');
const path = require('path');
const jwt = require("jsonwebtoken");
import { config } from '../core/config/default';
import { getLogger } from "log4js";
const logger = getLogger('ValidatorAuthentication[' + process.pid + ']');
logger.level = config.logLevel;

const privateKey = fs.readFileSync(path.resolve(__dirname, config.validatorKeyPath));

export class ValidatorAuthentication {

    static sign(payload: object): string {

        const option = {
            algorithm: 'RS256',
            expiresIn: '1000'
        }

        // logger.debug(`payload = ${JSON.stringify(payload)}`);
        const signature: string = jwt.sign(payload, privateKey, option);
        logger.debug(`signature = ${signature}`);
        return signature;

    }

}
