/*
 * Copyright 2020-2021 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * TradeInfo.ts
 */

export class TradeInfo {
    businessLogicID: string;
    tradeID: string;

    constructor(businessLogicID: string, tradeID: string) {
        this.businessLogicID = businessLogicID;
        this.tradeID = tradeID;
    }
}
