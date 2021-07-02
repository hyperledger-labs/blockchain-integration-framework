# Copyright 2020-2021 Hyperledger Cactus Contributors
# SPDX-License-Identifier: Apache-2.0

## Build a validator for Fabric
echo "[process] Build a validator for Fabric"
npm install
npm run build
npm run init-fabric # For making symbolic for node_modules, enough to be done only once.