/*
 * Copyright 2020-2021 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * DriverCommon.ts
 */

import { ApiInfo, RequestedData, } from './LedgerPlugin'
import { ConfigUtil } from '../routing-interface/util/ConfigUtil';

const fs = require('fs');
const path = require('path');
const config: any = ConfigUtil.getConfig();
import { getLogger } from "log4js";
const moduleName = 'DriverCommon';
const logger = getLogger(`${moduleName}`);
logger.level = config.logLevel;

// for debug
export function json2str(jsonObj: object) {
  try {
    return JSON.stringify(jsonObj);
  } catch (error) {
    logger.warn("invalid json format.");
    return null;
  }
}

// Validator test program.(socket.io client)

export function makeApiInfoList(targetApiInfo: any): ApiInfo[] {
  const retApiInfoList: ApiInfo[] = new Array();
  for (const item of targetApiInfo) {
    const apiInfo: ApiInfo = new ApiInfo();
    apiInfo.apiType = item.apiType;
    for (const reqDataItem of item.requestedData) {
      const reqData = new RequestedData();
      reqData.dataName = reqDataItem.dataName;
      reqData.dataType = reqDataItem.dataType;
      apiInfo.requestedData.push(reqData);
    }
    retApiInfoList.push(apiInfo);
  }
  return retApiInfoList;
}

// store on socket
const socketArray = new Array();

// Returns the index of socketArray as a return value
export function addSocket(socket: any): number {
  // TODO:
  const index = socketArray.push(socket) - 1;
  logger.debug(`##addSocket, index = ${index}`);
  return index;
}

export function getStoredSocket(index: number): any {
  logger.debug(`##getSocket, index = ${index}`);
  return (socketArray[index]);
}

export function deleteAndDisconnectSocke(index: number) {
  try {
    logger.debug(`##deleteAndDisconnectSocke, index = ${index}`);
    if (socketArray.length > index) {
      const socket = socketArray[index];
      if (socket.connected) {
        logger.debug(`##call disconnect, index = ${index}`);
        socket.disconnect();
      }
      else {
        logger.debug(`##already disconnected, index = ${index}`);
      }
    }
  }
  catch (err) {
    logger.warn(`##error:deleteAndDisconnectSocke, index = ${index}, ${err}`);
  }
}

