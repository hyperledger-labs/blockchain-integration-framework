export * from "./generated/openapi/typescript-axios";

export {
  PluginLedgerConnectorQuorum,
  IPluginLedgerConnectorQuorumOptions,
} from "./plugin-ledger-connector-quorum";

export * from "./model-type-guards";

export { PluginFactoryLedgerConnector } from "./plugin-factory-ledger-connector";

import { IPluginFactoryOptions } from "@hyperledger/cactus-core-api";
import { PluginFactoryLedgerConnector } from "./plugin-factory-ledger-connector";

export async function createPluginFactory(
  pluginFactoryOptions: IPluginFactoryOptions,
): Promise<PluginFactoryLedgerConnector> {
  return new PluginFactoryLedgerConnector(pluginFactoryOptions);
}
