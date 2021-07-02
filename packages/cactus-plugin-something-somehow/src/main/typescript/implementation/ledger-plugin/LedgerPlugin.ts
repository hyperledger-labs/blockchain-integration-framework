/*
 * Copyright 2020-2021 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * LedgerPlugin.ts
 */

import { LedgerOperation } from './../business-logic-plugin/LedgerOperation';

export interface Verifier {
    // BLP -> Verifier
    getApiList(): ApiInfo[];
    requestLedgerOperation(param: LedgerOperation): void;
    startMonitor(): Promise<LedgerEvent>;
    stopMonitor(soketId: string): void;
    setEventListener(eventListener: VerifierEventListener | null): void;

    // Validator -> Verifier
    // NOTE: The following methods are not implemented this time
    // connect(): void;
    // disconnect(): void;
    // getVerifierInfo(): VerifierInfo[];
}

export class ApiInfo {
    apiType: string = "";
    requestedData: RequestedData[] = new Array();
}

export class RequestedData {
    dataName: string = "";
    dataType: string = "";
}

export class LedgerEvent {
  id: string = "";
  verifierId: string = "";
  data: object | null = null;
    // NOTE: A class that represents an event.
    //       The purpose is to receive the event of Ledger on the Verifier side.
}

export interface VerifierEventListener {
    onEvent(ledgerEvent: LedgerEvent): void;
    // getEventFilter(): object | null;
    // isTargetEvent(ledgerEvent: LedgerEvent): boolean;
}

// NOTE: The following methods are not implemented this time
// class VerifierInfo {
//     version: string = "";
//     name: string = "";
//     ID: string = "";
//     otherData: VerifierInfoOtherData[] = [];
// }

// class VerifierInfoOtherData {
//     dataName: string = "";
//     dataType: string[] = [];
// }

