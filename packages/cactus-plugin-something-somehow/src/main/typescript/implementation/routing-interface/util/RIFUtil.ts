/*
 * Copyright 2020-2021 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * RIFUtil.ts
 */

import { ConfigUtil } from './ConfigUtil';

const fs = require('fs');
const path = require('path');
const config: any = ConfigUtil.getConfig();
import { getLogger } from "log4js";
const moduleName = 'RIFUtil';
const logger = getLogger(`${moduleName}`);
logger.level = config.logLevel;

export class RIFUtil {

    /**
     * Convert JSON object to string
     *
     * @param {Object} jsonObj - JSON object.
     * @return {String} The converted string. Returns null if the conversion fails.
     */
    static json2str(jsonObj: object): string | null {
        try {
            return JSON.stringify(jsonObj);
        }
        catch (error) {
            return null;
        }
    }

    /**
     * Convert a JSON string to an object
     *
     * @param {String} jsonObj - JSON string.
     * @return {Object} The converted object. Returns null if the conversion fails.
     */
    static str2json(jsonStr: string): object | null {
        try {
            return JSON.parse(jsonStr);
        }
        catch (error) {
            logger.error(error)
            return null;
        }
    }

    /**
     * Get the authentication token
     *
     * @param {req} req - req object.
     * @return {string} If no authentication token is specified, returns undefined.
     */
    static getTokenByReq(req: any): string | undefined {
        return req.query.token;
    }

    /**
     * Get the authentication token
     *
     * @param {string} userId - The target user ID.
     * @return {string} Returns the authentication token. Format: tk_{userid}_{YYYYMMDDhhmm(UTC)}
     */
    static createToken(userId: string): string {
        logger.debug(`##in createToken`);
        const now = new Date();
        const year = now.getUTCFullYear();
        const month = RIFUtil.getdoubleDigestNumerStr(now.getUTCMonth() + 1);
        const day = RIFUtil.getdoubleDigestNumerStr(now.getUTCDate());
        const hour = RIFUtil.getdoubleDigestNumerStr(now.getUTCHours());
        const min = RIFUtil.getdoubleDigestNumerStr(now.getUTCMinutes());
        const strTimestamp = `${year}${month}${day}${hour}${min}`;

        const retToken = `tk_${userId}_${strTimestamp}`;
        logger.debug(`retToken=${retToken}`);

        return retToken;
    }

    /**
     * Convert a number to a two-digit string
     *
     * @param {number} val - The number to convert
     * @return {string} Return a two-digit string.
     */
    static getdoubleDigestNumerStr(val: number): string {
        return ("0" + val).slice(-2)
    }

    /**
     * Obtain a user ID from an authentication token
     *
     * @param {string} token - The authentication token.
     * @return {string} Returns the user ID. Returns undefined if the authentication token is incorrect.
     */
    static getUserIdByToken(token: string): string | undefined {
        // NOTE: The authentication token is "tk_userid_YYYYYMMDDhhmm".
        if (!RIFUtil.isValidToken(token)){
            return undefined;
        }

        return token.substr(3, token.length - 16);
    }

    /**
     * Get a timestamp (YYYYMMDDhhmm) string from an authentication token
     *
     * @param {string} token - The authentication token.
     * @return {string} Return a timestamp (YYYYMMDDhhmm) string. Returns undefined if the authentication token is incorrect.
     */
    static getTimestampByToken(token: string): string | undefined {
        // NOTE: The authentication token is "tk_userid_YYYYYMMDDhhmm".
        if (!RIFUtil.isValidToken(token)){
            return undefined;
        }

        return token.substr(token.length - 12);
    }

    /**
     * Validating Authentication Tokens
     *
     * @param {string} token - The authentication token.
     * @return {boolean} true: correct, false: incorrect
     */
    private static isValidToken(token: string): boolean {
        if (token === undefined) {
            logger.warn(`invalid token: ${token}`);
            return false;
        }

        // NOTE: The authentication token is "tk_userid_YYYYYMMDDhhmm".
        if (token.length <= 17) {
            logger.warn(`invalid token: ${token}`);
            return false;
        }

        const prefix = token.substr(0, 3);
        if (prefix !== "tk_") {
            logger.warn(`invalid token: ${token}`);
            return false;
        }

        return true;
    }

};
