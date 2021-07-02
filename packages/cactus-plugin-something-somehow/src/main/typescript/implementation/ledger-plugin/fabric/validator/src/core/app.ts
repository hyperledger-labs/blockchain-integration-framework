/*
 * Copyright 2021 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 * 
 * app.js
 */

/* Summary:
 * 
 */

import { NextFunction, Request, Response } from 'express';
import createError = require('http-errors');
import express = require('express');
import cookieParser = require('cookie-parser');
import bodyParser = require('body-parser');

const app: express.Express = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

// catch 404 and forward to error handler
app.use(function(req, res, next) {
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
  res.send(err);
});

export default app;
