const tap = require("tap");
import { PluginFactoryLedgerConnector } from "../../../main/typescript/public-api";

tap.pass("Test file can be executed");

tap.test("Library can be loaded", (assert: any) => {
  assert.plan(1);
  assert.ok(PluginFactoryLedgerConnector);
});
