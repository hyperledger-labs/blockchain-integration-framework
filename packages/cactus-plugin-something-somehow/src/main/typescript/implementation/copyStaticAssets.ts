/*
 * Copyright 2020-2021 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * copyStaticAssets.ts
 */

import * as shell from 'shelljs';

// NOTE: Copy the static assets to the dist folder.
//      Example:
//        shell.cp('-R', 'src/routing-interface/views', 'dist/routing-interface/views/');
shell.cp('-R', 'ledger-plugin/validatorKey/', '../dist/packages/ledger-plugin/');
shell.cp('-R', 'config/default.json', '../dist/packages/config/');
shell.cp('-R', 'config/verifier-config.json', '../dist/packages/config/');
shell.cp('-R', 'config/contractInfo.json', '../dist/packages/config/');
shell.cp('-R', 'config/usersetting.json', '../dist/packages/config/');
shell.cp('-R', 'config/validator-registry.json', '../dist/packages/config/');
