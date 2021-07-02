# Copyright 2021 Hyperledger Cactus Contributors
# SPDX-License-Identifier: Apache-2.0
## Build a validator for Sawtooth
echo "[process] Build a validator for Sawtooth"
npm install
npm run build
npm run init-sawtooth # For making symbolic for node_modules, enough to be done only once.