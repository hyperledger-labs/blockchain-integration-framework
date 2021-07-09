import { NodeCount } from "./response.type";

import {
  totalTxCount,
  K_CACTUS_CONSORTIUM_MANUAL_TOTAL_NODE_COUNT,
} from "./metrics";

export async function collectMetrics(nodeCount: NodeCount): Promise<void> {
  totalTxCount
    .labels(K_CACTUS_CONSORTIUM_MANUAL_TOTAL_NODE_COUNT)
    .set(nodeCount.counter);
}
