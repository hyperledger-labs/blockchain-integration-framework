import test, { Test } from "tape";
import * as publicApi from "../../../main/typescript/public-api";

test("Library can be loaded", (assert: Test) => {
  assert.ok(publicApi);
  assert.end();
});
