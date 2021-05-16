#!/bin/bash
#
# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
#

# This script is designed to be run in the cli container as the
# first step of the EYFN tutorial.  It creates and submits a
# configuration transaction to add ${ORG_NAME} to the test network
#



#### config functions

# import utils
#. scripts/envVarOrgX.sh

# fetchChannelConfig <org> <channel_id> <output_json>
# Writes the current channel config for a given channel to a JSON file
# NOTE: this must be run in a CLIUSING_ORG container since it requires configtxlator 
fetchChannelConfig() {
  ORG=$1
  CHANNEL=$2
  OUTPUT=$3

  setGlobals $ORG


  peer channel fetch config config_block_${ORG_NAME}.pb -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com -c $CHANNEL --tls --cafile "$ORDERER_CA"
  { set +x; } 2>/dev/null

  echo "Decoding config block to JSON and isolating config to ${OUTPUT}"
  set -x
  configtxlator proto_decode --input config_block_${ORG_NAME}.pb --type common.Block | jq .data.data[0].payload.data.config >"${OUTPUT}"
  { set +x; } 2>/dev/null
}

# createConfigUpdate <channel_id> <original_config.json> <modified_config.json> <output.pb>
# Takes an original and modified config, and produces the config update tx
# which transitions between the two
# NOTE: this must be run in a CLI container since it requires configtxlator 
createConfigUpdate() {
  CHANNEL=$1
  ORIGINAL=$2
  MODIFIED=$3
  OUTPUT=$4

  set -x
  configtxlator proto_encode --input "${ORIGINAL}" --type common.Config >original_config.pb
  configtxlator proto_encode --input "${MODIFIED}" --type common.Config >modified_config.pb
  configtxlator compute_update --channel_id "${CHANNEL}" --original original_config.pb --updated modified_config.pb >config_update.pb
  configtxlator proto_decode --input config_update.pb --type common.ConfigUpdate >config_update.json
  echo '{"payload":{"header":{"channel_header":{"channel_id":"'$CHANNEL'", "type":2}},"data":{"config_update":'$(cat config_update.json)'}}}' | jq . >config_update_in_envelope.json
  configtxlator proto_encode --input config_update_in_envelope.json --type common.Envelope >"${OUTPUT}"
  { set +x; } 2>/dev/null
}

# signConfigtxAsPeerOrg <org> <configtx.pb>
# Set the peerOrg admin of an org and sign the config update
signConfigtxAsPeerOrg() {
  ORG=$1
  CONFIGTXFILE=$2
  setGlobals $ORG
  set -x
  peer channel signconfigtx -f "${CONFIGTXFILE}"
  { set +x; } 2>/dev/null
}


echo "======= ENTERING updateChannelConfig-orgX ========"

CHANNEL_NAME=${CHANNEL_NAME}
DELAY=${CLI_DELAY}
TIMEOUT=${CLI_TIMEOUT}
VERBOSE=${VERBOSE}
COUNTER=1
MAX_RETRY=${MAX_RETRY}
THIS_ORG_PATH=./organizations/peerOrganizations/${ORG_NAME}.example.com

# imports
. scripts/envVarOrgX.sh
#. scripts/configUpdateOrgX.sh

echo "Creating config transaction to add ${ORG_NAME} to network"
# Fetch the config for the channel, writing it to config_ORG_NAME.json
fetchChannelConfig 1 ${CHANNEL_NAME} ${THIS_ORG_PATH}/config_${ORG_NAME}.json


echo "Modify the configuration to append the new org"
set -x


ORG_MSPID=$ORG_MSPID
#jq -s '.[0] * {"create config channel_group":{"groups":{"Application":{"groups": {"'"$ORG_NAME"'":.[1]}}}}}'  $THIS_ORG_PATH/config_${ORG_NAME}.json $THIS_ORG_PATH/${ORG_NAME}.json > $THIS_ORG_PATH/modified_config_${ORG_NAME}.json
#was working / accepting; try default with org3
#jq -s '.[0] * {"channel_group":{"groups":{"Application":{"groups": {"Org3MSP":.[1]}}}}}' $THIS_ORG_PATH/config_${ORG_NAME}.json $THIS_ORG_PATH/${ORG_NAME}.json > $THIS_ORG_PATH/modified_config_${ORG_NAME}.json

jq -s '.[0] * {"channel_group":{"groups":{"Application":{"groups": {"'"$ORG_MSPID"'":.[1]}}}}}' $THIS_ORG_PATH/config_${ORG_NAME}.json $THIS_ORG_PATH/${ORG_NAME}.json > $THIS_ORG_PATH/modified_config_${ORG_NAME}.json

{ set +x; } 2>/dev/null


echo "Create config update"
# Compute a config update, based on the differences between config.json and modified_config.json, write it as a transaction to ${ORG_NAME}_update_in_envelope.pb
createConfigUpdate ${CHANNEL_NAME} $THIS_ORG_PATH/config_${ORG_NAME}.json $THIS_ORG_PATH/modified_config_${ORG_NAME}.json $THIS_ORG_PATH/${ORG_NAME}_update_in_envelope.pb


echo "Signing config transaction"
signConfigtxAsPeerOrg 1 $THIS_ORG_PATH/${ORG_NAME}_update_in_envelope.pb
localhost
echo "Submitting transaction from a different peer (peer0.org2) which also signs it"
set -x
setGlobals 2
peer channel update -f $THIS_ORG_PATH/${ORG_NAME}_update_in_envelope.pb -c ${CHANNEL_NAME} -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile "$ORDERER_CA"
{ set +x; } 2>/dev/null

echo "Config transaction to add ${ORG_NAME} to network submitted"