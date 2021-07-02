/*
 * Copyright 2020-2021 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * login.ts
 */

import { Router, NextFunction, Request, Response } from 'express';
import { RIFUtil } from '../util/RIFUtil';
import { ConfigUtil } from '../util/ConfigUtil';
import { RIFError, BadRequestError, InternalServerError } from '../RIFError';

const fs = require('fs');
const path = require('path');
const config: any = ConfigUtil.getConfig();
import { getLogger } from "log4js";
const moduleName = 'login';
const logger = getLogger(`${moduleName}`);
logger.level = config.logLevel;

const router: Router = Router();

/* POST login. */
router.post('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.body.userid;
    const userPwd = req.body.pwd;
    logger.debug(`##in login: userid=${userId}, pwd=${userPwd}`);

    if (userId === undefined) {
        const msg = `invalid param. userid`;
        logger.warn(msg);
        throw new BadRequestError(msg);
    }
    if (userPwd === undefined) {
        const msg = `invalid param. pwd`;
        logger.warn(msg);
        throw new BadRequestError(msg);
    }

    const authToken = RIFUtil.createToken(userId);
    logger.debug(`##authToken=${authToken}`);

    const respData = {authToken: authToken};

    res.status(201);
    res.send(respData);

  } catch (err) {
    logger.error(`##err name: ${err.constructor.name}`);

    if (err instanceof RIFError) {
        logger.debug(`##catch RIFError, ${err.statusCode}, ${err.message}`);
        res.status(err.statusCode);
        res.send(err.message);
        return;
    }

    logger.error(`##err in login: ${err}`);
    next(err);
  }
});

export default router;
