# 3. Example Use Cases

Specific use cases that we intend to support.
The core idea is to support as many use-cases as possible by enabling interoperability
between a large variety of ledgers specific to certain mainstream or exotic use cases.


The following table summarizes the use cases that will be explained in more detail in the following sections. FA, NFA, and D denote a fungible asset, a non-fungible asset, and data, respectively.





<table>
  <tr>
    <th rowspan="3">Object type of Blockchain A</th> <th rowspan="3">Object type of Blockchain B</th><th colspan="2" rowspan="2">Ledger transfer</th><th rowspan="3">Atomic swap</th><th colspan="2" rowspan="2">Ledger interaction</th><th rowspan="3">Ledger entry point coordination</th>
  </tr>

  <tr>
</tr>

<tr><td>One-way</td><td>Two-way</td><td>One-way</td><td>Two-way</td>
  </tr>

 <tr> <td> D</td> <td >D</td><td><a href="#35-healthcare-data-sharing-with-access-control-lists">3.5</a><br><a href="#38-blockchain-migration">3.8</a></td><td><a href="#35-healthcare-data-sharing-with-access-control-lists" >3.5</a><br><a href="#36-integrate-existing-food-traceability-solutions">3.6</a></td><td>-</td><td>-</td><td>-</td><td rowspan="12"><a href="#37-end-user-wallet-authenticationauthorization"  >3.7</a></td>
  </tr>

 <tr> <td>FA</td><td >FA</td><td><a href="#31-ethereum-to-quorum-asset-transfer">3.1</a></td><td><a href="#34-stable-coin-pegged-to-other-currency">3.4</a></td><td><a href="#33-money-exchanges">3.3</a></td><td><a href="#33-money-exchanges">3.3</a></td><td><a href="#33-money-exchanges">3.3</a></td>
  </tr>

 <tr> <td>NFA</td><td>NFA</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td>
  </tr>

 <tr> <td>FA</td><td>D</td><td>-</td><td rowspan="3">-</td><td rowspan="3"><a href="#32-escrowed-sale-of-data-for-coins">3.2</a></td><td>-</td><td rowspan="3">-</td>
</tr>

<tr>
 </tr>

 <tr> <td>D</td><td>FA</td><td>-</td><td>-</td>
  </tr>

 <tr><td>NFA</td><td>D</td><td>-</td><td rowspan="3">-</td><td rowspan="3">-</td><td >-</td><td rowspan="3">-</td>
  </tr>

 <tr>
 </tr>

 <tr> <td>D</td><td>NFA</td><td>-</td><td>-</td>
  </tr>

 <tr><td>FA</td><td>NFA</td><td>-</td><td rowspan="3">-</td><td rowspan="3">-</td><td>-</td><td rowspan="3">-</td>
</tr>

<tr>
 </tr>

 <tr><td>NFA</td><td>FA</td><td>-</td><td>-</td>
  </tr>

</table>



## 3.1 Ethereum to Quorum Asset Transfer

| Use Case Attribute Name    | Use Case Attribute Value                                                                                                                                                                                                                                                                                                                                                                                                                         |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Use Case Title             | Ethereum to Quorum Escrowed Asset Transfer                                                                                                                                                                                                                                                                                                                                                                                                                |
| Use Case                   | 1. `User A` owns some assets on a Ethereum ledger<br>2. `User A` asks `Exchanger` to exchange specified amount of assets on Ethereum ledger, and receives exchanged asset at the Quorum ledger.
| Interworking patterns      | Value transfer                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Type of Social Interaction | Escrowed Asset Transfer                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Narrative                  | A person (`User A`) has multiple accounts on different ledgers (Ethereum, Quorum) and he wishes to send some assets from Ethereum ledger to a Quorum ledger with considering conversion rate. The sent asset on Ethereum will be received by Exchanger only when he successfully received converted asset on Quorum ledger. |
| Actors                     | 1. `User A`: The person or entity who has ownership of the assets asscociated with its accounts on ledger.                                                                                                                                                                                                                                                                                                                                                                    |
| Goals of Actors            | `User A` loses ownership of sent assets on Ethereum, but he will get ownnership of exchanged asset value on Quorum.                                                                                                                                                                                                                                                                                                                                                                                   |
| Success Scenario           | Transfer succeeds without issues. Asset is available on both Ethereum and Quorum ledgers.                                                                                                                                                                                                                                                                                                                                                        |
| Success Criteria           | Transfer asset on Quorum was successed.                                                                                                                                                                                                                                                                                                                                                |
| Failure Criteria           | Transfer asset on Quorum was failed.                                                                                                                                                                                                                                                                                                                                                                                                       |
| Prerequisites              | 1. Ledgers are provisioned<br>2. `User A` and `Exchanger` identities established on both ledgers<br>3. `Exchanger` authorized business logic plugin to operate the account on Quorum ledger.<br>4.`User A` has access to Hyperledger Cactus deployment                                                                                                                                                                                                                                                                                                               |
| Comments                   |                                                                                                                                                                                                                                                                                                                                                                                                                                                  |

