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
  IPluginKeychainAzureKvOptions,
  PluginKeychainAzureKv,
} from "./plugin-keychain-azure-kv";

import { PluginKeychainAzureKvRemoteAdapter } from "./plugin-keychain-azure-kv-remote-adapter";

export class PluginFactoryKeychain extends PluginFactory<
  IPluginKeychain,
  IPluginKeychainAzureKvOptions,
  IPluginFactoryOptions
> {
  async create(options: any): Promise<IPluginKeychain> {
    const fnTag = "PluginFactoryKeychain#create()";

    const { pluginImportType } = this.options;
    Checks.truthy(options, `${fnTag}:options`);

    switch (pluginImportType) {
      case PluginImportType.Local: {
        return new PluginKeychainAzureKv(options);
      }
      case PluginImportType.Remote: {
        const { remoteConfig } = options;
        Checks.truthy(remoteConfig, `${fnTag}:options.remoteConfig`);
        Checks.truthy(remoteConfig.basePath, `${fnTag}:remoteConfig.basePath`);
        const configuration: Configuration = options.remoteConfig;
        const backend = new DefaultApi(configuration);
        const optionsDecorated = { ...options, backend };
        return new PluginKeychainAzureKvRemoteAdapter(optionsDecorated);
      }
      default: {
        throw new Error(`${fnTag} No PluginImportType: ${pluginImportType}`);
      }
    }
  }
}
