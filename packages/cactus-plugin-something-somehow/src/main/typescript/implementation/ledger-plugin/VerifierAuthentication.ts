/*
 * Copyright 2020-2021 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * VerifierAuthentication.ts
 */

import { ConfigUtil } from '../routing-interface/util/ConfigUtil';
const fs = require('fs');
const path = require('path');
const config: any = ConfigUtil.getConfig();
import { getLogger } from "log4js";
const moduleName = 'VerifierAuthentication';
const logger = getLogger(`${moduleName}`);
logger.level = config.logLevel;
const jwt = require("jsonwebtoken");

export class VerifierAuthentication {

    static verify(keyPath: string, targetData: string): Promise<any> {
        return new Promise((resolve, reject) => {

            const publicKey = fs.readFileSync(path.resolve(__dirname, keyPath));

            const option = {
                algorithms: 'RS256'
            }

            jwt.verify(targetData, publicKey, option, function(err, decoded) {
                if (err) {
                    // Authentication NG
                    logger.debug(`Authentication NG : error = ${err}`);
                    reject(err);
                } else {
                    // Authentication OK
                    logger.debug(`Authentication OK : decoded = ${JSON.stringify(decoded)}`);
                    resolve(decoded);
                }
            });

        });
    }

}
