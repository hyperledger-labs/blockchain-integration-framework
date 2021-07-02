/*
 * Copyright 2020-2021 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * RIFUtil.test.ts
 */

import { RIFUtil } from './RIFUtil';

test('test', () => {
    const objJson = {aaa: "abc", bbb: "def"};
    const strJson = JSON.stringify(objJson);
    expect(RIFUtil.json2str(objJson)).toBe(strJson);
    expect(RIFUtil.json2str(RIFUtil.str2json(strJson))).toBe(strJson);
    expect(RIFUtil.str2json("abc")).toBeNull(); // for invalid value.
});
