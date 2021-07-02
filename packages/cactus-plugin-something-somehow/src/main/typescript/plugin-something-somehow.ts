import {
  Logger,
  Checks,
  LogLevelDesc,
  LoggerProvider,
} from "@hyperledger/cactus-common";
import {
  ICactusPluginOptions,
  PluginAspect,
  IWebServiceEndpoint,
} from "@hyperledger/cactus-core-api";

export interface IPluginSomethingSomehowOptions extends ICactusPluginOptions {
  logLevel?: LogLevelDesc;
}

export class PluginSomethingSomehow {
  public static readonly CLASS_NAME = "PluginSomethingSomehow";

  private readonly log: Logger;
  private readonly instanceId: string;

  public get className(): string {
    return PluginSomethingSomehow.CLASS_NAME;
  }

  constructor(public readonly opts: IPluginSomethingSomehowOptions) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(opts, `${fnTag} arg options`);

    const level = this.opts.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });

    this.instanceId = this.opts.instanceId;

    this.log.info(`Created ${this.className}.`);
  }

  public async getOrCreateWebServices(): Promise<IWebServiceEndpoint[]> {
    const { log } = this;

    log.info(`Installing web services for plugin ${this.getPackageName()}...`);

    const endpoints: IWebServiceEndpoint[] = [];
    const pkg = this.getPackageName();
    log.info(`Installed web services for plugin ${pkg} OK`, { endpoints });
    return endpoints;
  }

  public getInstanceId(): string {
    return this.instanceId;
  }

  public getPackageName(): string {
    return `@hyperledger/cactus-plugin-something-somehow`;
  }

  public getAspect(): PluginAspect {
    return "Something" as PluginAspect;
  }
}
