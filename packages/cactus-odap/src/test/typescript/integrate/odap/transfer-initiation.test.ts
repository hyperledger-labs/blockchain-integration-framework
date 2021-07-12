import test, { Test } from "tape";

/*import {

} from "../../../../main/typescript/public-api";*/
import { OdapGateway } from "../../../../main/typescript/gateway/odap-gateway";
test("dummy test for transfer initiation flow", async (t: Test) => {
  /*
    run a gateway(now only call function)
    send initiation flow
    recv initiation ack
    */
  const odapGateWay = new OdapGateway("dummy");
  const initializationRequestMessage = { Version: "0.0.0" };
  const ackMessage = await odapGateWay.InitiateTransfer(
    initializationRequestMessage,
  );
  t.equals(
    ackMessage.SessionID,
    "would filled out this later",
    "sessionID equals",
  );
});
