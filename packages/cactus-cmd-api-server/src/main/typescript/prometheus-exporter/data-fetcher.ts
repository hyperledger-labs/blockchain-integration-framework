import { TotalPluginImports } from "./response.type";

import {
  totalTxCount,
  K_CACTUS_API_SERVER_TOTAL_PLUGIN_IMPORTS,
} from "./metrics";

export async function collectMetrics(
  totalPluginImports: TotalPluginImports,
): Promise<void> {
  totalTxCount
    .labels(K_CACTUS_API_SERVER_TOTAL_PLUGIN_IMPORTS)
    .set(totalPluginImports.counter);
}
