import {
  Logger,
  LogLevelDesc,
  LoggerProvider,
} from "@hyperledger/cactus-common";

import { Checks, IAsyncProvider } from "@hyperledger/cactus-common";
import { ConsortiumDatabase } from "@hyperledger/cactus-core-api";

import {
  DefaultApi as ConsortiumManualApi,
  GetConsortiumJwsResponse,
} from "@hyperledger/cactus-plugin-consortium-manual";

export interface IDefaultConsortiumProviderOptions {
  logLevel?: LogLevelDesc;
  apiClient: ConsortiumManualApi;
}

export class DefaultConsortiumProvider
  implements IAsyncProvider<ConsortiumDatabase> {
  public static readonly CLASS_NAME = "DefaultConsortiumProvider";

  private readonly log: Logger;

  public get className(): string {
    return DefaultConsortiumProvider.CLASS_NAME;
  }

  constructor(public readonly options: IDefaultConsortiumProviderOptions) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(options, `${fnTag} arg options`);

    const level = this.options.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });
  }

  parseConsortiumJws(response: GetConsortiumJwsResponse): ConsortiumDatabase {
    const fnTag = `DefaultConsortiumProvider#parseConsortiumJws()`;

    Checks.truthy(response, `${fnTag}::response`);
    Checks.truthy(response.jws, `${fnTag}::response.jws`);
    Checks.truthy(response.jws.payload, `${fnTag}::response.jws.payload`);

    const json = Buffer.from(response.jws.payload, "base64").toString();
    const body = JSON.parse(json);
    const {
      consortiumDatabase,
    }: { consortiumDatabase: ConsortiumDatabase } = body;

    Checks.truthy(consortiumDatabase, `${fnTag}::consortiumDatabase`);

    // FIXME Ideally there would be an option here to validate the JWS based on
    // all the signatures and the corresponding public keys (which the caller
    // would have to be able to supply).
    // We do not yet have this crypto functions available in a cross platform
    // manner so it is omitted for now but much needed prior to any GA release.
    return consortiumDatabase;
  }

  public async get(): Promise<ConsortiumDatabase> {
    try {
      const res = await this.options.apiClient.getConsortiumJwsV1();
      return this.parseConsortiumJws(res.data);
    } catch (ex) {
      const innerException = (ex.toJSON && ex.toJSON()) || ex;
      this.log.error(`Request for Consortium JWS failed: `, innerException);
      throw ex;
    }
  }
}
