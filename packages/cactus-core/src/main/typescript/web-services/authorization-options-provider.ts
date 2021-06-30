import {
  Logger,
  Checks,
  LogLevelDesc,
  LoggerProvider,
} from "@hyperledger/cactus-common";

import { IAsyncProvider } from "@hyperledger/cactus-common";
import {
  IEndpointAuthzOptions,
  isIEndpointAuthzOptions,
} from "@hyperledger/cactus-core-api";

export interface IEndpointAuthzOptionsProviderOptions {
  logLevel?: LogLevelDesc;
  authorizationOptions: IEndpointAuthzOptions;
}

export class AuthorizationOptionsProvider
  implements IAsyncProvider<IEndpointAuthzOptions> {
  public static readonly CLASS_NAME = "AuthorizationOptionsProvider";

  private readonly authorizationOptions: IEndpointAuthzOptions;
  private readonly log: Logger;

  public static of(
    authorizationOptions: IEndpointAuthzOptions,
    logLevel?: LogLevelDesc,
  ): AuthorizationOptionsProvider {
    return new AuthorizationOptionsProvider({
      logLevel,
      authorizationOptions,
    });
  }

  public get className(): string {
    return AuthorizationOptionsProvider.CLASS_NAME;
  }

  constructor(public readonly options: IEndpointAuthzOptionsProviderOptions) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(options, `${fnTag} arg options`);

    this.authorizationOptions = options.authorizationOptions;
    Checks.truthy(
      isIEndpointAuthzOptions(this.authorizationOptions),
      `${fnTag} authorizationOptions invalid format`,
    );

    const level = this.options.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });
    this.log.debug(`Created instance of ${this.className} OK`);
  }

  async get(): Promise<IEndpointAuthzOptions> {
    return this.authorizationOptions;
  }
}
