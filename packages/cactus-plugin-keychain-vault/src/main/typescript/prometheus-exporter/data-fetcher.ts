import { VaultKeys } from "./response.type";

import {
  totalKeyCount,
  K_CACTUS_KEYCHAIN_VAULT_MANAGED_KEY_COUNT,
} from "./metrics";

export async function collectMetrics(vaultKeys: VaultKeys): Promise<void> {
  totalKeyCount
    .labels(K_CACTUS_KEYCHAIN_VAULT_MANAGED_KEY_COUNT)
    .set(vaultKeys.size);
}