<div style="page-break-after: always; visibility: hidden"><!-- \pagebreak --></div>
<img src="./use-case-ethereum-to-quorum-asset-transfer.png" width="700">

<div style="page-break-after: always; visibility: hidden"><!-- \pagebreak --></div>

## 3.2 Escrowed Sale of Data for Coins


| W3C Use Case Attribute Name | W3C Use Case Attribute Value |
|-----------------------------|------------------------------------------------|
| Use Case Title              | Escrowed Sale of Data for Coins |
| Use Case                    | 1. `User A` initiates (proposes) an escrowed transaction with `User B`<br>2. `User A` places funds, `User B` places the data to a digital escrow service.<br>3. They both observe each other's input to the escrow service and decide to proceed.<br>4. Escrow service releases the funds and the data to the parties in the exchange. |
| Type of Social Interaction  | Peer to Peer Exchange |
| Narrative                   | Data in this context is any series of bits stored on a computer:<br> * Machine learning model<br> * ad-tech database<br> * digital/digitized art<br> * proprietary source code or binaries of software<br> * etc.<br><br>`User A` and B trade the data and the funds through a Hyperledger Cactus transaction in an atomic swap with escrow securing both parties from fraud or unintended failures.<br>Through the transaction protocol's handshake mechanism, A and B can agree (in advance) upon<br><br>* The delivery addresses (which ledger, which wallet)<br>* the provider of escrow that they both trust<br>* the price and currency<br><br>Establishing trust (e.g. Is that art original or is that machine learning model has the advertised accuracy) can be facilitated through the participating DLTs if they support it. Note that `User A` has no way of knowing the quality of the dataset, they entirely rely on `User B`'s description of its quality (there are solutions to this problem, but it's not within the scope of our use case to discuss these). |
| Actors                      | 1. `User A`: A person or business organization with the intent to purchase data.<br>2. `User B`: A person or business entity with data to sell. |
| Goals of Actors             | `User A` wants to have access to data for an arbitrary reason such as having a business process that can enhanced by it.<br> `User B`: Is looking to generate income/profits from data they have obtained/created/etc. |
| Success Scenario            | Both parties have signaled to proceed with escrow and the swap happened as specified in advance. |
| Success Criteria            | `User A` has access to the data, `User B` has been provided with the funds. |
| Failure Criteria            | Either party did not hold up their end of the exchange/trace. |
| Prerequisites               | `User A` has the funds to make the purchase<br>`User B` has the data that `User A` wishes to purchase.<br>`User A` and B can agree on a suitable currency to denominate the deal in and there is also consensus on the provider of escrow. |
| Comments                    | Hyperledger Private Data: https://hyperledger-fabric.readthedocs.io/en/release-1.4/private_data_tutorial.html <br> Besu Privacy Groups: https://besu.hyperledger.org/en/stable/Concepts/Privacy/Privacy-Groups/ |

<br>
<img width="700" src="https://www.plantuml.com/plantuml/png/0/jPF1Qi9048Rl-nI3nu07FNee6cseq8FKzYR899dOnNKtdTreVVlEnb1ZeI257ZF_jpCVEvkf3yYXEHXOqqT3jY1OQDmn7c08ZxvWTw8IrcW8N0KB30YLOvWxRRrIVgzjZH6UiP2Pis4TpiBgW4ONIWKTvElfN1CRAdV4a1fNx8jtr1QMDf1C2jfPoAG9dHplD_Ol8bW4-NZpnDiPe0ViLz9OoPNAtIUaoqoH5Qqp36QhvQ25Qosr4YI_G8FdrjKFL2bpSlG46UQiY-qbY8VAqJLCoJVzQ7njXqrmegAF64JSIW663t7Y15RiQYUdNncjZup4JA5Xsozr61gOCqcJijzYhNUtS73TNK7MsD8hY5p4ox7GqQgjNpaXkfdTkNwtkRELveFCl8TH-JrUSNCzhL6drIxqNwnkDr1LgXlTYYR92ncAEwpQUq5HYMjDaerD4l5XAaWVjTs1lFEWoL-I-AvWrkAfCBwcE87CEKc--qz-61rgGt5_NPx_bgkfN8ZyaLy0">
<div style="page-break-after: always; visibility: hidden"><!-- \pagebreak --></div>

## 3.3 Money Exchanges

Enabling the trading of fiat and virtual currencies in any permutation of possible pairs.

> On the technical level, this use case is the same as the one above and therefore the specific details were omitted.

## 3.4 Stable Coin Pegged to Other Currency


| W3C Use Case Attribute Name | W3C Use Case Attribute Value |
|-----------------------------|------------------------------------------------|
| Use Case Title              | Stable Coin Pegged to Other Currency |
| Use Case                    | 1. `User A` creates their own ledger<br>2. `User A` deploys Hyperledger Cactus in an environment set up by them.<br>3. `User A` implements necessary plugins for Hyperledger Cactus to interface with their ledger for transactions, token minting and burning.|
| Type of Social Interaction  | Software Implementation Project |
| Narrative                   | Someone launches a highly scalable ledger with their own coin called ExampleCoin that can consistently sustain throughput levels of a million transactions per second reliably, but they struggle with adoption because nobody wants to buy into their coin fearing that it will lose its value. They choose to put in place a two-way peg with Bitcoin which guarantees to holders of their coin that it can always be redeemed for a fixed number of Bitcoins/USDs. |
| Actors                      | `User A`: Owner and/or operator of a ledger and currency that they wish to stabilize (peg) to other currencies |
| Goals of Actors             | 1. Achieve credibility for their currency by backing funds.<br>2. Implement necessary software with minimal boilerplate code (most of which should be provided by Hyperldger Cactus) |
| Success Scenario            | `User A` stood up a Hyperledger Cactus deployment with their self-authored plugins and it is possible for end user application development to start by leveraging the Hyperledger Cactus REST APIs which now expose the functionalities provided by the plugin authored by ``User A`` |
| Success Criteria            | Success scenario was achieved without significant extra development effort apart from creating the Hyperledger Cactus plugins. |
| Failure Criteria            | Implementation complexity was high enough that it would've been easier to write something from scratch without the framework |
| Prerequisites               | * Operational ledger and currency<br>*Technical knowledge for plugin implementation (software engineering) |
| Comments                    | |

> Sequence diagram omitted as use case does not pertain to end users of Hyperledger Cactus itself.

### 3.4.1 With Permissionless Ledgers (BTC)

A BTC holder can exchange their BTC for ExampleCoins by sending their BTC to `ExampleCoin Reserve Wallet` and the equivalent amount of coins get minted for them
onto their ExampleCoin wallet on the other network.

An ExampleCoin holder can redeem their funds to BTC by receiving a Proof of Burn on the ExampleCoin ledger and getting sent the matching amount of BTC from the `ExampleCoin Reserve Wallet` to their BTC wallet.

<img width="700" src="https://www.plantuml.com/plantuml/png/0/XP9FIyH03CNlyoc2dhmiui6JY5ln7tWG4KJmaft6TkWqgJFfrbNyxgPBLzP5yLQQlFpoNkOiAoRjsmWNRzXsaSubCDnHLL49Ab04zVR7EGqQ2QvN7QL8PKK9YYY-yJLQ_mqhLGar2CDbmfO6ISqp_pCoDu4xj7R8zDeJUvgd9CD37Np3b3CSRRKawRdqajZ8HuTRXHRVMcl6Yd9u9pW-_6NkdNaCFdJ82ZR6B0Gcvrx6LM7lGHH_-h_X9R5AMkq1Pb3o0VPlGrNhLS8LV3W0bjAKyuCViaUCaJIlHUI7RmqHhqMVxdC7EcMn2rpynOiHHEin_4cuZKHPR9XF5ACC4tIZBWvsZmptb2ajAKzpfisxzCVkewcJsMnskcbQrnsB4jZfBTN6pG6vX08iUZDed2N6dc117ljChe2GOO7URbI1MPdAyW9po09Hk79Z15OPrZj1BT4kDieGDFLPxHbPM45NCqU66kdEdTcdFUCl">

### 3.4.2 With Fiat Money (USD)

Very similar idea as with pegging against BTC, but the BTC wallet used for reserves
gets replaced by a traditional bank account holding USD.

<div style="page-break-after: always; visibility: hidden"><!-- \pagebreak --></div>

## 3.5 Healthcare Data Sharing with Access Control Lists

| W3C Use Case Attribute Name | W3C Use Case Attribute Value |
|-----------------------------|------------------------------------------------|
| Use Case Title              | Healthcare Data Sharing with Access Control Lists |
| Use Case                    | 1. `User A` (patient) engages in business with `User B` (healthcare provider)<br>2. `User B` requests permission to have read access to digitally stored medical history of `User A` and write access to log new entries in said medical history.<br>3.`User A` receives a prompt to grant access and allows it.<br>4. `User B` is granted permission through ledger specific access control/privacy features to the data of `User A`. |
| Type of Social Interaction  | Peer to Peer Data Sharing |
| Narrative                   | Let's say that two healthcare providers have both implemented their own blockchain based patient data management systems and are looking to integrate with each other to provide patients with a seamless experience when being directed from one to another for certain treatments. The user is in control over their data on both platforms separately and with a Hyperledger Cactus backed integration they could also define fine grained access control lists consenting to the two healthcare providers to access each other's data that they collected about the patient. |
| Actors                      | * `User A`: Patient engaging in business with a healthcare provider<br>* `User B`: Healthcare provider offering services to `User A`. Some of said services depend on having access to prior medical history of `User A`. |
| Goals of Actors             | * `User A`: Wants to have fine grained access control in place when it comes to sharing their data to ensure that it does not end up in the hands of hackers or on a grey data market place.<br>`User B` |
| Success Scenario            | `User B` (healthcare provider) has access to exactly as much information as they need to and nothing more. |
| Success Criteria            | There's cryptographic proof for the integrity of the data. Data hasn't been compromised during the sharing process, e.g. other actors did not gain unauthorized access to the data by accident or through malicious actions. |
| Failure Criteria            | `User B` (healthcare provider) either does not have access to the required data or they have access to data that they are not supposed to. |
| Prerequisites               | `User A` and `User B` are registered on a ledger or two separate ledgers that support the concept of individual data ownership, access controls and sharing. |
| Comments                    | It makes most sense for best privacy if `User A` and `User B` are both present with an identity on the same permissioned, privacy-enabled ledger rather than on two separate ones. This gives `User A` an additional layer of security since they can know that their data is still only stored on one ledger instead of two (albeit both being privacy-enabled)|

<img width="700" src="https://www.plantuml.com/plantuml/png/0/hLHDRzf04BtxLupefJtaa1mjX69IaQ16AYfgUeaK3Ui1Zx1ttTd1b7_VMK1WL9NcqAFtVSsyNVa-AefkcXhcz7D3tX5yPbm9Dd03JuIrLWx53b4HvXKA-nLiMIiedACOuI5ubL33CqUDMHRNx5jCya8aR2U6pdLN4x1YpIxBbDM-ddOjIKtbYWJ6TN1hLo5xc7eborOE7YPcGjiWwrV_VqP3fq7WUoHvAm0Z80o7hMMHrz6eZuuJkZ2qEeUq4ZekIOoPBS8l64ydyE57nKhp9gmfCnFM7GoAsNImDs_vTFPYcvTezX_ZfptO6LI2sHoy1i_x8kBWmj4KkC18CC65i7ixa9Ayl3s3OugRFdHtjiQD1jkAErI2u2qBRaPfi1o-fKAZ7gexj9LbaB0z9OUPXAPLM5ebVGw0a6x4mwEWLvYHD1mZ9_EJkhpBuP4KYXX9N_r5YsbiQ_1aSuMJ32yMM2xF6LqEBoIyt5rFSSBA3krjyygZ9LA4_MKO1j2TwXYwK0V9LqBaHxQw8qeKggtWddJgkx-BXSfHiGYYIUZBFyRlLsJZFmYbuwlZ7rFAs_VI-wqU9ILy_VAUI_WdFJkoUy_Xy0gigkpUDhP_o6y0">
<div style="page-break-after: always; visibility: hidden"><!-- \pagebreak --></div>

## 3.6 Integrate Existing Food Traceability Solutions

| W3C Use Case Attribute Name | W3C Use Case Attribute Value |
|-----------------------------|------------------------------|
| Use Case Title              | Food Traceability Integration |
| Use Case                    | 1. `Consumer` is evaluating a food item in a physical retail store.<br> 2. `Consumer` queries the designated end user application designed to provide food traces. 3. `Consumer` makes purchasing decision based on food trace.|
| Type of Social Interaction  | Software Implementation Project |
| Narrative                   | Both `Organization A` and `Organization B` have separate products/services for solving the problem of verifying the source of food products sold by retailers.<br>A retailer has purchased the food traceability solution from `Organization A` while a food manufacturer (whom the retailer is a customer of) has purchased their food traceability solution from `Organization B`.<br>The retailer wants to provide end to end food traceability to their customers, but this is not possible since the chain of traceability breaks down at the manufacturer who uses a different service or solution. `Cactus` is used as an architectural component to build an integration for the retailer which ensures that consumers have access to food tracing data regardless of the originating system for it being the product/service of `Organization A` or `Organization B`. |
| Actors                      | `Organization A`, `Organization B` entities whose business has to do with food somewhere along the global chain from growing/manufacturing to the consumer retail shelves.<br> `Consumer`: Private citizen who makes food purchases in a consumer retail goods store and wishes to trace the food end to end before purchasing decisions are finalized. |
| Goals of Actors             | `Organization A`, `Organization B`: Provide `Consumer` with a way to trace food items back to the source.<br>`Consumer`: Consume food that's been ethically sourced, treated and transported. |
| Success Scenario            | `Consumer` satisfaction increases on account of the ability to verify food origins. |
| Success Criteria            | `Consumer` is able to verify food items' origins before making a purchasing decision. |
| Failure Criteria            | `Consumer` is unable to verify food items' origins partially or completely. |
| Prerequisites               | 1. `Organization A` and `Organization B` are both signed up for blockchain enabled software services that provide end to end food traceability solutions on their own but require all participants in the chain to use a single solution in order to work.<br>2. Both solutions of `Organization A` and `B` have terms and conditions such that it is possible technically and legally to integrate the software with each other and `Cactus`. |
| Comments                    | |

<img width="700" src="https://www.plantuml.com/plantuml/png/0/rPRBRjim44Nt_8g1ksaNIM4jWzY8dS1eW0PDcqSt0G9A6jc4QL8bgQJkrtT8oefVifnTkxDy3uSpbyF7XNNSk6eXuGv_LQWoX2l1fuOlu0GcMkTmRtY6F1LIk2LSAuSaEg4LOtOkLCazEZ96lqwqSdTkAH64ur9aZ3dXwElBiaGZCP-YWR7KsJoRSQ7MGy64Wk2hDlCdzVuqUEQqWGUBvda4t0A7y_DCArijq0o7w_BOood9saov4lnFd7q4P49HRBANdirss773ibJ_Xb5PKgLH-l1p9XmoLCwds9iOyWDLtlE1YlgZKSSycw_4DFucBGSA6YEFhoVR4KUtru7dfMZ-UoIdSqvPVxIVWlYo6QRtDHXlUwjW1FEKMmokFaVrkUz7vltzOXB4v2qkhvmcfyGBTmX-1GO3-86PDZbSKG0O36XkE1asLPzvd_pmi9A1YJo3Xl5yRSGX75QGvyc8monun9Dvlmiqw2gZTjHw54Ri2AWJwGHOzezvb_n7tb4htg2PubidIgrBkDLI2ZNzV6_4b7ewpBPjnlSApH9YqqEVRNNF7dKzcpeHEWRMa0wWAuU4RQt27lNW50dh13PpQ9heKY_AojKkNecYs5FMNgsbmsw4jUH_7EDqgyl7uFNqg__WeQHZQxr_TfJt5faSA38vj95QyjvPo6FmpMAIrZBVb712-tOFso1Sc77Tlr7N2sN3Tk2RXqjigK25VPDtd2u7-BPkRe7txAvMigwubhQtlwqffMan9HQk_XuvS3DXeTH2-Py8_dxpDrRKGvocMJWbde2TwKgkfaqHw3L2zvoawpO05CHWeGskIb1BYaUtOE6b1MHSqQXQf8UC4PHlkWotEIsmJfr_-X1Q8ncre4HAk_2vkB1a9XPrMYFUK5yPEyw8Bg9BZmt2pu3UK5ARiwb1LCCRFaTuHIb1A2f_WVcJsW3Aoj2pBdHpZfcmz23Q8lox8fmzeLGTM_AKCNP15T83z2y0">

---

<img width="700" src="https://www.plantuml.com/plantuml/png/0/fLNHQjj047pNLopk1xIqzCKa9b6eKqCBflPB8I-dqvvyzUbMtJlLLKh-lIl5IjHOTXC20e6OdPsTcrjTXAWurgM3EL4EQrPQPTRPsC32HonOHKi-IQAD3k5pKo4xp0jaI1tfhTuewuT8cBCgSKUylV6d6SFM-ae96WB-hD5hl6IctNfZzTPZ2F1-066gVQw9lJJ-EFXUgj-bO5M1mTuYV7WtGhkK0QssbV8HX4K6i1vb8geW4cGK8vMGMqPzBqpfI0oJRnYLTTBlgWw2G9w02i0wIKmx8aokg1JE1Yvl_DaPSQ6ylUrccyqwg5RmveijDl6QLGD_4W1FkTGTsB8YLtVUTKo1JDmfnZsBYQ7d-OxEqQvZkalk3dIantHaBzMHZkl8Jkle-7hNZcXXV9KMoB5or9JeuzjGPq6phGRiRY3ocX7zNcFVPPXJ8sVyoUTj1DhNKm4lw6eDHZHnttUrRL9NuxWxNvMlZUIhvgCEcV9LgNc6Gsh4eKUTgoP4B1-kghYqpzSHlS7gSS5FYAIYPLYivLxoBwlxN8LW3pGCrioHhXittlJ_I-aWs9ar_-Pw8AU4y_DPTv4xiwQmh5dO0yA9uqZa5DeoKqxbgnIWX4tGXgbTM8y9w87j1Nq-VzgNYVE3WaExOSdqGvPQmhh3xtCwxMWnt8iYjeNr8McFiGLjt1JIshfSSZsWagVTbsGWNSoJv09zBl-Clm00">

<div style="page-break-after: always; visibility: hidden"><!-- \pagebreak --></div>

## 3.7 End User Wallet Authentication/Authorization

| W3C Use Case Attribute Name | W3C Use Case Attribute Value |
|-----------------------------|------------------------------|
| Use Case Title              | Wallet Authentication/Authorization |
| Use Case                    | 1. `User A` has separate identities on different permissioned and permissionless ledgers in the form of private/public key pairs (Public Key Infrastructure).<br>2. `User A` wishes to access/manage these identities through a single API or user interface and opts to on-board the identities to a `Cactus` deployment.<br>3. `User A` performs the on-boarding of identities and is now able to interact with wallets attached to said identities through `Cactus` or end user applications that leverage `Cactus` under the hood (e.g. either by directly issuing API requests or using an application that does so.|
| Type of Social Interaction  | Identity Management |
| Narrative                   | End user facing applications can provide a seamless experience connecting multiple permissioned (or permissionless) networks for an end user who has a set of different identity proofs for wallets on different ledgers. |
| Actors                      | `User A`: The person or entity whose identities get consolidated within a single `Cactus` deployment |
| Goals of Actors             | `User A`: Convenient way to manage an array of distinct identities with the trade-off that a `Cactus` deployment must be trusted with the private keys of the identities involved (an educated decision on the user's part). |
| Success Scenario            | `User A` is able to interact with their wallets without having to access each private key individually. |
| Success Criteria            | `User A`'s credentials are safely stored in the `Cactus` keychain component where it is the least likely that they will be compromised (note that it is never impossible, but least unlikely, definitely) |
| Failure Criteria            | `User A` is unable to import identities to `Cactus` for a number of different reasons such as key format incompatibilities. |
| Prerequisites               | 1. `User A` has to have the identities on the various ledgers set up prior to importing them and must have access to the private |
| Comments                    |  |

<img width="700" src="./use-case-sequence-diagram-end-user-wallet-authentication-authorization.png">

---

<img width="700" src="https://www.plantuml.com/plantuml/png/0/fPPBRnen483l-oj6oRMYXQIN24KXXBIeBqHegqgvp7fd5ul5Tcrl2Qduxntl0sW2IMWlI1xFVFFmp2mNpgFrnJo7Nk6dfBmKwALMhygpjlA-F4AgBOp8pgLpVAG4-bEKoaMHbpudUByqP7DACh9mcMin4-4QXifJPYl2jSKvBRITtQf_T9LJwi5hi3ARUaYa9H4CeiZDf3B8V73qio0bg6UjNaocKimKEGUTBHMh2vK8RHM7-dPBFiUxEUjYHaxU4voysO4TSQsaa0QL1wPmob9H5AKXDJWQg0I-EiRsZCdhv8u07L01loC059vJE-fsPHAozqlG2uxY_BnKaffLb4uOD6pkHrRh5DgtgjiTt_JW0x48PMDXpCoquNY4ENsJEYS_vc85Hwjzf4uW3VfNkrcTWrWdWJL2v_XDauPI7my2dGRGb-5L7oPwHgf68VU43-VTh5MqBdjVp_b1bj0B76qpL7KdrII1SFmnjCmxYylIl0hZ-JxjTfrE_G8jGK8cryiv1rvJOvdMs1-KvtfHWXlqU70pWTve610BYhb_x2yfQ6DgYUVEo7LWn7bMW5NvwtL6F2Es5ZRSp-H3P5MgwouoUP59jO7Bf9AeIXjtU6dyF0HV7WAE3m2N4GlDfkKGF2IlR_ulyaCTF9N1gkcpkit-oiHixwTgxzM-r9vk-uuvDp2qWJk-MHI1X4d2pU1gwmKL-BYjTeLn-KmOyPDXT9uD8zuJXjJGQfrlzV0PZCDsTBoQBIg7vKvsaTAUWCU9D-ICRTcFuoEBBCmr3nJxvmRdcqstXMtWolLFAAPyPHlm53rS3gzPz8iizo6vrs7LC19phR8WbnXuW8OnnafaxzLJExwDAGq--U1jmG6gh7PkceLUogeA1WF-oj0TYO8fsrcTyLMx1OCxeor_WT0Z2pejc0ITbCTLwChXIGi-eU9l2MoUACXFMq1Uj2BYqeSAHLkxe5lNTSyil5mrtgNwS2cyGAVax9lCOABmZ6lnk4pH4mDNsiLxxA8BBWp_6Va3">

<div style="page-break-after: always; visibility: hidden"><!-- \pagebreak --></div>

## 3.8 Blockchain Migration


| Use Case Attribute Name    | Use Case Attribute Value |
| -------------------------- | -------------------------------------------- |
| Use Case Title             | Blockchain Migration |
| Use Case                   | 1. `Consortium A` operates a set of services on the source blockchain.<br>2. `Consortium A` decides to use another blockchain instance to run its services. <br>3. `Consortium A` migrates the existing assets and data to the target blockchain.<br>4. `Consortium A` runs the services on the target blockchain.
| Interworking patterns      | Value transfer, Data transfer |
| Type of Social Interaction | Asset and Data Transfer |
| Narrative                  | A group of members  (`Consortium A`) that operates the source blockchain (e.g., Hyperledger Fabric instance) would like to migrate the assets, data, and functionality to the target blockchain (e.g., Hyperledger Besu instance) to expand their reach or to benefits from better performance, lower cost, or enhanced privacy offered by the target blockchain. In the context of public blockchains, both the group size and the number of services could even be one. For example, a user that runs a Decentralized Application (DApp) on a publication blockchain wants to migrate DApp's assets, data, and functionality to a target blockchain that is either public or private.<br>The migration is initiated only after all members of `Consortium A` provide their consent to migrate. During the migration, assets and data that are required to continue the services are copied to the target blockchain. A trusted intermediatory (e.g., Oracle) is also authorized by the members of `Consortium A` to show the current state of assets and data on source blockchain to the target blockchain. <br>Assets on the source blockchain are burned and smart contracts are destructed during the migration to prevent double-spending. Proof-of-burn is verified on the target blockchain before creating the assets, smart contracts, or their state using the following process: <br>1. `Consortium A` requests smart-contract on the target blockchain (via `Cactus`) to transfer their asset/data, which will then wait until confirmation from the smart contract on the source blockchain. <br>2. `Consortium A` requests smart contract on source blockchain (via `Cactus`) to burn their asset/data. <br>3. Smart contract on source blockchain burns the asset/data and notifies that to the smart contract on the target blockchain. <br>4. Given the confirmation from Step 3, the smart contract on target blockchain creates asset/data. <br>After the migration, future transactions are processed on the target blockchain. In contrast, requests to access historical transactions are directed to the source blockchain. As assets are burned and smart contracts are destructed, any future attempt to manipulate them on the source blockchain will fail.<br>Regardless of whether the migration involves an entire blockchain or assets, data, and smart contracts of a DApp, migration requires lots of technical effort and time. The `Blockchain Migration` feature from `Cactus` can provide support for doing so by connecting source and target blockchains; proving values and proof-of-burn of assets, smart contracts, and data imported from the source blockchain to the target; and then performing the migration task. |
| Actors                     | 1. `Consortium A`: The group of entities operating on the source blockchain who collectively aims at performing the migration to the target blockchain. |
| Goals of Actors            | 1. `Consortium A`: Wants to be able to operate its services on the target blockchain while gaining its benefits such as better performance, lower cost, or enhanced privacy. |
| Success Scenario           | Asset and data (including smart contracts) are available on the target blockchain, enabling `Consortium A`'s services to operate on the target blockchain.|
| Success Criteria           | Migration starts at a set time, and all desired assets and data, as well as their histroy have been migrated in a decentralized way. |
| Failure Criteria           | States of all assets and data on the target blockchain do not match the states on the source blockchain before migration, e.g., when transactions replayed on target blockchain are reordered. <br>`Consortium A` is unable to migrate to the target blockchain for several reasons, such as
inability to recreate the same smart contract logic, inability to arbitrary recreate native assets on target blockchain, and lack of access to private keys of external accounts. |
| Prerequisites              | 1. `Consortium A` wants to migrate the assets and data on the source blockchain, and have chosen a desirable target blockchain.<br>2. Migration plan and window are informed to all members of the consortium, and they agree to the migration.<br>3. `Consortium A` has write and execute permissions on the target blockchain. |
| Comments                   | * `Consortium A` is the governance body of services running on the source blockchain.<br> * Data include smart contracts and their data originating from the source blockchain. Depending on the use case, a subset of the assets and data may be recreated on the target blockchain.<br>* This use case relates to the use cases implying asset and data portability (e.g., 2.1). However, migration is mostly one-way and nonreversible.<br>* This use case provides blockchain portability; thus, retains blockchain properties across migration, reduces costs, time to migration, and foster blockchain adoption. |

---

**Motivation**

The suitability of a blockchain platform regarding a use case depends on the underlying blockchain properties.
As blockchain technologies are maturing at a fast pace, in particular private blockchains, its properties such as performance (i.e., throughput, latency, or finality), transaction fees, and privacy might change.
Also, blockchain platform changes, bug fixes, security, and governance issues may render an existing application/service suboptimal.
Further, business objectives such as the interest to launch own blockchain instance, partnerships, mergers, and acquisitions may motivate a migration.
Consequently, this creates an imbalance between the user expectations and the applicability of the existing solution.
It is, therefore, desirable for an organization/consortium to be able to replace the blockchain providing the infrastructure to a particular application/service.

Currently, when a consortium wants to migrate the entire blockchain or user wants to migrate a DApp on a public blockchain (e.g., the source blockchain became obsolete, cryptographic algorithms are no longer secure, and business reasons), the solution is to re-implement business logic using a different blockchain platform, and arbitrary recreate the assets and data on the target blockchain, yielding great effort and time, as well as losing blockchain properties such as immutability, consistency, and transparency.
Data migrations have been performed before on public blockchains [[2](#9-references), [3](#9-references), [4](#9-references)] to render flexibility to blockchain-based solutions.
Such work proposes data migration capabilities and patterns for public, permissionless blockchains, in which a user can specify requirements and scope for the blockchain infrastructure supporting their service.

### 3.8.1 Blockchain Data Migration
Data migration corresponds to capturing the subset of assets and data on a source blockchain and constructing a representation of those in a target blockchain. Note that the models underlying both blockchains do not need to be the same (e.g., world state model in Hyperledger Fabric vs account-balance model in Ethereum).
For migration to be effective, it should be possible to capture the necessary assets and data from the source blockchain and to write them on the target blockchain.


<img width="700" src="./use-case-sequence-diagram-blockchain-migration.png">

### 3.8.2 Blockchain Smart Contract Migration
The task of migrating a smart contract comprises the task of migrating the smart contract logic and data embedded in it. In specific, the data should be accessible and writeable on another blockchain. When the target blockchain can execute a smart contract written for the source blockchain, execution behaviour can be preserved by redeploying the same smart contract (e.g., reusing a smart contract written for Ethereum on Hyperldger Besu) and recreating its assets and data. If code reuse is not possible (either at source or binary code level), the target blockchain's virtual machine should support the computational complexity of the source blockchain (e.g., one cannot migrate all Ethereum smart contracts to Bitcoin, but the other way around is feasible).
Automatic smart contract migration (with or without translation) yields risks for enterprise blockchain systems, and thus the solution is nontrivial [[4](#9-references)].

### 3.8.3 Semi-Automatic Blockchain Migration

By expressing a user's preferences in terms of functional and non-functional requirements, `Cactus` can recommend a set of suitable blockchains, as the target for the migration.
Firstly, a user could know in real-time the characteristics of the target blockchain that would influence the migration decision. For instance, the platform can analyze the cost of writing data to Ethereum, Ether:USD exchange rate, average inter-block time, transaction throughput, and network hash rate [[3](#9-references)].
Based on those characteristics and user-defined requirements, `Cactus` proposes a migration with indicators such as predicted cost, time to complete the migration, and the likelihood of success.
For example, when transaction inclusion time or fee on Ethereum exceeds a threshold, `Cactus` may choose Polkadot platform, as it yields lower transaction inclusion time or fee. `Cactus` then safely migrate assets, data, and future transactions from Ethereum to Polkadot, without compromising the solution in production.
 This feature is more useful for public blockchains.


<div style="page-break-after: always; visibility: hidden"><!-- \pagebreak --></div>

