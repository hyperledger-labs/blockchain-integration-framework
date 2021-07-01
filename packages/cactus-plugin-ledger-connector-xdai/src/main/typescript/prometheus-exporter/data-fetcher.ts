import { Transactions } from "./response.type";

import { totalTxCount, K_CACTUS_XDAI_TOTAL_TX_COUNT } from "./metrics";

export async function collectMetrics(
  transactions: Transactions,
): Promise<void> {
  transactions.counter++;
  totalTxCount.labels(K_CACTUS_XDAI_TOTAL_TX_COUNT).set(transactions.counter);
}
