export * from "./generated/openapi/typescript-axios/index";

import { IPluginFactoryOptions } from "@hyperledger/cactus-core-api";

import { PluginFactoryKeychain } from "./plugin-factory-keychain";
export { PluginFactoryKeychain } from "./plugin-factory-keychain";

export {
  IPluginKeychainAzureKvOptions,
  PluginKeychainAzureKv,
  AzureCredentialType,
} from "./plugin-keychain-azure-kv";

export async function createPluginFactory(
  pluginFactoryOptions: IPluginFactoryOptions,
): Promise<PluginFactoryKeychain> {
  return new PluginFactoryKeychain(pluginFactoryOptions);
}
