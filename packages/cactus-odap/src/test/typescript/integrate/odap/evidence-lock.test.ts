import test, { Test } from "tape";

/*import {

} from "../../../../main/typescript/public-api";*/
import { OdapGateway } from "../../../../main/typescript/gateway/odap-gateway";
test("dummy test for lock evidence transfer commence method", async (t: Test) => {
  /*
    run a gateway(now only call function)
    send initiation flow
    recv initiation ack
    */
  const odapGateWay = new OdapGateway("dummy");
  const transferCommenceMessage = {
    MessageType: "",
    OriginatorPubkey: "",
    BefeficiaryPubkey: "",
    SenderDltSystem: {},
    RecipientDltSystem: {},
    ClientIdentityPubkey: "",
    ServerIdentityPubkey: "",
    HashAssetProfile: "",
    AssetUnit: 1,
    HashPrevMessage: "",
    ClientTransferNumber: 1,
    ClientSignature: "",
  };
  t.throws(
    () => odapGateWay.LockEvidenceTransferCommence(transferCommenceMessage),
    /transfer commence message type not match/,
    "Check for message type not match OK",
  );
  transferCommenceMessage.MessageType =
    "urn:ietf:odap:msgtype:transfer-commence-msg";
  t.doesNotThrow(() =>
    odapGateWay.LockEvidenceTransferCommence(transferCommenceMessage),
  );
  const transferCommenceResponseMessage = await odapGateWay.LockEvidenceTransferCommence(
    transferCommenceMessage,
  );
  t.equal(
    transferCommenceResponseMessage.MessageType,
    transferCommenceMessage.MessageType,
    "transfer commence response message type match",
  );
});
