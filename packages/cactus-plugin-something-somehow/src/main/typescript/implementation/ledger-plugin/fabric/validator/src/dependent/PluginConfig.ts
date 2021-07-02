/*
 * Copyright 2021 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * PluginConfig.js
 */

/*
  * Summary:
  * Coordination server connection destination dependent part setting file
  * Definition value specific to the connection destination dependent part
 */

export const SplugConfig = {
    "fabric":{
        "mspid": "Org1MSP",
        "keystore":"./wallet/admin",
        "connUserName":"user1",
        "contractName":"fabcar",
        "peers":[ 
          {
            "name":"peer0.org1.example.com",
            "requests": "grpc://localhost:7051",
          }
        ],

        "orderer":{
            "name":"orderer.example.com",
            "url":"grpc://localhost:7050",
        },
        "ca":{
            "name":"ca.example.com",
            "url":"http://localhost:7054"
        },
        "submitter":{
            "name":"admin",
            "secret":"adminpw"
        },
        "channelName":"mychannel",
        //"chaincodeId":"easy_sample_ec1"
        "chaincodeId":"fabcar"
     }
};
