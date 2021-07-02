<!--
 Copyright 2019-2020 Fujitsu Laboratories Ltd.
 SPDX-License-Identifier: Apache-2.0

 README.md
-->
# Fabric-docker of validator for Hyperledger fabric

## Abstract
- Modules for the unit-test of validator for Hyperledger fabric

## a) clone the directories
	curl -sSL https://bit.ly/2ysbOFE | bash -s -- 1.4.0 1.4.0
Then, `fabric-samples` directory is made in the current directory, including `basic-network`, `bin`, `chaincode/fabcar`, and `fabcar`.

- c.f.: https://hyperledger-fabric.readthedocs.io/en/release-1.4/install.html
- If you are behind an proxy environment, use the command that `curl -x http://yourProxyURL:yourProxyPortNumber` instead of `curl`

## b) Initialization
### 1) Start

	cd fabcar
	./startFabric.sh

Ensure that the next containers are started.

	$ docker ps
	CONTAINER ID        IMAGE                                                                                                    COMMAND                  CREATED             STATUS              PORTS                                            NAMES
	ec8289e32f06        dev-peer0.org1.example.com-fabcar-1.0-5c906e402ed29f20260ae42283216aa75549c571e2e380f3615826365d8269ba   "chaincode -peer.add..."   2 hours ago         Up 2 hours                                                           dev-peer0.org1.example.com-fabcar-1.0
	a468d622234a        hyperledger/fabric-tools                                                                                 "/bin/bash"              2 hours ago         Up 2 hours                                                           cli
	80e28ca9fbcf        hyperledger/fabric-peer                                                                                  "peer node start"        2 hours ago         Up 2 hours          0.0.0.0:7051->7051/tcp, 0.0.0.0:7053->7053/tcp   peer0.org1.example.com
	8391db445423        hyperledger/fabric-ca                                                                                    "sh -c 'fabric-ca-se..."   2 hours ago         Up 2 hours          0.0.0.0:7054->7054/tcp                           ca.example.com
	3a06daddc298        hyperledger/fabric-orderer                                                                               "orderer"                2 hours ago         Up 2 hours          0.0.0.0:7050->7050/tcp                           orderer.example.com
	b722f3d14f6e        hyperledger/fabric-couchdb                                                                               "tini -- /docker-ent..."   2 hours ago         Up 2 hours          4369/tcp, 9100/tcp, 0.0.0.0:5984->5984/tcp       couchdb

### 2) Registering an administrator user and general users

Change to the following directory:

	$ cd (installation path)/fabcar/javascript

Install the modules

	$ npm install

Execute the following script to register the administrator user and general users

	$ node enrollAdmin.js
	$ node registerUser.js

Verify that the user's private key information (i.e. `wallet`) has been generated.

	$ cd (installation path)/fabcar/javascript/wallet

	$ ls -la
	Total 0
	drwxrwxr-x. 4 XXXX XXXX  48  X X XX:XX .
	drwxrwxr-x. 4 XXXX XXXX 243  X X XX:XX ..
	drwxrwxr-x. 2 XXXX XXXX 249  X X XX:XX admin
	drwxrwxr-x. 2 XXXX XXXX 172  X X XX:XX user1

### 3) Creating and unpacking `wallet.tar`, which is required by Validator and Driver

Copy user's private key information (`wallet`) for use with Validator and Driver.

	$ cd (installation path)/fabcar/javascript/
	$ tar cvf wallet.tar wallet

Copy and extract wallet.tar to the following target directory:

[Target Directory]

- /packages/ledger-plugin/fabric/validator/src/dependent/
- /packages/ledger-plugin/fabric/validator/unit-test/

[Deployment Method]

	$ tar xvf wallet.tar

