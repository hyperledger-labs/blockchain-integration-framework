import { v4 as uuidv4 } from "uuid";

import { IPluginFactoryOptions } from "@hyperledger/cactus-core-api";
import { PluginFactory } from "@hyperledger/cactus-core-api";

import {
  IPluginSomethingSomehowOptions,
  PluginSomethingSomehow,
} from "./plugin-something-somehow";

export class PluginFactorySomething extends PluginFactory<
  PluginSomethingSomehow,
  IPluginSomethingSomehowOptions,
  IPluginFactoryOptions
> {
  async create(
    pluginOptions: IPluginSomethingSomehowOptions = {
      instanceId: uuidv4(),
      logLevel: "TRACE",
    },
  ): Promise<PluginSomethingSomehow> {
    return new PluginSomethingSomehow(pluginOptions);
  }
}
