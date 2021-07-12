import { Checks } from "@hyperledger/cactus-common";
import {
  IPluginFactoryOptions,
  IPluginKeychain,
  PluginFactory,
  PluginImportType,
} from "@hyperledger/cactus-core-api";
import {
  Configuration,
  DefaultApi,
} from "./generated/openapi/typescript-axios";

import {
  IPluginKeychainAwsSmOptions,
  PluginKeychainAwsSm,
} from "./plugin-keychain-aws-sm";

import { PluginKeychainAwsSmRemoteAdapter } from "./plugin-keychain-aws-sm-remote-adapter";

export class PluginFactoryKeychain extends PluginFactory<
  IPluginKeychain,
  IPluginKeychainAwsSmOptions,
  IPluginFactoryOptions
> {
  async create(options: any): Promise<IPluginKeychain> {
    const fnTag = "PluginFactoryKeychain#create()";

    const { pluginImportType } = this.options;
    Checks.truthy(options, `${fnTag}:options`);

    switch (pluginImportType) {
      case PluginImportType.Local: {
        return new PluginKeychainAwsSm(options);
      }
      case PluginImportType.Remote: {
        const { remoteConfig } = options;
        Checks.truthy(remoteConfig, `${fnTag}:options.remoteConfig`);
        Checks.truthy(remoteConfig.basePath, `${fnTag}:remoteConfig.basePath`);
        const configuration: Configuration = options.remoteConfig;
        const backend = new DefaultApi(configuration);
        const optionsDecorated = { ...options, backend };
        return new PluginKeychainAwsSmRemoteAdapter(optionsDecorated);
      }
      default: {
        throw new Error(`${fnTag} No PluginImportType: ${pluginImportType}`);
      }
    }
  }
}
