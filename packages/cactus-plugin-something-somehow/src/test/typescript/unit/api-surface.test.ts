import test, { Test } from "tape-promise/tape";

import { PluginFactorySomething } from "../../../main/typescript/public-api";

test("API surface can be imported", (t: Test) => {
  t.ok(PluginFactorySomething);
  t.end();
});
