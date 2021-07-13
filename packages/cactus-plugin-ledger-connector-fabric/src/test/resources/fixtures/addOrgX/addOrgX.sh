#!/bin/bash
#
# Copyright IBM Corp All Rights Reserved
#
# SPDX-License-Identifier: Apache-2.0
#
# Adapted from fabric-samples, Hyperledger

# This script extends the Hyperledger Fabric test network by adding
# adding an organization to the network
#

set -ex

# Create Organziation crypto material using cryptogen or CAs
function generateOrgX() {
  # Create crypto material using cryptogen
  if [ "$CA" == "false" ]; then
    which cryptogen
    if [ "$?" -ne 0 ]; then
      fatalln "cryptogen tool not found. exiting"
    fi
  echo "Generating certificates using cryptogen tool"

    echo "Creating ${ORG_NAME} Identities"

    set -x
    cryptogen generate --config=${ORG_NAME}-crypto.yaml --output="./organizations"
    res=$?
    { set +x; } 2>/dev/null
    if [ $res -ne 0 ]; then
      fatalln "Failed to generate certificates..."
    fi

  fi

  # Create crypto material using Fabric CA
  if [ "$CRYPTO" == "true" ]; then

    #TODO implement CA support feature
    echo "CA not supported"
    exit 1

    fabric-ca-client version > /dev/null 2>&1
    if [[ $? -ne 0 ]]; then
      echo "ERROR! fabric-ca-client binary not found.."
      echo
      echo "Follow the instructions in the Fabric docs to install the Fabric Binaries:"
      echo "https://hyperledger-fabric.readthedocs.io/en/latest/install.html"
      exit 1
    fi

    echo "Generating certificates using Fabric CA"
    docker-compose -f $COMPOSE_FILE_CA up -d 2>&1

    . fabric-ca/registerEnroll.sh
    sleep 10

    echo "Creating ${ORG_NAME} Identities"
    createOrgX

  fi


  echo "Generating CCP files for ${ORG_NAME}"
  ./ccp-generate-orgX.sh

}

# Generate channel configuration transaction
function generateOrgXDefinition() {
  which configtxgen
  if [ "$?" -ne 0 ]; then
    fatalln "configtxgen tool not found. exiting"
  fi
  echo "Generating ${ORG_NAME} organization definition"
  export FABRIC_CFG_PATH=$PWD
  set -x
  #configtxgen -printOrg ${ORG_MSPID} -configPath ${CONFIG_TX_GEN_PATH}  > ../fabric-samples/test-network/organizations/peerOrganizations/${ORG_NAME}.example.com/${ORG_NAME}.json

  configtxgen -printOrg ${ORG_MSPID} -configPath ${CONFIG_TX_GEN_PATH}  > organizations/peerOrganizations/${ORG_NAME}.example.com/${ORG_NAME}.json
  res=$?
  { set +x; } 2>/dev/null
  if [ $res -ne 0 ]; then
    fatalln "Failed to generate ${ORG_NAME} organization definition..."
  fi
}

function OrgXUp () {
  # start org3 nodes
  if [ "${DATABASE}" == "couchdb" ]; then
      echo "Starting $COMPOSE_FILE and $COMPOSE_FILE_COUCH"
      #-p cactusfabrictestnetwork_test  
    docker-compose -p cactusfabrictestnetwork -f $COMPOSE_FILE -f $COMPOSE_FILE_COUCH  up -d  2>&1
  else
  #-p cactusfabrictestnetwork_test 
    echo "Starting $COMPOSE_FILE" 
    docker-compose -p cactusfabrictestnetwork -f $COMPOSE_FILE up -d 2>&1
  fi
  if [ $? -ne 0 ]; then
    fatalln "ERROR !!!! Unable to start ${ORG_NAME} network"
  fi
}

function preReqs ()  {
  
  echo "Setting /etc/hosts"
  echo "localhost orderer.example.com" >> /etc/hosts
  echo "127.0.0.1 orderer.example.com" >> /etc/hosts
  echo 127.0.0.1 peer0.${ORG_NAME}.example.com >> /etc/hosts
  echo 127.0.0.1 ${ORG_NAME}.example.com >> /etc/hosts
  cat /etc/hosts
}

# Generate the needed certificates, the genesis block and start the network.
function addOrgX () {
    # RB: Assumption - there is a channel created and running
    # RB: Always generates artifacts, even if they exist already

    echo "Generating ${ORG_NAME} crypto material"
    generateOrgX

    echo "Copying existing crypto material to current folder"
    cp -r /fabric-samples/test-network/organizations ./


    generateOrgXDefinition

    echo "Copying ${ORG_NAME} crypto material to current folder"
    cp -r /fabric-samples/test-network/organizations ./
  echo "Bringing up ${ORG_NAME} peer"
  
  ##todo uncomment
  OrgXUp
  
  echo "Generating and submitting config tx to add ${ORG_NAME}"
  ./scripts/org3-scripts/updateChannelConfigOrgX.sh 
  if [ $? -ne 0 ]; then
    fatalln "ERROR !!!! Unable to create config tx"
  fi

  echo "Joining ${ORG_NAME} peers to network"
 ./scripts/org3-scripts/joinChannelOrgX.sh $CHANNEL_NAME $CLI_DELAY $CLI_TIMEOUT $VERBOSE
  if [ $? -ne 0 ]; then
    fatalln "ERROR !!!! Unable to join ${ORG_NAME} peers to network"
  fi

  echo "Completed adding ${ORG_NAME}"
  exit 0
}



# Parse commandline args

## Parse mode
if [[ $# -lt 1 ]] ; then
  echo "Wrong command"
  exit 0
else
  MODE=$1
  shift
fi

# parse flags

while [[ $# -ge 1 ]] ; do
  key="$1"
  case $key in
  -h )
    printHelp
    exit 0
    ;;
  -c )
    CHANNEL_NAME="$2"
    shift
    ;;
  -ca )
    CRYPTO="Certificate Authorities"
    echo "Using CA"
    ;;
  -t )
    CLI_TIMEOUT="$2"
    shift
    ;;
  -d )
    CLI_DELAY="$2"
    shift
    ;;
  -s )
    DATABASE="$2"
    shift
    ;;
  -verbose )
    VERBOSE=true
    shift
    ;;
  * )
    errorln "Unknown flag: $key"
    printHelp
    exit 1
    ;;
  esac
  shift
done


# Determine whether starting, stopping, restarting or generating for announce
if [ "$MODE" == "up" ]; then
  echo "PRINTING ENV VARS: ORG_NAME: ${ORG_NAME} | "
  echo "Adding ${ORG_NAME}, from MSPID ${ORG_MSPID} to channel '${CHANNEL_NAME}' with '${CLI_TIMEOUT}' seconds and CLI delay of '${CLI_DELAY}' seconds and using database '${DATABASE}'"
  
elif [ "$MODE" == "down" ]; then
  EXPMODE="Stopping network"
elif [ "$MODE" == "generate" ]; then
  EXPMODE="Generating certs and organization definition for Org3"
else
  printHelp
  exit 1
fi

#Create the network using docker compose
if [ "${MODE}" == "up" ]; then
  preReqs
  addOrgX
elif [ "${MODE}" == "generate" ]; then ## Generate Artifacts
  generateOrg3
  generateOrg3Definition
else
  echo "Invalid mode"
  printHelp
  exit 1
fi
