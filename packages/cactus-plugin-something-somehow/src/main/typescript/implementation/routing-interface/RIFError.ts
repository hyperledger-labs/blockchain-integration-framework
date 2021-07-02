/*
 * Copyright 2020-2021 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * RIFError.ts
 */

export class RIFError extends Error {
    statusCode: number = 500;

    constructor(e?: string) {
        super(e);
        this.name = new.target.name;
        // The following line is only required if TypeScript's output target is older than ES 2015 (ES3, ES5)
        Object.setPrototypeOf(this, new.target.prototype);
    }
}

export class BadRequestError extends RIFError {
    constructor(e?: string) {
        super(e);
        this.statusCode = 400;
    }
}

export class InternalServerError extends RIFError {
    constructor(e?: string) {
        super(e);
        this.statusCode = 500;
    }
}
