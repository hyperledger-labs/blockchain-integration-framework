import {
  CommitFinalMessage,
  CommitFinalResponseMessage,
  CommitPreparationMessage,
  CommitPreparationResponse,
  InitializationRequestMessage,
  InitialMessageAck,
  LockEvidenceMessage,
  LockEvidenceResponseMessage,
  TransferCommenceMessage,
  TransferCommenceResponseMessage,
  TransferCompleteMessage,
  TransferCompletMessageResponse,
} from "../generated/openapi/typescript-axios";
export class OdapGateway {
  name: string;
  public constructor(name: string) {
    this.name = name;
  }
  public async InitiateTransfer(
    req: InitializationRequestMessage,
  ): Promise<InitialMessageAck> {
    const validInitializationRequest = await this.CheckValidInitializationRequest(
      req,
    );
    if (!validInitializationRequest) {
      throw new Error(`InitiateTransfer error, InitializationRequest Invalid`);
    }
    return { SessionID: "would filled out this later" };
  }
  public async LockEvidenceTransferCommence(
    req: TransferCommenceMessage,
  ): Promise<TransferCommenceResponseMessage> {
    const validTransferCommenceRequest = await this.CheckValidtransferCommenceRequest(
      req,
    );
    if (!validTransferCommenceRequest) {
      throw new Error(`transfer commence message type not match`);
    }
    return { MessageType: "urn:ietf:odap:msgtype:transfer-commence-msg" };
  }
  public async LockEvidence(
    req: LockEvidenceMessage,
  ): Promise<LockEvidenceResponseMessage> {
    const validLockEvidenceRequest = await this.CheckValidLockEvidenceRequest(
      req,
    );
    if (!validLockEvidenceRequest) {
      throw new Error(`transfer commence message type not match`);
    }
    return { MessageType: "urn:ietf:odap:msgtype:lock-evidence-req-msg" };
  }
  public async CommitPrepare(
    req: CommitPreparationMessage,
  ): Promise<CommitPreparationResponse> {
    const validCommitPreparationRequest = await this.CheckValidCommitPreparationRequest(
      req,
    );
    if (!validCommitPreparationRequest) {
      throw new Error(`commit preparation message type not match`);
    }
    return { MessageType: "urn:ietf:odap:msgtype:commit-prepare-ack-msg" };
  }

  public async CommitFinal(
    req: CommitFinalMessage,
  ): Promise<CommitFinalResponseMessage> {
    const validCommitFinalRequest = await this.CheckValidCommitPreparationRequest(
      req,
    );
    if (!validCommitFinalRequest) {
      throw new Error(`commit final message type not match`);
    }
    return { MessageType: "urn:ietf:odap:msgtype:commit-final-msg" };
  }

  public async TransferComplete(
    req: TransferCompleteMessage,
  ): Promise<TransferCompletMessageResponse> {
    const validTransferCompleteRequest = await this.CheckValidTransferCompleteRequest(
      req,
    );
    if (!validTransferCompleteRequest) {
      throw new Error(`transfer complete message type not match`);
    }
    return {};
  }

  public async CheckValidTransferCompleteRequest(
    req: TransferCompleteMessage,
  ): Promise<boolean> {
    return (
      req.MessageType == "urn:ietf:odap:msgtype:commit-transfer-complete-msg"
    );
  }
  public async CheckValidCommitFinalRequest(
    req: CommitFinalMessage,
  ): Promise<boolean> {
    return req.MessageType == "urn:ietf:odap:msgtype:commit-final-msg";
  }
  public async CheckValidCommitPreparationRequest(
    req: CommitPreparationMessage,
  ): Promise<boolean> {
    return req.MessageType == "urn:ietf:odap:msgtype:commit-prepare-ack-msg";
  }
  public async CheckValidLockEvidenceRequest(
    req: LockEvidenceMessage,
  ): Promise<boolean> {
    return req.MessageType == "urn:ietf:odap:msgtype:lock-evidence-req-msg";
  }
  public async CheckValidtransferCommenceRequest(
    req: TransferCommenceMessage,
  ): Promise<boolean> {
    return req.MessageType == "urn:ietf:odap:msgtype:transfer-commence-msg";
  }
  public async CheckValidInitializationRequest(
    req: InitializationRequestMessage,
  ): Promise<boolean> {
    return req.Version == "0.0.0";
  }
}
