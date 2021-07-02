<!--
 Copyright 2019-2020 Fujitsu Laboratories Ltd.
 SPDX-License-Identifier: Apache-2.0

 README.md
-->
# geth-docker

## Explanation
- "geth-docker" is a module required to run "Validator"
- Immediately after applying -geth-docker, it is necessary to perform "a) initialization"
- How to start/stop will be explained follow

## a) Initialization
### 1) Account creation
<pre>
./init-account.sh
</pre>

Please keep in your memo the addresses (ec1-accounts[0],[1],..,[4] and ec2-accounts[0],[1],..,[4]),

* Sample output
<pre>
 make-account-ec1-accounts[0]
 Creating network "ecenv_default" with the default driver
 INFO [05-29|08:33:35.658] Maximum peer count                       ETH=25 LES=0 total=25
 Address: {782646267c64d536983a64af9d9a5ab80e036989}
 
 make-account-ec1-accounts[1]
 INFO [05-29|08:33:42.143] Maximum peer count                       ETH=25 LES=0 total=25
 Address: {38f6d41b35d1af26865a0c13d41e8aa342e62e61}
 
 make-account-ec1-accounts[2]
 INFO [05-29|08:33:48.534] Maximum peer count                       ETH=25 LES=0 total=25
 Address: {895b383457a714e051357dfc36bb3b6ddf84f01f}
 
 make-account-ec1-accounts[3]
 INFO [05-29|08:33:54.731] Maximum peer count                       ETH=25 LES=0 total=25
 Address: {caf99b30857e0d29cd866e27fb39b2e7d2b2dc17}
 
 make-account-ec1-accounts[4]
 INFO [05-29|08:34:01.282] Maximum peer count                       ETH=25 LES=0 total=25
 Address: {1b75166f65a852216306af320783e4b22986d3e3}
 
 make-account-ec2-accounts[0]
 INFO [05-29|08:34:08.021] Maximum peer count                       ETH=25 LES=0 total=25
 Address: {8f2244f75a4c53684c5827ec19615dc89c2ad21c}
 
 make-account-ec2-accounts[1]
 INFO [05-29|08:34:14.414] Maximum peer count                       ETH=25 LES=0 total=25
 Address: {add19019ee1ea604b3fcb55a11b97d0fc81cc221}
 
 make-account-ec2-accounts[2]
 INFO [05-29|08:34:21.292] Maximum peer count                       ETH=25 LES=0 total=25
 Address: {ab66982e4eb732f0e17c56586e530f94ee9411ce}
 
 make-account-ec2-accounts[3]
 INFO [05-29|08:34:27.947] Maximum peer count                       ETH=25 LES=0 total=25
 Address: {4809b6329ef15bcd1b5b730e0f148ae751cfd9f6}
 
 make-account-ec2-accounts[4]
 INFO [05-29|08:34:34.360] Maximum peer count                       ETH=25 LES=0 total=25
 Address: {421c9db39b64575c511f94990acfd4394dd5f1c3}
</pre>

### 2) Editing initial block information
* Change the "ADDRESS" in genesis/genesis-ec1.json(and genesis-ec2.json) to the address for ec1-accounts[0].

 * Specify ec1-accounts [0] account for "genesis / genesis-ec1.json"
 * Specify ec2-accounts [0] account for "genesis / genesis-ec2.json"

* Sample output

<pre>
 "alloc"      : {
 	"ADDRESS":
 	{"balance":"100000000000000000000000000"}
 },
                  |
                  v
 "alloc"      : {
 	"782646267c64d536983a64af9d9a5ab80e036989":
 	{"balance":"100000000000000000000000000"}
 },
</pre>

### 3) Initializing end-chains:
<pre>
./init-chain.sh
</pre>

## b) Launching geth-containers
<pre>
./up.sh
</pre>


## c) Stop geth-containers
<pre>
./down.sh
</pre>

