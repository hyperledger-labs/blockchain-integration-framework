/*
 * Copyright 2020-2021 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * LedgerOperation.ts
 */

export class LedgerOperation {
    apiType: string;
    progress: string;
    data: {};

    constructor(apiType: string, progress: string, data: {}) {
        this.apiType = apiType;
        this.progress = progress;
        this.data = data;
    }
}
