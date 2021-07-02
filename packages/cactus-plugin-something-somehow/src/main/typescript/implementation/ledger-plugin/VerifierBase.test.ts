/*
 * Copyright 2020-2021 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * VerifierBase.test.ts
 */

import { VerifierBase } from './VerifierBase';
import { VerifierEventListener, LedgerEvent } from './LedgerPlugin';

class TestVerifierEventListener implements VerifierEventListener {
    constructor(
        private id: string
    ) {}
    
    onEvent(ledgerEvent: LedgerEvent): void {;}
}


test('test', () => {
    
    const verifierBase = new VerifierBase(JSON.stringify(ledgerInfo));
    const listener001 = new TestVerifierEventListener("ID_001");
    const listener002 = new TestVerifierEventListener("ID_002");
    
    verifierBase.setEventListener(listener001);
    expect(verifierBase.eventListener).toEqual(listener001);
    // expect(verifierBase.eventListener).toEqual(listener002); // NG
});


// for test data
const ledgerInfo = 
    {
        "validatorID": "84jUisrs",
        "validatorURL": "https://localhost:5050",
        "ledgerInfo": {
            "ledgerAbstract": "Go-Ethereum Ledger"
        },
        "apiInfo": [
            {
                "apiType": "getNumericBalance",
                "requestedData": [
                    {
                        "dataName": "referedAddress",
                        "dataType": "string"
                    }
                ]
            },
            {
                "apiType": "transferNumericAsset",
                "requestedData": [
                    {
                        "dataName": "fromAddress",
                        "dataType": "string"
                    },
                    {
                        "dataName": "toAddress",
                        "dataType": "string"
                    },
                    {
                        "dataName": "amount",
                        "dataType": "number"
                    }
                ]
            },
            {
                "apiType": "sendRawTransaction",
                "requestedData": [
                    {
                        "dataName": "serializedTx",
                        "dataType": "string"
                    }
                ]
            }
        ]
    };
    


