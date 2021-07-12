export * from "./generated/openapi/typescript-axios/index";
export { IIpfsHttpClient } from "./i-ipfs-http-client";
import { IPluginFactoryOptions } from "@hyperledger/cactus-core-api";
export {
  PluginObjectStoreIpfs,
  IPluginObjectStoreIpfsOptions,
} from "./plugin-object-store-ipfs";
export { PluginFactoryObjectStore } from "./plugin-factory-object-store";

import { PluginFactoryObjectStore } from "./plugin-factory-object-store";

export async function createPluginFactory(
  pluginFactoryOptions: IPluginFactoryOptions,
): Promise<PluginFactoryObjectStore> {
  return new PluginFactoryObjectStore(pluginFactoryOptions);
}
