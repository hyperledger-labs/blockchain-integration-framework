/*
 * Copyright 2021 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * blockmonitor.ts
 */

import { Router, NextFunction, Request, Response } from 'express';
import { RIFUtil } from '../util/RIFUtil';
import { ConfigUtil } from '../util/ConfigUtil';
import { RIFError, BadRequestError, InternalServerError } from '../RIFError';
import { BlockMonitor } from '../BlockMonitor';

const fs = require('fs');
const path = require('path');
const config: any = ConfigUtil.getConfig();
import { getLogger } from "log4js";
const moduleName = 'blockmonitor';
const logger = getLogger(`${moduleName}`);
logger.level = config.logLevel;

const router: Router = Router();
const blockMonitor: BlockMonitor = new BlockMonitor();

/* sawtoothBlockMonitoring */
router.get('/start', (req: Request, res: Response, next: NextFunction) => {
  try {

    blockMonitor.sawtoothBlockMonitoring().then(result => {
        logger.debug("result(sawtoothBlockMonitoring) = " + JSON.stringify(result));
        res.status(200).json(result);
    }).catch((err) => {
        logger.error(err);
    });

  } catch (err) {
    logger.error(`##err name: ${err.constructor.name}`);

    if (err instanceof RIFError) {
        logger.debug(`##catch RIFError, ${err.statusCode}, ${err.message}`);
        res.status(err.statusCode);
        res.send(err.message);
        return;
    }

    logger.error(`##err in balance: ${err}`);
    next(err);
  }
});

export default router;
