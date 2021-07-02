/*
 * Copyright 2020-2021 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * RequestInfo.ts
 */

// transaction information
class TradeInfo {
    ethereumAccountFrom: string;
    ethereumAccountTo: string;
    fabricAccountFrom: string;
    fabricAccountTo: string;
    tradingValue: string;
    carID: string;
}

// authorization information
class AuthInfo {
    company: string;
}

// request information
export class RequestInfo {
    businessLogicID: string;
    tradeID: string;
    tradeInfo: TradeInfo;
    authInfo: AuthInfo;
    constructor() {
        this.tradeInfo = new TradeInfo();
        this.authInfo = new AuthInfo();
    }

    setTradeID(tradeID: string) {
        this.tradeID = tradeID;
    }
}

