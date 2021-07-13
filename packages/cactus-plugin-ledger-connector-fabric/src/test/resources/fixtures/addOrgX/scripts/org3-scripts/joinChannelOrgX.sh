#!/bin/bash
#
# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
#

# This script is designed to be run in the cli container as the
# second step of the EYFN tutorial. It joins the org3 peers to the
# channel previously setup in the BYFN tutorial and install the
# chaincode as version 2.0 on peer0.org3.
#
echo "======= ENTERING joinChannel-orgX ========"

CHANNEL_NAME="$1"
DELAY="$2"
TIMEOUT="$3"
VERBOSE="$4"
COUNTER=1
MAX_RETRY=$MAX_RETRY

# import environment variables
. scripts/envVarOrgX.sh

# joinChannel ORG
joinChannel() {
  ORG=$1
  local rc=1
  local COUNTER=1
  ## Sometimes Join takes time, hence retry
  while [ $rc -ne 0 -a $COUNTER -lt $MAX_RETRY ] ; do
    sleep $DELAY
    set -x
    peer channel join -b $BLOCKFILE --certfile $CORE_PEER_TLS_ROOTCERT_FILE >&log.txt 
    res=$?
    { set +x; } 2>/dev/null
    let rc=$res
    COUNTER=$(expr $COUNTER + 1)
	done
	cat log.txt
	verifyResult $res "After $MAX_RETRY attempts, ${ORG_NAME} has failed to join channel '$CHANNEL_NAME' "
}

setAnchorPeer() {
  ORG=$1
  scripts/setAnchorPeerOrgX.sh $ORG $CHANNEL_NAME
}

setGlobalsCLI ${ORG_NAME}
BLOCKFILE="${CHANNEL_NAME}.block"

echo "Fetching channel config block from orderer..."
set -x
peer channel fetch 0 $BLOCKFILE -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com -c $CHANNEL_NAME --tls --cafile "$ORDERER_CA" >&log.txt
res=$?
{ set +x; } 2>/dev/null
cat log.txt
verifyResult $res "Fetching co didn't provnfig block from orderer has failed"

echo "Joining ${ORG_NAME} peer to the channel..."
joinChannel ${ORG_NAME}

echo "Setting anchor peer for ${ORG_NAME}..."
setAnchorPeer ${ORG_NAME}

echo "Channel '$CHANNEL_NAME' joined"
echo "${ORG_NAME} peer successfully added to network"