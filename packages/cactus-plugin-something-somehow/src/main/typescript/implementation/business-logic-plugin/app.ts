/*
 * Copyright 2020-2021 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * app.ts
 */

import { NextFunction, Request, Response } from 'express';

import createError = require('http-errors');
import express = require('express');
import path = require('path');
import cookieParser = require('cookie-parser');
import logger = require('morgan');
import bodyParser = require('body-parser');

import indexRouter from   '../routing-interface/routes/index';
import loginRouter from   '../routing-interface/routes/login';
import blockmonitorRouter from    '../routing-interface/routes/blockmonitor';
import { ConfigUtil } from '../routing-interface/util/ConfigUtil';

const config: any = ConfigUtil.getConfig();

const app: express.Express = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use('/', indexRouter);
app.use('/api/v1/bl/login/', loginRouter);
app.use('/api/v1/bl/blockmonitor/', blockmonitorRouter);

// Dynamic loading
console.debug(`start Dynamic loading.`);
for (var appRouter of config.appRouters) {
    console.debug(`path: ${appRouter.path}, routerJs: ${appRouter.routerJs}`);
    app.use(appRouter.path, require(appRouter.routerJs).default);
}


// catch 404 and forward to error handler
app.use((req: Request, res: Response, next: NextFunction) => {
  next(createError(404));
});

// error handler
app.use((err: { message: string, status?: number }, req: Request, res: Response, next: NextFunction) => {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // set erreor response
  const errorResponse: {} = {
    "statusCode": err.status || 500,
    "message": err.message
  };

  // render the error page
  res.status(err.status || 500);
  res.send(errorResponse);
});

export default app;
