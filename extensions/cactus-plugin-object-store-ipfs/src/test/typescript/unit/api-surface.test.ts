import test, { Test } from "tape-promise/tape";
import * as publicApi from "../../../main/typescript/public-api";

test("Library can be loaded", (t: Test) => {
  t.ok(publicApi, "Public API of library truthy OK");
  t.end();
});
