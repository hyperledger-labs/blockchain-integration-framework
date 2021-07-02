<!--
 Copyright 2019-2020 Fujitsu Laboratories Ltd.
 SPDX-License-Identifier: Apache-2.0

 README.md
-->
# Validator Driver for Go-Ethereum

## Assumption
- Validator1 (for Ethereum) is running
- geth1(geth-docker) is running
- Specify the validator URL to connect to with "validatorUrl" in "config/default.js"

## a) Get balance
### Target source: validatorDriver_getNumericBalance.js

1) Specify the parameters in the target source

 - referedAddress: Account ID to be displayed

2) Run
<pre>
node validatorDriver_getNumericBalance.js 
</pre>

## b) Asset transfer
### Target source: validatorDriver_transferNumericAsset.js

1) Specify the parameters in the target source

 - fromAddress: Transfer source account ID 
 - toAddress: Destination account ID
 - amount: the value of the asset to be transferred

2) Run
<pre>
node validatorDriver_transferNumericAsset.js 
</pre>

## c) Raw Transaction execution (Asset transfer)
### Target source: validatorDriver_sendRawTransaction.js

1) Specify the parameters in the target source

 - fromAddress: Transfer source account ID 
 - fromAddressPkey: private key of Transfer source account 
 - toAddress: Destination account ID
 - amount: the value of the asset to be transferred

2) Run
<pre>
node validatorDriver_sendRawTransaction.js 
</pre>


**NOTE**

* You can check the balance with "validatorDriver_getNumericBalance.js".
