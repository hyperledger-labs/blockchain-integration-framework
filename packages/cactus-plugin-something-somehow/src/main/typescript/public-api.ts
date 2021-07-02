import { IPluginFactoryOptions } from "@hyperledger/cactus-core-api";
import { PluginFactorySomething } from "./plugin-factory-something";

export async function createPluginFactory(
  pluginFactoryOptions: IPluginFactoryOptions,
): Promise<PluginFactorySomething> {
  return new PluginFactorySomething(pluginFactoryOptions);
}

export { PluginFactorySomething } from "./plugin-factory-something";
export {
  IPluginSomethingSomehowOptions,
  PluginSomethingSomehow,
} from "./plugin-something-somehow";
