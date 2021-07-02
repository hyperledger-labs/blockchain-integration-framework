/*
 * Copyright 2020-2021 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * BusinessLogicPlugin.ts
 */

import { Request } from 'express';
import { VerifierEventListener, LedgerEvent } from '../ledger-plugin/LedgerPlugin';

export interface BusinessLogicPlugin {
    startTransaction(req: Request, businessLogicID: string, tradeID: string): void;
    getOperationStatus(tradeID: string): object;
    setConfig(data: []): object;
    onEvent(ledgerEvent: LedgerEvent, targetIndex: number): void;
    getEventDataNum(ledgerEvent: LedgerEvent): number;
    getTxIDFromEvent(ledgerEvent: LedgerEvent, targetIndex: number): string | null;
    hasTxIDInTransactions(txID: string): boolean;
}
