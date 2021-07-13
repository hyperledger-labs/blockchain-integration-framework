


<img src="./logo_hl_new.png" width="700" >


# Hyperledger Cactus<br>Whitepaper <!-- omit in toc -->

## Version 0.1 (Early Draft) <!-- omit in toc -->

<img src="./pontus-wellgraf-agCzLSG4_gE-unsplash-cropped-compressed.jpg" width="700">
Photo by Pontus Wellgraf on Unsplash

<div style="page-break-after: always; visibility: hidden"><!-- \pagebreak --></div>

# Contributors <!-- omit in toc -->

| Contributors/Reviewers         | Email                                     |
|--------------------------------|-------------------------------------------|
| Hart Montgomery                | hmontgomery@us.fujitsu.com                |
| Hugo Borne-Pons                | hugo.borne-pons@accenture.com             |
| Jonathan Hamilton              | jonathan.m.hamilton@accenture.com         |
| Mic Bowman                     | mic.bowman@intel.com                      |
| Peter Somogyvari               | peter.somogyvari@accenture.com            |
| Shingo Fujimoto                | shingo_fujimoto@fujitsu.com               |
| Takuma Takeuchi                | takeuchi.takuma@fujitsu.com               |
| Tracy Kuhrt                    | tracy.a.kuhrt@accenture.com               |
| Rafael Belchior                | rafael.belchior@tecnico.ulisboa.pt        |

# Document Revisions <!-- omit in toc -->

| Date of Revision      | Description of Changes Made                            |
|-----------------------|--------------------------------------------------------|
| February 2020         | Initial draft                                          |


<div style="page-break-after: always; visibility: hidden"><!-- \pagebreak --></div>

- [1. Abstract](#1-abstract)
- [2. Introduction to Blockchain Interoperability](#2-introduction-to-blockchain-interoperability)
  - [2.1 Terminology of Blockchain Interoperability](#21-terminology-of-blockchain-interoperability)
    - [2.1.1 Ledger Object Types](#211-ledger-object-types)
    - [2.1.2 Blockchain Interoperability Types](#212-blockchain-interoperability-types)
    - [2.1.3 Burning or Locking of Assets](#213-burning-or-locking-of-assets)
  - [2.2 Footnotes (Introduction)](#22-footnotes-introduction)
- [3. Example Use Cases](#3-example-use-cases)
  - [3.1 Car Trade](#31-car-trade)
  - [3.2 Electricity Trade](#32-electricity-trade)
  - [3.3 Supply chain](#33-supply-chain)
  - [3.4 Ethereum to Quorum Asset Transfer](#34-ethereum-to-quorum-asset-transfer)
  - [3.5 Escrowed Sale of Data for Coins](#35-escrowed-sale-of-data-for-coins)
  - [3.6 Money Exchanges](#36-money-exchanges)
  - [3.7 Stable Coin Pegged to Other Currency](#37-stable-coin-pegged-to-other-currency)
    - [3.7.1 With Permissionless Ledgers (BTC)](#371-with-permissionless-ledgers-btc)
    - [3.7.2 With Fiat Money (USD)](#372-with-fiat-money-usd)
  - [3.8 Healthcare Data Sharing with Access Control Lists](#38-healthcare-data-sharing-with-access-control-lists)
  - [3.9 Integrate Existing Food Traceability Solutions](#39-integrate-existing-food-traceability-solutions)
  - [3.10 End User Wallet Authentication/Authorization](#310-end-user-wallet-authenticationauthorization)
  - [3.11 Blockchain Migration](#311-blockchain-migration)
    - [3.11.1 Blockchain Data Migration](#3111-blockchain-data-migration)
    - [3.11.2 Blockchain Smart Contract Migration](#3112-blockchain-smart-contract-migration)
    - [3.11.3 Semi-Automatic Blockchain Migration](#3113-semi-automatic-blockchain-migration)
- [4. Software Design](#4-software-design)
  - [4.1. Principles](#41-principles)
    - [4.1.1. Wide support](#411-wide-support)
    - [4.1.2. Plugin Architecture from all possible aspects](#412-plugin-architecture-from-all-possible-aspects)
    - [4.1.3. Prevent Double spending Where Possible](#413-prevent-double-spending-where-possible)
    - [4.1.4 DLT Feature Inclusivity](#414-dlt-feature-inclusivity)
    - [4.1.5 Low impact](#415-low-impact)
    - [4.1.6 Transparency](#416-transparency)
    - [4.1.7 Automated workflows](#417-automated-workflows)
    - [4.1.8 Default to Highest Security](#418-default-to-highest-security)
    - [4.1.9 Transaction Protocol Negotiation](#419-transaction-protocol-negotiation)
    - [4.1.10 Avoid modifying the total amount of digital assets on any blockchain whenever possible](#4110-avoid-modifying-the-total-amount-of-digital-assets-on-any-blockchain-whenever-possible)
    - [4.1.11 Provide abstraction for common operations](#4111-provide-abstraction-for-common-operations)
    - [4.1.12 Integration with Identity Frameworks (Moonshot)](#4112-integration-with-identity-frameworks-moonshot)
  - [4.2 Feature Requirements](#42-feature-requirements)
    - [4.2.1 New Protocol Integration](#421-new-protocol-integration)
    - [4.2.2 Proxy/Firewall/NAT Compatibility](#422-proxyfirewallnat-compatibility)
    - [4.2.3 Bi-directional Communications Layer](#423-bi-directional-communications-layer)
    - [4.2.4 Consortium Management](#424-consortium-management)
  - [4.3 Working Policies](#43-working-policies)
- [5. Architecture](#5-architecture)
  - [5.1 Deployment Scenarios](#51-deployment-scenarios)
    - [5.1.1 Production Deployment Example](#511-production-deployment-example)
    - [5.1.2 Low Resource Deployment Example](#512-low-resource-deployment-example)
  - [5.2 System architecture and basic flow](#52-system-architecture-and-basic-flow)
    - [5.2.1 Definition of key components in system architecture](#521-definition-of-key-components-in-system-architecture)
    - [5.2.2 Bootstrapping Cactus application](#522-bootstrapping-cactus-application)
    - [5.2.3 Processing Service API call](#523-processing-service-api-call)
  - [5.3 APIs and communication protocols between Cactus components](#53-apis-and-communication-protocols-between-cactus-components)
    - [5.3.1 Cactus Service API](#531-cactus-service-api)
      - [Open Endpoints](#open-endpoints)
      - [Restricted Endpoints](#restricted-endpoints)
    - [5.3.2 Ledger plugin API](#532-ledger-plugin-api)
    - [5.3.3 Exection of "business logic" at "Business Logic Plugin"](#533-exection-of-business-logic-at-business-logic-plugin)
  - [5.4 Technical Architecture](#54-technical-architecture)
    - [5.4.1 Monorepo Packages](#541-monorepo-packages)
      - [5.4.1.1 cmd-api-server](#5411-cmd-api-server)
        - [5.4.1.1.1 Runtime Configuration Parsing and Validation](#54111-runtime-configuration-parsing-and-validation)
        - [5.4.1.1.2 Configuration Schema - API Server](#54112-configuration-schema---api-server)
        - [5.4.1.1.3 Plugin Loading/Validation](#54113-plugin-loadingvalidation)
      - [5.4.1.2 core-api](#5412-core-api)
      - [5.4.1.3 sdk](#5413-sdk)
      - [5.4.1.4 keychain](#5414-keychain)
      - [5.4.1.5 tracing](#5415-tracing)
      - [5.4.1.6 audit](#5416-audit)
      - [5.4.1.7 document-storage](#5417-document-storage)
      - [5.4.1.8 relational-storage](#5418-relational-storage)
      - [5.4.1.9 immutable-storage](#5419-immutable-storage)
    - [5.4.2 Deployment Diagram](#542-deployment-diagram)
    - [5.4.3 Component Diagram](#543-component-diagram)
    - [5.4.4 Class Diagram](#544-class-diagram)
    - [5.4.5 Sequence Diagram - Transactions](#545-sequence-diagram---transactions)
  - [5.5 Transaction Protocol Specification](#55-transaction-protocol-specification)
    - [5.5.1 Handshake Mechanism](#551-handshake-mechanism)
    - [5.5.2 Transaction Protocol Negotiation](#552-transaction-protocol-negotiation)
  - [5.6 Plugin Architecture](#56-plugin-architecture)
    - [5.6.1 Ledger Connector Plugins](#561-ledger-connector-plugins)
      - [5.6.1.1 Ledger Connector Besu Plugin](#5611-ledger-connector-besu-plugin)
      - [5.6.1.2 Ledger Connector Fabric Plugin](#5612-ledger-connector-fabric-plugin)
      - [5.6.1.3 Ledger Connector Quorum Plugin](#5613-ledger-connector-quorum-plugin)
    - [5.6.2 HTLCs Plugins](#562-htlcs-plugins)
      - [5.6.2.1 HTLC-ETH-Besu Plugin](#5621-htlc-eth-besu-plugin)
      - [5.6.2.2 HTLC-ETH-ERC20-Besu Plugin](#5622-htlc-eth-erc20-besu-plugin)
    - [5.6.3 Identity Federation Plugins](#563-identity-federation-plugins)
      - [5.6.3.1 X.509 Certificate Plugin](#5631-x509-certificate-plugin)
    - [5.6.4 Key/Value Storage Plugins](#564-keyvalue-storage-plugins)
    - [5.6.5 Serverside Keychain Plugins](#565-serverside-keychain-plugins)
    - [5.6.6 Manual Consortium Plugin](#566-manual-consortium-plugin)
    - [5.6.7 Test Tooling](#567-test-tooling)
- [6. Identities, Authentication, Authorization](#6-identities-authentication-authorization)
  - [6.1 Definition of Identities in Cactus](#61-definition-of-identities-in-cactus)
  - [6.2 Transaction Signing Modes, Key Ownership](#62-transaction-signing-modes-key-ownership)
    - [6.2.1 Client-side Transaction Signing](#621-client-side-transaction-signing)
    - [6.2.2 Server-side Transaction Signing](#622-server-side-transaction-signing)
  - [6.3 Open ID Connect Provider, Identity Provider](#63-open-id-connect-provider-identity-provider)
  - [6.4 Server-side Keychain for Web Applications](#64-server-side-keychain-for-web-applications)
- [7. Terminology](#7-terminology)
- [8. Related Work](#8-related-work)
- [9. References](#9-references)
- [10. Recommended Reference](#10-recommended-reference)

<div style="page-break-after: always; visibility: hidden"><!-- \pagebreak --></div>

# 1. Abstract

Blockchain technologies are growing in usage, but fragmentation is a big problem that may hinder reaching critical levels of adoption in the future.

We propose a protocol and it's implementation to connect as many of them as possible in an attempt to solve the fragmentation problem by creating a heterogeneous system architecture <sup>[1](#8-references)</sup>.

# 2. Introduction to Blockchain Interoperability

There are two inherent problems<sup>[a](#22-footnotes-introduction)</sup> that have to be solved when connecting different blockchains:
* How to provide a proof of the networkwide<sup>[b](#22-footnotes-introduction)</sup> ledger state of a connected blockchain from the outside?
* How can other entities verify a given proof of the state of a connected blockchain
from the outside?

The `Cactus` consortium operates for each connected blockchain a group of validator nodes, which as a group provides the proofs of the state of the connected ledger. The group of validator nodes runs a consensus algorithm to agree on the state of the underlying blockchain. Since a proof of the state of the blockchain is produced and signed by several validator nodes<sup>[c](#22-footnotes-introduction)</sup> with respect to the rules of the consensus algorithm, the state of the underlying blockchain is evaluated networkwide.

The validator nodes are ledger-specific plug-ins, hence a smart contract on the connected blockchain can enable the ledger-specific functionalities necessary for a validator node to observe the ledger state to finalize a proof. The validator nodes are easier discovered from the outside than the blockchain nodes. Hence, the benefit of operating the `Cactus` network to enable blockchain interoperability relies on the fact that for any cross-blockchain interaction the same type of validator node signatures can be used. That means, the cross-blockchain interaction can be done canonically with the validator node signatures in  `Cactus` rather than having to deal with many different ledger-specific types of blockchain node signatures.

Outside entities (verifier nodes) can request and register the public keys of the validator
nodes of a blockchain network that they want to connect to. Therefore, they can verify the signed proofs of the state of the blockchain since they have the public keys of the validator nodes. This implies that the verifier nodes trust the validator nodes as such they trust the `Cactus` consortium operating the validator nodes.




<img src="./cactus_overview.png" width="400"><br>Figure description: V1, V2, and V3 are validator nodes which provide proofs of the underlying blockchain network through ledger-specific plug-ins. V1, V2, and V3 run a consensus algorithm which is independent of the consensus algorithm run by the blockchain network nodes N1, N2, N3, N4, and N5.</img>

## 2.1 Terminology of Blockchain Interoperability


This section acts as a building block to describe the different flavors of blockchain interoperability. Business use cases will be built on these simple foundation blocks leveraging a mix of them simultaneously and even expanding to several blockchains interacting concurrently.


### 2.1.1 Ledger Object Types


To describe typical interoperability patterns between different blockchains, the types of objects stored on a ledger have to be distinguished. The following three types of objects stored on a ledger are differentiated as follows:

* FA: Fungible asset (value token/coin)  – cannot be duplicated on different ledgers
* NFA: Non-fungible asset – cannot be duplicated on different ledgers<sup>[d](#22-footnotes-introduction)</sup>
* D: Data – can be duplicated on different ledgers


Difference between a fungible (FA) and a non-fungible asset (NFA)

A fungible asset is an asset that can be used interchangeably with another asset of the same type, like a currency. For example, a 1 USD bill can be swapped for any other 1 USD bill. Cryptocurrencies, such as ETH (Ether) and BTC (Bitcoin), are FAs. A non-fungible asset is an asset that cannot be swapped as it is unique and has specific properties. For example, a car is a non-fungible asset as it has unique properties, such as color and price. CryptoKitties are NFAs as well. There are two standards for fungible and non-fungible assets on the Ethereum network (ERC-20 Fungible Token Standard and ERC-721 Non-Fungible Token Standard).

Difference between an asset (FA or NFA) and data (D)

Unicity applies to FAs and NFAs meaning it guarantees that only one valid representation of a given asset exists in the system. It prevents double-spending of the same token/coin in different blockchains. The same data package can have several representations on different ledgers while an asset (FA or NFA) can have only one representation active at any time, i.e., an asset exists only on one blockchain while it is locked/burned on all other blockchains. If fundamental disagreement persists in the community about the purpose or operational upgrades of a blockchain, a hard fork can split a blockchain creating two representations of the same asset to coexist. For example, Bitcoin split into Bitcoin and Bitcoin Cash in 2017. Forks are not addressing blockchain interoperability so the definition of unicity applies in a blockchain interoperability context. A data package that was once created as a copy of another data package might divert from its original one over time because different blockchains might execute different state changes on their data packages.


### 2.1.2 Blockchain Interoperability Types

Blockchain interoperability implementations can be classified into the following types:


* Ledger transfer:

An asset gets locked/burned on one blockchain and then a representation of the same asset gets released in the other blockchain<sup>[e](#22-footnotes-introduction)</sup>. There are never two representations of the same asset alive at any time. Data is an exception since the same data can be transferred to several blockchains. There are one-way or two-way ledger transfers depending on whether the assets can be transferred only in one direction from a source blockchain to a destination blockchain or assets can be transferred in and out of both blockchains with no designated source blockchain and destination blockchain.


* Atomic swap<sup>[f](#22-footnotes-introduction)</sup>:

A write transaction is performed on Blockchain A concurrently with another write transaction on blockchain B. There is no asset/data/coin leaving any blockchain environment. The two blockchain environments are isolated but, due to the blockchain interoperability implementation, both transactions are committed atomically. That means either both transactions are committed successfully or none of the transactions are committed successfully.


* Ledger interaction<sup>[f](#22-footnotes-introduction)</sup>:

An action<sup>[g](#22-footnotes-introduction)</sup> happening on Blockchain A is causing an action on Blockchain B. The state of Blockchain A causes state changes on Blockchain B. There are one-way or two-way ledger interactions depending on whether only the state of one of the blockchains can affect the state on the other blockchain or both blockchain states can affect state changes on the corresponding other blockchain.


* Ledger entry point coordination:

This blockchain interoperability type concerns end-user wallet authentication/ authorization enabling read and write operations to independent ledgers from one single entry point. Any read or write transaction submitted by the client is forwarded to the corresponding blockchain and then committed/executed as if the blockchain would be operate on its own.


The ledger transfer has a high degree of interference between the blockchains since the livelihood of a blockchain can be reduced in case too many assets are locked/burned in a connected blockchain. The ledger interaction has a high degree of interference between the blockchains as well since the state of one blockchain can affect the state of another blockchain. Atomic swaps have less degree of interference between the blockchains since all assets/data stay in their respective blockchain environment. The ledger entry point coordination has no degree of interference between the blockchains since all transactions are forwarded and executed in the corresponding blockchain as if the blockchains would be operated in isolation.





<img src="./ledger_transfer_one_way.png" width="400"><br>Figure description: One-way ledger transfer</img>

<img src="./ledger_transfer_two_way.png" width="400"><br>Figure description: Two-way ledger transfer</img>

<img src="./atomic_swap.png" width="400"><br>Figure description: Atomic swap</img>

<img src="./ledger_interaction.png" width="400"><br>Figure description: Ledger interaction</img>

<img src="./ledger_entry_point_coordination.png" width="400"><br>Figure description: Ledger entry point coordination</img>




Legend:

![](https://render.githubusercontent.com/render/math?math=O_1=) Object 1

![](https://render.githubusercontent.com/render/math?math=O_1^{begin}=) State of object *O<sub>1</sub>* at the beginning of transaction

![](https://render.githubusercontent.com/render/math?math=O_2^{begin}=) State of object *O<sub>2</sub>* at the beginning of transaction

![](https://render.githubusercontent.com/render/math?math=O_1^{end}=) State of object *O<sub>1</sub>* at the end of transaction

![](https://render.githubusercontent.com/render/math?math=O_2^{end}=) State of object *O<sub>2</sub>* at the end of transaction

*<span style="text-decoration:overline">O</span><sub>1</sub><sup>end</sup>* = Representation of object *O<sub>1</sub>* at the end of transaction in another blockchain

*<span style="text-decoration:overline">O</span><sub>2</sub><sup>end</sup>* = Representation of object } *O<sub>2</sub>* at the end of transaction in another blockchain

![](https://render.githubusercontent.com/render/math?math=T_1=) Transaction 1

![](https://render.githubusercontent.com/render/math?math=T_2=) Transaction 2

*<span style="text-decoration:overline">T</span><sub>1</sub>* = Representation of transaction 1 (T<sub>1</sub>) in another blockchain

*<span style="text-decoration:overline">T</span><sub>1</sub>* = Representation of transaction 2 (T<sub>2</sub>) in another blockchain

![](https://render.githubusercontent.com/render/math?math=E_1=) Event 1

![](https://render.githubusercontent.com/render/math?math=E_2(O_1||T_1||E_1)=) Event 2 depends on *O<sub>1</sub>*  or *T<sub>1</sub>* or *E<sub>1</sub>*

![](https://render.githubusercontent.com/render/math?math=T_2(O_1||T_1||E_1)=) Transaction 2 depends on *O<sub>1</sub>* or *T<sub>1</sub>* or *E<sub>1</sub>*



### 2.1.3 Burning or Locking of Assets


To guarantee unicity, an asset (NFA or FA) has to be burned or locked before being transferred into another blockchain. Locked assets can be unlocked in case the asset is retransferred back to its original blockchain, whereas the burning of assets is an irreversible process. It is worth noting that locking/burning of assets is happening during a ledger transfer but can be avoided in use cases where both parties have wallets/accounts on both ledgers by using atomic swaps instead. Hence, most cryptocurrency exchange platforms rely on atomic swaps and do not burn FAs. For example, ordinary coins, such as Bitcoin or Ethereum, can only be generated by mining a block. Therefore, Bitcoin or Ethereum exchanges have to rely on atomic swaps rather than two-way ledger transfers because it is not possible to create BTC or ETH on the fly. In contrast, if the minting process of an FA token can be leveraged on during a ledger transfer, burning/locking of an asset becomes a possible implementation option, such as in the ETH token ledger transfer from the old PoW chain (Ethereum 1.0) to the PoS chain (aka Beacon Chain in Ethereum 2.0). Burning of assets usually applies more to tokens/coins (FAs) and can be seen as a donation to the community since the overall value of the cryptocurrency increases.

Burning of assets can be implemented as follows:

* Assets are sent to the address of the coinbase/generation transaction<sup>[h](#22-footnotes-introduction)</sup> in the genesis block. A coinbase/generation transaction is in every block of blockchains that rely on mining. It is the address where the reward for mining the block is sent to. Hence, this will burn the tokens/coins in the address of the miner that mined the genesis block. In many blockchain platforms, it is proven that nobody has the private key to this special address.

* Tokens/Coins are subtracted from the user account as well as optionally from the total token/coin supply value.





## 2.2 Footnotes (Introduction)
a: There is an alternative approach for an outside entity A to verify the state of a connected blockchain if this connected blockchain uses Merkle Trees to store its blockchain state. An outside entity A can store the Merkle Tree roots from the headers of committed blocks of a connected blockchain locally to verify any state claims about the connected blockchain. Any untrusted entity can then provide a state of the connected blockchain, such as a specific account balance on the connected blockchain, because the outside entity A can act as a lightweight client and use concepts like simple payment verification (SPV) to verify that the state claim provided by the untrusted entity is valid. SPV can be done without checking the entire blockchain history. Polkadot uses this approach in its Relay Chain and the BTCRelay on the Ethereum blockchain uses this approach as well. Private blockchains do not always keep track of their state through Merkel trees and signatures produced by nodes participating in such private blockchains are rarely understood by outside parties not participating in the network. For that reason, the design principle of `Cactus` is to rely on the canonical validator node signatures for verifying proofs of blockchain states. Since `Cactus` should be able to incorporate any type of blockchain in the future, `Cactus` can not use the approach based on Merkle Trees.

b: A networkwide ledger view means that all network nodes have to be considered to derive the state of the blockchain which means that it is not the state of just one single blockchain node.

c: The validator nodes in `Cactus` have similarities with trusted third-party intermediaries. The terminology trusted third-party intermediaries, federation schemes, and notary schemes are used when a blockchain can retrieve the state of another blockchain through these intermediaries. In contrast, the terminology relay is used when a chain can retrieve the state of another blockchain through reading, writing, or event listening operations directly rather than relying on intermediaries. This terminology is used in the central Relay Chain in Polkadot and the BTCRelay on the Ethereum network.

d: There might be use cases where it is desired to duplicate an NFA on different ledgers. Nonetheless, we stick to the terminology that an NFA cannot be duplicated on a different ledger because an NFA can be represented as data packages on different ledgers in such cases. Data is a superset of NFAs.

e: In the case of data, the data can be copied from Blockchain A to Blockchain B. It is optional to lock/burn/delete the data object on Blockchain A after copying.


f: The process in Blockchain A and the process in Blockchain B can be seen to happen concurrently, and consecutively, in atomic swaps, and ledger interactions, respectively.

g: An action can be either a read transaction or a write transaction performed on Blockchain A or an event that is emitted by Blockchain A.
Some examples of that type of ledger interoperability are as follows:
* Cross-chain oracles which are smart contracts that read the state of another blockchain before acting on it.
* Smart contracts that wait until an event happens on another blockchain before acting on it.
* Asset encumbrance smart contracts which are smart contracts that lock up assets on Blockchain A with unlocking conditions depending on actions happening in Blockchain B.




h: Alternatively, any address from that assets cannot be recovered anymore can be used. A verifiable proof for the irreversible property of that address should be given.



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

 <tr> <td> D</td> <td >D</td><td><a href="#38-healthcare-data-sharing-with-access-control-lists">3.8</a><br><a href="#311-blockchain-migration">3.11</a></td><td><a href="#38-healthcare-data-sharing-with-access-control-lists" >3.8</a><br><a href="#39-integrate-existing-food-traceability-solutions">3.9</a></td><td>-</td><td>-</td><td>-</td><td rowspan="12"><a href="#310-end-user-wallet-authenticationauthorization"  >3.10</a></td>
  </tr>

 <tr> <td>FA</td><td >FA</td><td><a href="#34-ethereum-to-quorum-asset-transfer">3.4</a></td><td><a href="#37-stable-coin-pegged-to-other-currency">3.7</a></td><td><a href="#36-money-exchanges">3.6</a></td><td><a href="#36-money-exchanges">3.6</a></td><td><a href="#36-money-exchanges">3.6</a></td>
  </tr>

 <tr> <td>NFA</td><td>NFA</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td>
  </tr>

 <tr> <td>FA</td><td>D</td><td>-</td><td rowspan="3">-</td><td rowspan="3"><a href="#35-escrowed-sale-of-data-for-coins">3.5</a></td><td>-</td><td rowspan="3">-</td>
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

## 3.1 Car Trade

| Use Case Attribute Name    | Use Case Attribute Value                                                                                                                                                                                                                                                                                                                                                                                                                         |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Use Case Title             | Car Trade |
| Use Case                   | TBD |
| Interworking patterns      | TBD |
| Type of Social Interaction | TBD |
| Narrative                  | TBD |
| Actors                     | TBD |
| Goals of Actors            | TBD |
| Success Scenario           | TBD |
| Success Criteria           | TBD |
| Failure Criteria           | TBD |
| Prerequisites              | TBD |
| Comments                   |     |

## 3.2 Electricity Trade

| Use Case Attribute Name    | Use Case Attribute Value                                                                                                                                                                                                                                                                                                                                                                                                                         |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Use Case Title             | Electricity Trade |
| Use Case                   | TBD |
| Interworking patterns      | TBD |
| Type of Social Interaction | TBD |
| Narrative                  | TBD |
| Actors                     | TBD |
| Goals of Actors            | TBD |
| Success Scenario           | TBD |
| Success Criteria           | TBD |
| Failure Criteria           | TBD |
| Prerequisites              | TBD |
| Comments                   |     |

## 3.3 Supply chain

| Use Case Attribute Name    | Use Case Attribute Value                                                                                                                                                                                                                                                                                                                                                                                                                         |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Use Case Title             | Supply Chain |
| Use Case                   | TBD |
| Interworking patterns      | TBD |
| Type of Social Interaction | TBD |
| Narrative                  | TBD |
| Actors                     | TBD |
| Goals of Actors            | TBD |
| Success Scenario           | TBD |
| Success Criteria           | TBD |
| Failure Criteria           | TBD |
| Prerequisites              | TBD |
| Comments                   |     |

## 3.4 Ethereum to Quorum Asset Transfer

| Use Case Attribute Name    | Use Case Attribute Value                                                                                                                                                                                                                                                                                                                                                                                                                         |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Use Case Title             | Ethereum to Quorum Escrowed Asset Transfer                                                                                                                                                                                                                                                                                                                                                                                                                |
| Use Case                   | 1. `User A` owns some assets on an Ethereum ledger<br>2. `User A` asks `Exchanger` to exchange specified amount of assets on Ethereum ledger, and receives exchanged asset at the Quorum ledger.
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

## 3.5 Escrowed Sale of Data for Coins


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

## 3.6 Money Exchanges

Enabling the trading of fiat and virtual currencies in any permutation of possible pairs.

> On the technical level, this use case is the same as the one above and therefore the specific details were omitted.

## 3.7 Stable Coin Pegged to Other Currency


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

### 3.7.1 With Permissionless Ledgers (BTC)

A BTC holder can exchange their BTC for ExampleCoins by sending their BTC to `ExampleCoin Reserve Wallet` and the equivalent amount of coins get minted for them
onto their ExampleCoin wallet on the other network.

An ExampleCoin holder can redeem their funds to BTC by receiving a Proof of Burn on the ExampleCoin ledger and getting sent the matching amount of BTC from the `ExampleCoin Reserve Wallet` to their BTC wallet.

<img width="700" src="https://www.plantuml.com/plantuml/png/0/XP9FIyH03CNlyoc2dhmiui6JY5ln7tWG4KJmaft6TkWqgJFfrbNyxgPBLzP5yLQQlFpoNkOiAoRjsmWNRzXsaSubCDnHLL49Ab04zVR7EGqQ2QvN7QL8PKK9YYY-yJLQ_mqhLGar2CDbmfO6ISqp_pCoDu4xj7R8zDeJUvgd9CD37Np3b3CSRRKawRdqajZ8HuTRXHRVMcl6Yd9u9pW-_6NkdNaCFdJ82ZR6B0Gcvrx6LM7lGHH_-h_X9R5AMkq1Pb3o0VPlGrNhLS8LV3W0bjAKyuCViaUCaJIlHUI7RmqHhqMVxdC7EcMn2rpynOiHHEin_4cuZKHPR9XF5ACC4tIZBWvsZmptb2ajAKzpfisxzCVkewcJsMnskcbQrnsB4jZfBTN6pG6vX08iUZDed2N6dc117ljChe2GOO7URbI1MPdAyW9po09Hk79Z15OPrZj1BT4kDieGDFLPxHbPM45NCqU66kdEdTcdFUCl">

### 3.7.2 With Fiat Money (USD)

Very similar idea as with pegging against BTC, but the BTC wallet used for reserves
gets replaced by a traditional bank account holding USD.

<div style="page-break-after: always; visibility: hidden"><!-- \pagebreak --></div>

## 3.8 Healthcare Data Sharing with Access Control Lists

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

## 3.9 Integrate Existing Food Traceability Solutions

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

## 3.10 End User Wallet Authentication/Authorization

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

## 3.11 Blockchain Migration


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
Data migrations have been performed before on public blockchains [[2](#8-references), [3](#8-references), [4](#8-references)] to render flexibility to blockchain-based solutions.
Such work proposes data migration capabilities and patterns for public, permissionless blockchains, in which a user can specify requirements and scope for the blockchain infrastructure supporting their service.

### 3.11.1 Blockchain Data Migration
Data migration corresponds to capturing the subset of assets and data on a source blockchain and constructing a representation of those in a target blockchain. Note that the models underlying both blockchains do not need to be the same (e.g., world state model in Hyperledger Fabric vs account-balance model in Ethereum).
For migration to be effective, it should be possible to capture the necessary assets and data from the source blockchain and to write them on the target blockchain.


<img width="700" src="./use-case-sequence-diagram-blockchain-migration.png">

### 3.11.2 Blockchain Smart Contract Migration
The task of migrating a smart contract comprises the task of migrating the smart contract logic and data embedded in it. In specific, the data should be accessible and writeable on another blockchain. When the target blockchain can execute a smart contract written for the source blockchain, execution behaviour can be preserved by redeploying the same smart contract (e.g., reusing a smart contract written for Ethereum on Hyperldger Besu) and recreating its assets and data. If code reuse is not possible (either at source or binary code level), the target blockchain's virtual machine should support the computational complexity of the source blockchain (e.g., one cannot migrate all Ethereum smart contracts to Bitcoin, but the other way around is feasible).
Automatic smart contract migration (with or without translation) yields risks for enterprise blockchain systems, and thus the solution is nontrivial [[4](#8-references)].

### 3.11.3 Semi-Automatic Blockchain Migration

By expressing a user's preferences in terms of functional and non-functional requirements, `Cactus` can recommend a set of suitable blockchains, as the target for the migration.
Firstly, a user could know in real-time the characteristics of the target blockchain that would influence the migration decision. For instance, the platform can analyze the cost of writing data to Ethereum, Ether:USD exchange rate, average inter-block time, transaction throughput, and network hash rate [[3](#8-references)].
Based on those characteristics and user-defined requirements, `Cactus` proposes a migration with indicators such as predicted cost, time to complete the migration, and the likelihood of success.
For example, when transaction inclusion time or fee on Ethereum exceeds a threshold, `Cactus` may choose Polkadot platform, as it yields lower transaction inclusion time or fee. `Cactus` then safely migrate assets, data, and future transactions from Ethereum to Polkadot, without compromising the solution in production.
 This feature is more useful for public blockchains.


<div style="page-break-after: always; visibility: hidden"><!-- \pagebreak --></div>


# 4. Software Design

## 4.1. Principles

### 4.1.1. Wide support

Interconnect as many ecosystems as possible regardless of technology limitations

### 4.1.2. Plugin Architecture from all possible aspects

Identities, DLTs, service discovery. Minimize how opinionated we are to really embrace interoperability rather than silos and lock-in. Closely monitor community feedback/PRs to determine points of contention where core Hyperledger Cactus code could be lifted into plugins.  Limit friction to adding future use cases and protocols.

### 4.1.3. Prevent Double spending Where Possible

Two representations of the same asset do not exist across the ecosystems at the same time unless clearly labelled as such [As of Oct 30 limited to specific combinations of DLTs; e.g. not yet possible with Fabric + Bitcoin]

### 4.1.4 DLT Feature Inclusivity

Each DLT has certain unique features that are partially or completely missing from other DLTs.
Hyperledger Cactus - where possible - should be designed in a way so that these unique features are accessible even when interacting with a DLT through Hyperledger Cactus. A good example of this principle in practice would be Kubernetes CRDs and operators that allow the community to extend the Kubernetes core APIs in a reusable way.

### 4.1.5 Low impact

Interoperability does not redefine ecosystems but adapts to them. Governance, trust model and workflows are preserved in each ecosystem
Trust model and consensus must be a mandatory part of the protocol handshake so that any possible incompatibilities are revealed up front and in a transparent way and both parties can “walk away” without unintended loss of assets/data.
The idea comes from how the traditional online payment processing APIs allow merchants to specify the acceptable level of guarantees before the transaction can be finalized (e.g. need pin, signed receipt, etc.).
Following the same logic, we shall allow transacting parties to specify what sort of consensus, transaction finality, they require.
Consensus requirements must support predicates, e.g. “I am on Fabric, but will accept Bitcoin so long X number of blocks were confirmed post-transaction”
Requiring KYC (Know Your Customer) compliance could also be added to help foster adoption as much as possible.

### 4.1.6 Transparency

Cross-ecosystem transfer participants are made aware of the local and global implications of the transfer. Rejection and errors are communicated in a timely fashion to all participants.
Such transparency should be visible as trustworthy evidence.

### 4.1.7 Automated workflows

Logic exists in each ecosystem to enable complex interoperability use-cases. Cross-ecosystem transfers can be automatically triggered in response to a previous one.
Automated procedure, which is regarding error recovery and exception handling, should be executed without any interruption.

### 4.1.8 Default to Highest Security

Support less secure options, but strictly as opt-in, never opt-out.

### 4.1.9 Transaction Protocol Negotiation

Participants in the transaction must have a handshake mechanism where they agree on one of the supported protocols to use to execute the transaction. The algorithm looks an intersection in the list of supported algorithms by the participants.

### 4.1.10 Avoid modifying the total amount of digital assets on any blockchain whenever possible

We believe that increasing or decreasing the total amount of digital assets might weaken the security of blockchain, since adding or deleting assets will be complicated. Instead, intermediate entities (e.g. exchanger) can pool and/or send the transfer.

### 4.1.11 Provide abstraction for common operations

Our communal modularity should extend to common mechanisms to operate and/or observe transactions on blockchains.

### 4.1.12 Integration with Identity Frameworks (Moonshot)

Do not expend opinions on identity frameworks just allow users of `Cactus` to leverage the most common ones and allow for future expansion of the list of supported identity frameworks through the plugin architecture.
Allow consumers of `Cactus` to perform authentication, authorization and reading/writing of credentials.

Identity Frameworks to support/consider initially:

* [Hyperledger Indy (Sovrin)](https://www.hyperledger.org/projects/hyperledger-indy)
* [DIF](https://identity.foundation/)
* [DID](https://www.w3.org/TR/did-core/)

## 4.2 Feature Requirements

### 4.2.1 New Protocol Integration

Adding new protocols must be possible as part of the plugin architecture allowing the community to propose, develop, test and release their own implementations at will.

### 4.2.2 Proxy/Firewall/NAT Compatibility

Means for establishing bidirectional communication channels through proxies/firewalls/NAT wherever possible

### 4.2.3 Bi-directional Communications Layer

Using a blockchain agnostic bidirectional communication channel for controlling and monitoring transactions on blockchains through proxies/firewalls/NAT wherever possible.
   * Blockchains vary on their P2P communication protocols. It is better to build a modular method for sending/receiving generic transactions between trustworthy entities on blockchains.

### 4.2.4 Consortium Management

Consortiums can be formed by cooperating entities (person, organization, etc.) who wish to contribute hardware/network
resources to the operation of a `Cactus` cluster.

What holds the consortiums together is the consensus among the members on who the members are, which is defined by the
nodes' network hosts and public keys. The keys are produced from the Secp256k1 curve.

The consortium plugin(s) main responsibility is to provide information about the consortium's members, nodes and public keys.
`Cactus` does not prescribe any specific consensus algorithm for the addition or removal of consortium members, but
rather focuses on the technical side of making it possible to operate a cluster of nodes under the ownership of
separate entities without downtime while also keeping it possible to add/remove members.
It is up to authors of plugins who can implement any kind of consortium management functionality as they see fit.
The default implementation that Cactus ships with is in the `cactus-plugin-consortium-manual` package which - as the
name implies - leaves the achievement of consensus to the initial set of members who are expected to produce the initial
set of network hosts/public keys and then configure their Cactus nodes accordingly.
This process and the details of operation are laid out in much more detail in the dedicated section of the manual
consortium management plugin further below in this document.

After the forming of the consortium with it's initial set of members (one or more) it is possible to enroll or remove certain new or existing members, but this can vary based on different implementations.

## 4.3 Working Policies

1. Participants can insist on a specific protocol by pretending that they only support said protocol only.
2. Protocols can be versioned as the specifications mature
3. The two initially supported protocols shall be the ones that can satisfy the requirements for Fujitsu's and Accenture's implementations respectively

<div style="page-break-after: always; visibility: hidden"><!-- \pagebreak --></div>

# 5. Architecture

## 5.1 Deployment Scenarios

Hyperledger Cactus has several integration patterns as the following.

- Note: In the following description, **Value (V)** means numerical assets (e.g. money). **Data (D)** means non-numerical assets (e.g. ownership proof). Ledger 1 is source ledger, Ledger 2 is destination ledger.

| No. | Name                | Pattern | Consistency                                                                                    |
| --- | ------------------- | ------- | ---------------------------------------------------------------------------------------------- |
| 1.  | value transfer      | V -> V  | check if V1 = V2 <br> (as V1 is value on ledger 1, V2 is value on ledger 2)                    |
| 2.  | value-data transfer | V -> D  | check if data transfer is successful when value is transferred                                 |
| 3.  | data-value transfer | D -> V  | check if value transfer is successful when data is transferred                                 |
| 4.  | data transfer       | D -> D  | check if all D1 is copied on ledger 2 <br> (as D1 is data on ledger 1, D2 is data on ledger 2) |
| 5.  | data merge          | D <-> D | check if D1 = D2 as a result <br> (as D1 is data on ledger 1, D2 is data on ledger 2)          |


There's a set of building blocks (members, nodes, API server processes, plugin instances) that you can use when defining (founding) a consortium and these building blocks relate to each other in a way that can be expressed with an entity relationship diagram which can be seen below.
The composability rules can be deducted from how the diagram elements (entities) are connected (related) to each other, e.g. the API server process can have any number of plugin instances in it and a node can contain any number of API server processes, and so on until the top level construct is reached: the consortium.

> Consortium management does not relate to achieving consensus on data/transactions involving individual ledgers, merely about consensus on the metadata of a consortium.

<img width="400" src="./deployment-entity-relationship-diagram.png">

Now, with these composability rules in mind, let us demonstrate a few different deployment scenarios (both expected and exotic ones) to showcase the framework's flexibility in this regard.

### 5.1.1 Production Deployment Example

Many different configurations are possible here as well.
One way to have two members form a consortium and both of those members provide highly available, high throughput services is to have a deployment as shown on the below figure.
What is important to note here is that this consortium has 2 nodes, 1 for each member
and it is irrelevant how many API servers those nodes have internally because they
all respond to requests through the network host/web domain that is tied to the
node.
One could say that API servers do not have a distinguishable identity relative to
their peer API servers, only the higher-level nodes do.

<img width="700" src="./deployment-production-example.png">

### 5.1.2 Low Resource Deployment Example

This is an example to showcase how you can pull up a full consortium even from
within a single operating system process (API server) with multiple members and
their respective nodes. It is not something that's recommended for a production
grade environment, ever, but it is great for demos and integration tests where
you have to simulate a fully functioning consortium with as little hardware footprint
as possible to save on time and cost.

The individual nodes/API servers are isolated by listening on seperate TCP ports
of the machine they are hosted on:

<img width="700" src="./deployment-low-resource-example.png">


## 5.2 System architecture and basic flow

Hyperledger Cactus will provide integrated service(s) by executing ledger operations across multiple blockchain ledgers. The execution of operations are controlled by the module of Hyperledger Cactus which will be provided by vendors as the single Hyperledger Cactus Business Logic plugin.
The supported blockchain platforms by Hyperledger Cactus can be added by implementing new Hyperledger Cactus Ledger plugin.
Once an API call to Hyperledger Cactus framework is requested by a User, Business Logic plugin determines which ledger operations should be executed, and it ensures reliability on the issued integrated service is completed as expected.
Following diagram shows the architecture of Hyperledger Cactus based on the discussion made at Hyperledger Cactus project calls.
The overall architecture is as the following figure.

<img src="./cactus_arch.svg" width="700">

### 5.2.1 Definition of key components in system architecture

Key components are defined as follows:
- **Business Logic Plugin**: The entity executes business logic and provide integration services that are connected with multiple blockchains. The entity is composed by web application or smart contract on a blockchain. The entity is a single plugin and required for executing Hyperledger Cactus applications.
- **CACTUS Node Server**: The server accepts a request from an End-user Application, and return a response depending on the status of the targeted trade. Trade ID will be assigned when a new trade is accepted.
- **End-user Application**: The entity submits API calls to request a trade, which invokes a set of transactions on Ledger by the Business Logic Plugin.
- **Ledger Event Listener**: The standard interface to handle various kinds of events(LedgerEvent) regarding asynchronous Ledger operations. The LedgerEvent will be notified to appropriate business logic to handle it.
- **Ledger Plugin**: The entity communicates Business Logic Plugin with each ledger.  The entity is composed by a validator and a verifier as follows. The entity(s) is(are) chosen from multiple plugins on configuration.
- **Service Provider Application**: The entity submits API calls to control the cmd-api-server when it is enabling/disabling Ledger plugins, or shutting down the server. Additional commands may be available on Admin API since **Server controller** is implementation-dependent.
- **Validator**: The entity monitors transaction records of Ledger operation, and it determines the result(success, failed, timeouted) from the transaction records.
Validator ensure the determined result with attaching digital signature with "Validator key" which can be verified by "Verifier".
- **Validator Server**: The server accepts a connection from Verifier, and it provides Validator API, which can be used for issuing signed transactions and monitoring Ledger behind it. The LedgerConnector will be implemented for interacting with the Ledger nodes.
- **Verifier**: The entity accepts only sucussfully verified operation results by verifying the digital signature of the validator. Verifier will be instantiated by calling the VerifierFactory#create method with associated with the Validator to connect. Each Verifier may be temporarily enabled or disabled. Note that "Validator" is apart from "Verifier" over a bi-directional channel.
- **Verifier Registry**: The information about active Verifier. The VerifierFactory uses this information to instantiate Verifier for the Business Logic Plugin.

### 5.2.2 Bootstrapping Cactus application

Key components defined in 4.2.1 becomes ready to serve Cactus application service after  following procedures:
1. Start `Validator`: The `Validator` of `Ledger Plugin` which is chosen for each `Ledger` depending the platform technology used (ex. Fabric, Besu, etc.) will be started by the administrator of `Validator`. `Validator` becomes ready status to accept connection from `Verifier` after initialization process is done.
2. Start `Business Logic Plugin` implementation: The administrator of Cactus application service starts `Business Logic Plugin` which is implemented to execute business logic(s). `Business Logic Plugin` implementation first checks availability of depended `Ledger Plugin(s)`, then it trys to enable each `Ledger Plugin` with customized profile for actual integrating `Ledger`. This availability checks also covers determination on the status of connectivity from `Verifier` to `Validator`. The availability of each `Ledger` is registered and maintained at `Cactus Routing Interface`, and it allows bi-directional message communication between `Business Logic Plugin` and `Ledger`.

### 5.2.3 Processing Service API call

 `Service API call` is processed as follows:
- **Step 1**: "Application user(s)" submits an API call to "Cactus routing interface".
- **Step 2**: The API call is internally routed to "Business Logic Plugin" by "Cactus Routing Interface" for initiating associated business logic.
Then, "Business Logic Plugin" determines required ledger operation(s) to complete or abort a business logic.
- **Step 3**" "Business Logic Plugin" submits API calls to request operations on "Ledger(s)" wrapped with "Ledger Plugin(s)". Each API call will be routed to designated "Ledger Plugin" by "Routing Interface".
- **Step 4**: "Ledger Plugin" sends an event notification to "Business Logic Plugin" via "Cactus Routing Interface", when its sub-component "Verifier" detect an event regarding requested ledger operation to "Ledger".
- **Step 5**: "Business Logic Plugin" receives a message from "Ledger Plugin" and determines completion or continuous of the business logic. When the business logic requires to continuous operations go to "Step 3" ,or end the process.

<div style="page-break-after: always; visibility: hidden"><!-- \pagebreak --></div>

## 5.3 APIs and communication protocols between Cactus components

API for Service Application, communication protocol for business logic plugin to interact with "Ledger Plugins" will be described in this section.

### 5.3.1 Cactus Service API

Cactus Service API is exposed to Application user(s). This API is used to request for initializing a business logic which is implemented at **Business Logic Plugin**. It is also used for making inquery of execution status and final result if the business logic is completed.

Following RESTful API design manner, the request can be mapped to one of CRUD operation with associated resource 'trade'.

The identity of User Application is authenticated and is applied for access control rule(s) check which is implemented as part of **Business Logic Plugin**.

NOTE: we are still open to consider other choose on API design patterns, such as gRPC or GraphQL.

#### Open Endpoints

Open endpoints require no authentication

* [Login](login.md) : `POST /api/v1/bl/login`

#### Restricted Endpoints

Restricted endpoints requre a valid Token to be included in the headder of the request. A Token can be acquired by calling [Login]().

* [Request Execution of Trade(instance of business logic)]() : `POST /api/v1/bl/trades/`
* [Show Current Status of Trade]() : `GET /api/v1/bl/trades/(id)`
* [Show Business Logics]() : `GET /api/v1/bl/logics/`
* [Show Specification of Business Logic]() : `GET /api/v1/bl/logics/(id)`
* [Register a Wallet]() : `POST /api/v1/bl/wallets/`
* [Show Wallet List]() : `GET /api/v1/bl/wallets/`
* [Update Existing Wallets]() : `PUT /api/v1/bl/wallets/(id)`
* [Delete a Wallet]() : `DELETE /api/v1/bl/walllets/(id)`

NOTE: resource `trade` and `logic` are cannot be updated nor delete

### 5.3.2 Ledger plugin API

Ledger plugin API is designed for allowing **Business Logic Plugin** to operate and/or monitor Ledger behind the components of **Verifier** and **Validator**.

**Validator** provides a common set of functions that abstract communication between **Verifier** and **Ledger**.  Please note that Validator will not have any privilege to manipulate assets on the Ledger behind it.
**Verifier** can receive requests from **Business Logic Plugin** and reply responses and events asynchronously.

APIs of Verifier and Validator are described as the following table:

| No. | Component | API Name | Input | Description |
| --- | --- | --- | --- | --- |
| 1. | Verifier | getVerifierInformation | none | Get the verifier information including version, name, ID, and other information |
| 2. | Verifier | getSmartContractList | none | Get the list of available smart contracts at the connected ledger |
| 3. | Verifier | sendSignedTransaction | `signedTransaction`(string) | Request a verifier to execute a ledger operation |
| 4. | Verifier | getBalance | `address`(string) | Get balance of an account for native token on a ledger |
| 5. | Verifier | execSyncFunction | `address`(string)<br>`funcName`(string)<br>`args`(string[]) | Execute a synchronous function held by a smart contract |
| 6. | Verifier | startMonitor | `clientId`(string)<br>`cb`(function) | Request a verifier to start monitoring ledger |
| 7. | Verifier | stopMonitor | `clientId`(string) | Rrequest a verifier to stop monitoring ledger |
| 8. | Verifier | connect | `validatorURL`(string)<br>authentication credential | request a validator to start a bi-directional communication channel via a verifier |
| 9. | Verifier | disconnect | none | request a validator to stop a bi-directional communication channel via a verifier |
| 10. | Validator | getValidatorInformation | `validatorURL`(string) | Get the validator information including version, name, ID, and other information |
| 11. | Verifier | getSmartContractList | none | Get the list of available smart contracts at the connected ledger |
| 12. | Validator | sendSignedTransaction | `signedTransaction`(string) | Send already-signed transactions to a ledger |
| 13. | Validator | getBalance | `address`(string) | Get balance of an account for native token on a ledger |
| 14. | Validator | execSyncFunction | `address`(string)<br>`funcName`(string)<br>`args`(string[]) | Execute a synchronous function held by a smart contract |
| 15. | Validator | startMonitor | `clientId`(string)<br>`cb`(function) | Request a validator to start monitoring ledger |
| 16. | Validator | stopMonitor | `clientId`(string) | Request a validator to stop monitoring ledger |

The detail information is described as following:

- `package/ledger-plugin/ledger-plugin.js`
	- interface `Verifier`
		```
		interface Verifier {
			// BLP -> Verifier
			getSmartContractList(): List<ApiInfo>;
			sendSignedTransaction();
			getBalance();
			execSyncFunction();
			startMonitor();
			stopMonitor();
			connect();
			disconnect();
			// Validator -> Verifier
			getVerifierInfo(): List<VerifierInfo>;
		}
		```

		- class `SmartContractInfo`, `RequestedData`
			```
			class SmartContractInfo {
				address: string,
				function: List<SmartContractFunction>
			}
			class SmartContractFunction {
				functionName: string,
				functionArgs: List<string> (e.g. {"int", "string", ...})
			}
			```

		- class `VerifierInfo`
			```
			class VerifierInfo {
				version: string,
				name: string,
				ID: string,
				otherData: List<VerifierInfoOtherData>
			}
			class VerifierInfoOtherData {
				dataName: string,
				dataType: string {"int", "string", ...}
			}
			```

		- function `getSmartContractList()`: `List<SmartContractInfo>`
			- description:
				- Get the list of available smart contracts at the connected ledger
			- input parameter:
				- none

		- function `sendSignedTransaction()`: `Promise<LedgerEvent>`
			- description:
				- Send already-signed transactions to a ledger
			- input parameter:
				- `signedTransaction`(string): signed transaction which is already serialized to string

		- function `getBalance()`: `Promise<LedgerEvent>`
			- description:
				- Get balance of an account for native token on a ledger
				- If the connected ledger does not have any default currency system (e.g. Hyperledger fabric), the function is set to be blank)
			- input parameter:
				- `address`(string): an account address

		- function `execSyncFunction()`: `Promise<LedgerEvent>`
			- description:
				- Execute a synchronous function held by a smart contract
				- If the connected ledger does not have any smart contract system (e.g. Bitcoin), the function is set to be blank)
			- input parameter:
				- `address`(string): an address of a smart contract
				- `funcName`(string): a name of a synchronous function of the smart contract
				- `args`(string[]): arguments for the synchronous function

		- function `getVerifierInformation()`: `List<VerifierInfo>`
			- description:
				- Get the verifier information including version, name, ID, and other information
			- input parameter:
				- none

		- function `startMonitor()`: `Promise<LedgerEvent>`
			- description:
				- Request a verifier to start monitoring ledger
			- input parameter:
				- `clientId`(string): Client ID of the monitoring start request source
				- `cb`(function): Callback function that receives the monitoring result at any time

		- function `stopMonitor()`:
			- description:
				- Request a verifier to stop monitoring ledger
			- input parameter:
				- `clientId`(string): Client ID of the monitoring start request source

		- function `connect()`:
			- description:
				- Request a verifier to start a bi-directional communication channel
			- input parameter:
				- none
			- connecting profile:
				- `validatorURL`(string)
				- authentication credential

		- function `disconnect()`:
			- description:
				- Request a verifier to stop a bi-directional communication channel
			- input parameter:
				- none
			- connecting profile:
				- none

	- interface `Validator`
		```
		interface Validator {
			// Verifier -> Validator
			getValidatorInfo(): List<ValidatorInfo>
			getSmartContractList();
			sendSignedTransaction();
			getBalance();
			execSyncFunction();
			startMonitor();
			stopMonitor();
		}
		```

		- class `ValidatorInfo`
			```
			class ValidatorInfo {
				version: string,
				name: string,
				ID: string,
				otherData: List<ValidatorInfoOtherData>
			}
			class ValidatorInfoOtherData {
				dataName: string,
				dataType: string {"int", "string", ...}
			}
			```

		- function `getValidatorInformation()`:
			- description:
				- Get the validator information including version, name, ID, and other information
			- input parameter:
				- `validatorURL`(string)

		- function `getSmartContractList()`: `List<SmartContractInfo>`
			- description:
				- Get the list of available smart contracts at the connected ledger
			- input parameter:
				- none

		- function `sendSignedTransaction()`: `Promise<LedgerEvent>`
			- description:
				- Send already-signed transactions to a ledger
			- input parameter:
				- `signedTransaction`(string): signed transaction which is already serialized to string

		- function `getBalance()`: `Promise<LedgerEvent>`
			- description:
				- Get balance of an account for native token on a ledger
				- If the connected ledger does not have any default currency system (e.g. Hyperledger fabric), the function is set to be blank)
			- input parameter:
				- `address`(string) : an account address

		- function `execSyncFunction()`: `Promise<LedgerEvent>`
			- description:
				- Execute a synchronous function held by a smart contract
				- If the connected ledger does not have any smart contract system (e.g. Bitcoin), the function is set to be blank)
			- input parameter:
				- `address`(string): an address of a smart contract
				- `funcName`(string): a name of a synchronous function of the smart contract
				- `args`(string[]): arguments for the synchronous function

		- function `startMonitor()`: `Promise<LedgerEvent>`
			- description:
				- Request a verifier to start monitoring ledger
			- input parameter:
				- `clientId`(string): Client ID of the monitoring start request source
				- `cb`(function): Callback function that receives the monitoring result at any time

		- function `stopMonitor()`:
			- description:
				- Request a verifier to stop monitoring ledger
			- input parameter:
				- `clientId`(string): Client ID of the monitoring start request source

### 5.3.3 Exection of "business logic" at "Business Logic Plugin"

The developper of **Business Logic Plugin** can implement business logic(s) as codes to interact with **Ledger Plugin**.
The interaction between **Business Logic Plugin** and **Ledger Plugin** includes:
- Submit a transaction request on targeted **Ledger Plugin**
- Make a inquery to targeted **Ledger Plugin** (ex. account balance inquery)
- Receive an event message, which contains transaction/inquery result(s) or error from **Ledger Plugin**

NOTE: The transaction request is prepared by **Business Logic Plugin** using transaction template with given parameters

The communication protocol between Business Logic Plugin, Verifier, and Validator as following:

<img src="./communication-protocol-between-blp-and-lp.png" width="700">

## 5.4 Technical Architecture

### 5.4.1 Monorepo Packages

Hyperledger Cactus is divided into a set of npm packages that can be compiled separately or all at once.

All packages have a prefix of `cactus-*` to avoid potential naming conflicts with npm modules published by other Hyperledger projects. For example if both Cactus and Aries were to publish a package named `common` under the shared `@hyperledger` npm scope then the resulting fully qualified package name would end up being (without the prefix) as `@hyperledger/common` but with prefixes the conflict can be resolved as `@hyperledger/cactus-common` and `@hyperledger/aries-common`. Aries is just as an example here, we do not know if they plan on releasing packages under such names, but it also does not matter for the demonstration of ours.

Naming conventions for packages:
* cmd-* for packages that ship their own executable
* sdk-* for packages designed to be used directly by application developers except for the Javacript SDK which is named just `sdk` for simplicity.
* All other packages should be named preferably as a single English word suggesting the most important feature/responsibility of the package itself.

#### 5.4.1.1 cmd-api-server

A command line application for running the API server that provides a unified REST based HTTP API for calling code.
Contains the kernel of Hyperledger Cactus.
Code that is strongly opinionated lives here, the rest is pushed to other packages that implement plugins or define their interfaces.
Comes with Swagger API definitions, plugin loading built-in.

> By design this is stateless and horizontally scalable.

**The main responsibilities of this package are:**

##### 5.4.1.1.1 Runtime Configuration Parsing and Validation

The core package is responsible for parsing runtime configuration from the usual sources (shown in order of precedence):
* Explicit instructions via code (`config.setHttpPort(3000);`)
* Command line arguments (`--http-port=3000`)
* Operating system environment variables (`HTTP_PORT=3000`)
* Static configuration files (config.json: `{ "httpPort": 3000 }`)

The Apache 2.0 licensed node-convict library to be leveraged for the mechanical parts of the configuration parsing and validation: https://github.com/mozilla/node-convict

##### 5.4.1.1.2 Configuration Schema - API Server

To obtain the latest configuration options you can check out the latest source code of Cactus and then run this from the root folder of the project on a machine that has at least NodeJS 10 or newer installed:

```sh
$ date
Mon 18 May 2020 05:09:58 PM PDT

$ npx ts-node -e "import {ConfigService} from './packages/cactus-cmd-api-server/src/main/typescript/config/config-service'; console.log(ConfigService.getHelpText());"

Order of precedent for parameters in descdending order: CLI, Environment variables, Configuration file.
Passing "help" as the first argument prints this message and also dumps the effective configuration.

Configuration Parameters
========================

  plugins:
                Description: A collection of plugins to load at runtime.
                Default:
                Env: PLUGINS
                CLI: --plugins
  configFile:
                Description: The path to a config file that holds the configuration itself which will be parsed and validated.
                Default: Mandatory parameter without a default value.
                Env: CONFIG_FILE
                CLI: --config-file
  cactusNodeId:
                Description: Identifier of this particular Cactus node. Must be unique among the total set of Cactus nodes running in any given Cactus deployment. Can be any string of characters such as a UUID or an Int64
                Default: Mandatory parameter without a default value.
                Env: CACTUS_NODE_ID
                CLI: --cactus-node-id
  logLevel:
                Description: The level at which loggers should be configured. Supported values include the following: error, warn, info, debug, trace
                Default: warn
                Env: LOG_LEVEL
                CLI: --log-level
  cockpitHost:
                Description: The host to bind the Cockpit webserver to. Secure default is: 127.0.0.1. Use 0.0.0.0 to bind for any host.
                Default: 127.0.0.1
                Env: COCKPIT_HOST
                CLI: --cockpit-host
  cockpitPort:
                Description: The HTTP port to bind the Cockpit webserver to.
                Default: 3000
                Env: COCKPIT_PORT
                CLI: --cockpit-port
  cockpitWwwRoot:
                Description: The file-system path pointing to the static files of web application served as the cockpit by the API server.
                Default: packages/cactus-cmd-api-server/node_modules/@hyperledger/cactus-cockpit/www/
                Env: COCKPIT_WWW_ROOT
                CLI: --cockpit-www-root
  apiHost:
                Description: The host to bind the API to. Secure default is: 127.0.0.1. Use 0.0.0.0 to bind for any host.
                Default: 127.0.0.1
                Env: API_HOST
                CLI: --api-host
  apiPort:
                Description: The HTTP port to bind the API server endpoints to.
                Default: 4000
                Env: API_PORT
                CLI: --api-port
  apiCorsDomainCsv:
                Description: The Comma seperated list of domains to allow Cross Origin Resource Sharing from when serving API requests. The wildcard (*) character is supported to allow CORS for any and all domains, however using it is not recommended unless you are developing or demonstrating something with Cactus.
                Default: Mandatory parameter without a default value.
                Env: API_CORS_DOMAIN_CSV
                CLI: --api-cors-domain-csv
  publicKey:
                Description: Public key of this Cactus node (the API server)
                Default: Mandatory parameter without a default value.
                Env: PUBLIC_KEY
                CLI: --public-key
  privateKey:
                Description: Private key of this Cactus node (the API server)
                Default: Mandatory parameter without a default value.
                Env: PRIVATE_KEY
                CLI: --private-key
  keychainSuffixPrivateKey:
                Description: The key under which to store/retrieve the private key from the keychain of this Cactus node (API server)The complete lookup key is constructed from the ${CACTUS_NODE_ID}${KEYCHAIN_SUFFIX_PRIVATE_KEY} template.
                Default: CACTUS_NODE_PRIVATE_KEY
                Env: KEYCHAIN_SUFFIX_PRIVATE_KEY
                CLI: --keychain-suffix-private-key
  keychainSuffixPublicKey:
                Description: The key under which to store/retrieve the public key from the keychain of this Cactus node (API server)The complete lookup key is constructed from the ${CACTUS_NODE_ID}${KEYCHAIN_SUFFIX_PRIVATE_KEY} template.
                Default: CACTUS_NODE_PUBLIC_KEY
                Env: KEYCHAIN_SUFFIX_PUBLIC_KEY
                CLI: --keychain-suffix-public-key


```

##### 5.4.1.1.3 Plugin Loading/Validation

Plugin loading happens through NodeJS's built-in module loader and the validation is performed by the Node Package Manager tool (npm) which verifies the byte level integrity of all installed modules.

#### 5.4.1.2 core-api

Contains interface definitions for the plugin architecture and other system level components that are to be shared among many other packages.
`core-api` is intended to be a leaf package meaning that it shouldn't depend on other packages in order to make it safe for any and all packages to depend on `core-api` without having to deal with circular dependency issues.

#### 5.4.1.3 sdk

Javascript SDK (bindings) for the RESTful HTTP API provided by `cmd-api-server`.
Compatible with both NodeJS and Web Browser (HTML 5 DOM + ES6) environments.

#### 5.4.1.4 keychain

Responsible for persistently storing highly sensitive data (e.g. private keys) in an encrypted format.

For further details on the API surface, see the relevant section under `Plugin Architecture`.

#### 5.4.1.5 tracing

Contains components for tracing, logging and application performance management (APM) of code written for the rest of the Hyperledger Cactus packages.

#### 5.4.1.6 audit

Components useful for writing and reading audit records that must be archived longer term and immutable.
The latter properties are what differentiates audit logs from tracing/logging messages which are designed to be ephemeral and to support technical issues not regulatory/compliance/governance related issues.

#### 5.4.1.7 document-storage

Provides structured or unstructured document storage and analytics capabilities for other packages such as `audit` and `tracing`.
Comes with its own API surface that serves as an adapter for different storage backends via plugins.
By default, `Open Distro for ElasticSearch` is used as the storage backend: https://aws.amazon.com/blogs/aws/new-open-distro-for-elasticsearch/

<img width="700" src="https://www.plantuml.com/plantuml/png/0/ZLLHRzem47xthxZHXsrIWQ5gRmWL1jsgLHegQ4-L9cDVWaLYPxPJngR-zrsSX990QP5uyDtd-xwxyrskdUVMvsa2KoFo5BM7XJUMnmXJp1Ap2wQfuh7bAMDU-GJXsov3cw2CqS8aCM8ZrbnfkDKU2UQLqN13SDmQktdGRmhy7jn6wOpJ0UwKHayKOAnV6_RiSFWxHormRAtPBjTAR3Gw1rS746joBOMncgHzFh2d_4zAMA9twY_2rQSJOUTK2ILKnaaOHQ4KIGXxfxH8Seamz7d6fRtg2vEcHezEU2AZVPTlqPaK-v9xlk8EHun5HJMWyrgjEZ0SEXFvBRS8Sb-bqGWkxbIyzbzsNCC_nW0oBZP5AJlP9kwAL7PvfheExIFQ3d07P2Oh6KjRTV-hHIm20FqeYSpeeWUTFk7wZuE-adHKVjVdKdQ5nN3aoOCU3kzdYoMCvxSmqp8pgj0KU0Zv3CJAzr9yMJs4hYiVGbzfQeS_5xz470H-Eig-LbtdNP_FvtnReHPK7oMmq20IxbpDMxbTwJv9lC5Tw6LDN9_F4t-lK2yGrq5QnDx4wDVKo39UGuUtN52TQXdLyOIAXew9YfQ4HDjMi5AH3uvm9x2t27akbQ_fmk4DPEC2TsVY-2HZY984RqLR_XkyxVTJIwZjbVcLneSNLLN_v-2eyS5TLVznqBxz8qCzLSvRCrlCapnMkXt044861Bei848gJ_ibSBGE9vGZtNbv-2cgTAlc3W3GXZPF40Ib8eWCbNP6McYBBP1RiIuLoGZTlYXyLzNaPlnhEbwE9-F5x8DS3IuxdSjwOrrkryhZHxYuDpkUJ98SwnoqyGWhuxr9mKH7rIeckDeukKF7wi45QgqIZ6uqUeW508gOZ3Kd7NfvrXiTnM-TeIVDLXFkHD6FJNiq5PEnavjh3pdO8wor2munzRIorjX2xm0KtlPPH3MoZErdhv7_Njr1FvepyogSNPELllB_0G00">

> The API surface provided by this package is kept intentionally simple and feature-poor so that different underlying storage backends remain an option long term through the plugin architecture of `Cactus`.

#### 5.4.1.8 relational-storage

Contains components responsible for providing access to standard SQL compliant persistent storage.

> The API surface provided by this package is kept intentionally simple and feature-poor so that different underlying storage backends remain an option long term through the plugin architecture of `Cactus`.

#### 5.4.1.9 immutable-storage

Contains components responsible for providing access to immutable storage such as a distributed ledger with append-only semantics such as a blockchain network (e.g. Hyperledger Fabric).

> The API surface provided by this package is kept intentionally simple and feature-poor so that different underlying storage backends remain an option long term through the plugin architecture of `Cactus`.

### 5.4.2 Deployment Diagram

Source file: `./docs/architecture/deployment-diagram.puml`

<img width="700" src="https://www.plantuml.com/plantuml/png/0/ZLNHRjem57tFLzpnqasYJF3SeYQ43ZGAQ6LxgXGvpWKi73jo73eqzTzt7GA4aj4X8N1yphat9ySt3xbbnXQfX10pgNSfAWkXO2l3KXXD81W_UfxtIIWkYmJXBcKMZM3oAzTfgbNVku651f5csbYmQuGyCy8YB8L4sEa2mjdqPW4ACG6h8PEC8p3832x5xq-DmYXbjjOA-qsxacLMPn5V6vrYhFMc4PKmosAMauHdXQLEBc_kHOrs6Hg9oGeD15Bp3LypeM2iB1B02gtWaO3ugis6F5Yw_ywFg2R6SeZ5Ce4_dWTWa5kcLbIkzMorOIk4kT5RaQ1fEMIUTGa8z7doez1V-87_FFpypR1T6xhjKYXkdrJQq0eOtmYrWf3k1vmcjhvK4c-U-vvN_SMae5lN1gQQ_1Z88hTLxQtY5R4HFz4iWO19flY18EDZfN_pkftEjDAlq6V0WLQALjgyA0Wd2-XMs2YHjXln8-NjOsglHkrTK9lSyETZU4QpfSTRTu9b8c_meeQ-DCDnp3L7QkoZ9NkIEdjUnEHI5mcqvaKi1I_JPXJQaa6_X7uxPAqrJYXZmWhCosrnN9QQjV8BmrJEk7LPgKWxy4kI5QpgW3atOQYIw6UE9lBTBXRi4CZ1S3APZsRJMYAFH_4ybKyw5kMPsWf-FP2DVGLLNt5pNy6-h_ZGryIVBsRpQ33wCNiQ1hFPzrD_-s5mtbo8-SPDYC3eLv9xrzx9sr3areYui3IO9kKGs9jCyRfgxod6reNuse6c_IJklclleYof_Q-5ftFWQlS-hDtxi7RlqX_FZQcxJgVJtnyLpusEvZKX2UzIUtT_Vz-l1RHsqHbQMxefvtcKExYzxPyIHbVYyih-cPBi0wg4taj_0G00">

### 5.4.3 Component Diagram

<img width="700" src="https://www.plantuml.com/plantuml/png/0/ZLN1Rjim3BthAmXVrWQhiVGO546pPaK7x32i1NOPCCWownYH9LTKbdX9_tsKx2JsihRBIT9xV7mYAUUQl7H-LMaXVEarmesjQclGU9YNid2o-c7kcXgTnhn01n-rLKkraAM1pyOZ4tnf3Tmo4TVMBONWqD8taDnOGsXeHJDTM5VwHPM0951I5x0L02Cm73C1ZniVjzv9Gr85lTlIICqg4yYirIYDU1P2PiGKvI6PVtc8MhdsFQcue5LTM-SnFqrF4vWv9vkhKsZQnbPS2WPZbWFxld_Q4jTIQpmoliTj2sMXFWSaLciQpE-hmjP_ph7MjgduQ7-BlBl6Yg9nDNGtWLF7VSqsVzHQTq8opnqITTNjSGUtYI6aNeefkS7kKIg4v1CfPzTVdVrLvkXY7DOSDsJTU-jaWGCQdT8OzrPPVITDJWkvn6_uj49gxVZDWXm-HKzIAQozp3GEyn_gEpoUlfs7wb39NYAAYGWrAXwQeTu4XliWhxGaWkJXEAkTM7lB3evzZq2S1yO2ACAysekBsF49N5t9ed1OI8_JQOS-CxpRnaSYte6n7eE86VC6O0OyFOoP_PJ36Ao3oZfc7QOyRRdcU1H3CZo-3SWQaAQ9HBEgCdxNzX7EVgEpu2rKZ9s7N54BJHwDyFACBRwFviuXJOCj4OVtUSUN-jlpvT5pR-B3YFFiRBXskc7_1vClsmwFudyTzpAzPVwoCpzYxwH2ErJuz54PcieDEO3hLx3OtbTmgaz1qSv4CavWjqjJk-LbceuI7YB-26_ONBf_1SCjXMto8KqvahN3YgEm5litq-cC_W7oK8uX_aBM0K5SSvNu7-0F">

### 5.4.4 Class Diagram

### 5.4.5 Sequence Diagram - Transactions

TBD

<div style="page-break-after: always; visibility: hidden"><!-- \pagebreak --></div>

## 5.5 Transaction Protocol Specification

### 5.5.1 Handshake Mechanism

TBD

### 5.5.2 Transaction Protocol Negotiation

Participants in the transaction must have a handshake mechanism where they agree on one of the supported protocols to use to execute the transaction. The algorithm looks an intersection in the list of supported algorithms by the participants.

Participants can insist on a specific protocol by pretending that they only support said protocol only.
Protocols can be versioned as the specifications mature.
Adding new protocols must be possible as part of the plugin architecture allowing the community to propose, develop, test and release their own implementations at will.
The two initially supported protocols shall be the ones that can satisfy the requirements for Fujitsu’s and Accenture’s implementations respectively.
Means for establishing bi-directional communication channels through proxies/firewalls/NAT wherever possible

<div style="page-break-after: always; visibility: hidden"><!-- \pagebreak --></div>

## 5.6 Plugin Architecture

Since our goal is integration, it is critical that `Cactus` has the flexibility of supporting most ledgers, even those that don't exist today.

> A plugin is a self contained piece of code that implements a predefined interface pertaining to a specific functionality of `Cactus` such as transaction execution.

Plugins are an abstraction layer on top of the core components that allows operators of `Cactus` to swap out implementations at will.

> Backward compatibility is important, but versioning of the plugins still follows the semantic versioning convention meaning that major upgrades can have breaking changes.

Plugins are implemented as ES6 modules (source code) that can be loaded at runtime from the persistent data store. The core package is responsible for validating code signatures to guarantee source code integrity.

An overarching theme for all aspects that are covered by the plugin architecture is that there should be a dummy implementation for each aspect to allow the simplest possible deployments to happen on a single, consumer grade machine rather than requiring costly hardware and specialized knowledge.

> Ideally, a fully testable/operational (but not production ready) `Cactus` deployment could be spun up on a developer laptop with a single command (an npm script for example).

---

<img src="https://www.plantuml.com/plantuml/png/0/dLHDRzD043tZNp6O0wr4LQ3YKaLHdP90fBH4RRWXLPlrn5bblMjcn_dWrpEsK-mYIq5S8ddcpPjvRsPp4rWHbxc5kIqpuo0XlJQCcal2A7fjdBPbYZ3Wib0fNLrgd-VU3NioA-_uGkqm-1mlSxyq5a_2KiLggS9fu0OF9p41QOiqZ28sR16-7WeaYsc612FhzKQlbGYSEiQC51llO48gnvsdpG_NA_yjM5mni0SosPeXDIGfgPICijRlddApDowBmiQuGWaRVCQLAYqlSC-9DPdBqJ5e-K7ge6R68Sjyu8dNlfC8-BD4fp4Xyhl5skYDmn3WOmT2ldIfzkH4rwTEF5VxNB0gms1-8Lozxw6ToxADDeMIeOH5_951AfrAioU8awAmHZVcV1S_Or2XoNs0mS2aeiFm0VnEcW-7KZT9dkw-ZQQpyLcpyHItHkEx-Ax-4ZUgp_WyYfP-3_7OfJLjYE7Dh79qP4kCNZNDHtuPeG04UOIFfXDXAAm_L2u-rtmXF4G0sblRB2F8tFCfFDRhXtkVubauhoTF2jD41Lzqf4_Kaeo-zSvXrRhP_L_DPytbjFt_3Fseh3m1eNo-NeWRGhX7hgwfxjs4Zf6MMrJ2nR2T3AxXeLfEO5YGSa7Lac2yHrtMbrO5jegn8wOj5gPUBTTmA_VPptXywIrnlnkzqRRXKTW_J__I3a9vOEv5pGC6UJVXFrFHZJWiVsE_0G00" width="700" >

---

### 5.6.1 Ledger Connector Plugins

Success is defined as:
1. Adding support in `Cactus` for a ledger invented in the future requires no `core` code changes, but instead can be implemented by simply adding a corresponding connector plugin to deal with said newly invented ledger.
2. Client applications using the REST API and leveraging the feature checks can remain 100% functional regardless of the number and nature of deployed connector plugins in `Cactus`. For example: a generic money sending application does not have to hardcode the supported ledgers it supports because the unified REST API interface (fed by the ledger connector plugins) guarantees that supported features will be operational.

Because the features of different ledgers can be very diverse, the plugin interface has feature checks built into allowing callers/client applications to **determine programmatically, at runtime** if a certain feature is supported or not on a given ledger.

```typescript
export interface LedgerConnector {
  // method to verify a signature coming from a given ledger that this connector is responsible for connecting to.
  verifySignature(message, signature): Promise<boolean>;

  // used to call methods on smart contracts or to move assets between wallets
  transact(transactions: Transaction[]);

  getPermissionScheme(): Promise<PermissionScheme>;

  getTransactionFinality(): Promise<TransactionFinality>;

  addForeignValidator(): Promise<void>;
}

export enum TransactionFinality {
  GUARANTEED = "GUARANTEED",
  NOT_GUARANTEED = "NOT_GUARANTEED"
}

export enum PermissionScheme {
  PERMISSIONED = "PERMISSIONED",
  PERMISSIONLESS = "PERMISSIONLESS"
}

```
#### 5.6.1.1 Ledger Connector Besu Plugin

This plugin provides `Cactus` a way to interact with Besu networks. Using this we can perform:
* Deploy Smart-contracts through bytecode.
* Build and sign transactions using different keystores.
* Invoke smart-contract functions that we have deployed on the network.

#### 5.6.1.2 Ledger Connector Fabric Plugin

This plugin provides `Cactus` a way to interact with Fabric networks. Using this we can perform:
* Deploy Golang chaincodes.
* Make transactions.
* Invoke chaincodes functions that we have deployed on the network.

#### 5.6.1.3 Ledger Connector Quorum Plugin

This plugin provides `Cactus` a way to interact with Quorum networks. Using this we can perform:
* Deploy Smart-contracts through bytecode.
* Build and sign transactions using different keystores.
* Invoke smart-contract functions that we have deployed on the network.

### 5.6.2 HTLCs Plugins

Provides an API to deploy and interact with Hash Time Locked Contracts (HTLC), used for the exchange of assets in different blockchain networks.
HTLC use hashlocks and timelocks to make payments. Requires that the receiver of a payment acknowledge having received this before a deadline or he will lose the ability to claim payment, returning this to rhe payer.

#### 5.6.2.1 HTLC-ETH-Besu Plugin

For the network Besu case, this plugin uses [Leger Connector Besu Plugin](#5611-ledger-connector-besu-plugin) to deploy an HTLC contarct on the network and provides an API to interact with the HTLC ETH swap contracts.

#### 5.6.2.2 HTLC-ETH-ERC20-Besu Plugin
For the network Besu case, this plugin uses [Leger Connector Besu Plugin](#5611-ledger-connector-besu-plugin) to deploy an HTLC and ERC20 contarct on the network and provides an API to interact with this.
This plugin allow `Cactus` to interact with ERC-20 tokens in HTLC ETH swap contracts.

### 5.6.3 Identity Federation Plugins

Identity federation plugins operate inside the API Server and need to implement the interface of a common PassportJS Strategy:
https://github.com/jaredhanson/passport-strategy#implement-authentication

```typescript
abstract class IdentityFederationPlugin {
  constructor(options: any): IdentityFederationPlugin;
  abstract authenticate(req: ExpressRequest, options: any);
  abstract success(user, info);
  abstract fail(challenge, status);
  abstract redirect(url, status);
  abstract pass();
  abstract error(err);
}
```

#### 5.6.3.1 X.509 Certificate Plugin

The X.509 Certificate plugin facilitates clients authentication by allowing them to present a certificate instead of operating with authentication tokens.
This technically allows calling clients to assume the identities of the validator nodes through the REST API without having to have access to the signing private key of said validator node.

PassportJS already has plugins written for client certificate validation, but we go one step further with this plugin by providing the option to obtain CA certificates from the validator nodes themselves at runtime.

### 5.6.4 Key/Value Storage Plugins

Key/Value Storage plugins allow the higher-level packages to store and retrieve configuration metadata for a `Cactus` cluster such as:
* Who are the active validators and what are the hosts where said validators are accessible over a network?
* What public keys belong to which validator nodes?
* What transactions have been scheduled, started, completed?

```typescript
interface KeyValueStoragePlugin {
  async get<T>(key: string): Promise<T>;
  async set<T>(key: string, value: T): Promise<void>;
  async delete<T>(key: string): Promise<void>;
}
```

### 5.6.5 Serverside Keychain Plugins

The API surface of keychain plugins is roughly the equivalent of the key/value *Storage* plugins, but under the hood these are of course guaranteed to encrypt the stored data at rest by way of leveraging storage backends purpose built for storing and managing secrets.

Possible storage backends include self hosted software [1] and cloud native services [2][3][4] as well. The goal of the keychain plugins (and the plugin architecture at large) is to make `Cactus` deployable in different environments with different backing services such as an on-premise data center or a cloud provider who sells their own secret management services/APIs.
There should be a dummy implementation as well that stores secrets in-memory and unencrypted (strictly for development purposes of course). The latter will decrease the barrier to entry for new users and would be contributors alike.

Direct support for HSM (Hardware Security Modules) is also something the keychain plugins could enable, but this is lower priority since any serious storage backend with secret management in mind will have built-in support for dealing with HSMs transparently.

By design, the keychain plugin can only be used by authenticated users with an active `Cactus` session. Users secrets are isolated from each other on the keychain via namespacing that is internal to the keychain plugin implementations (e.g. users cannot query other users namespaces whatsoever).

```typescript
interface KeychainPlugin extends KeyValueStoragePlugin {
}
```

[1] https://www.vaultproject.io/
[2] https://aws.amazon.com/secrets-manager/
[3] https://aws.amazon.com/kms/
[4] https://azure.microsoft.com/en-us/services/key-vault/

<div style="page-break-after: always; visibility: hidden"><!-- \pagebreak --></div>

### 5.6.6 Manual Consortium Plugin

This plugin is the default/simplest possible implementation of consortium management.
It delegates the initial trust establishment to human actors to be done manually or offline if you will.

Once a set of members and their nodes were agreed upon, a JSON document containing the consortium metadata can be
constructed which becomes an input parameter for the `cactus-plugin-consortium-manual` package's implementation.
Members bootstrap the consortium by configuring their Cactus nodes with the agreed upon JSON document and start their
nodes.
Since the JSON document is used to generate JSON Web Signatures (JWS) as defined by
[RFC 7515](https://tools.ietf.org/html/rfc7515#section-7.2) it is important that every consortium member uses the same
JSON document representing the consortium.

> Attention: JWS is not the same as JSON Web Tokens (JWT). JWT is an extension of JWS and so they can seem very similar
> or even indistinguishable, but it is actually two separate things where JWS is the lower level building block that
> makes JWT's higher level use-cases possible. This is not related to Cactus itself, but is important to be mentioned
> since JWT is very well known among software engineers while JWS is a much less often used standard.

Example of said JSON document (the `"consortium"` property) as passed in to the plugin configuration can be
seen below:

```json
{
            "packageName": "@hyperledger/cactus-plugin-consortium-manual",
            "options": {
                "keyPairPem": "-----BEGIN PRIVATE KEY-----\nREDACTED\n-----END PRIVATE KEY-----\n",
                "consortium": {
                    "name": "Example Cactus Consortium",
                    "id": "2ae136f6-f9f7-40a2-9f6c-92b1b5d5046c",
                    "mainApiHost": "http://127.0.0.1:4000",
                    "members": [
                        {
                            "id": "b24f8705-6da5-433a-b8c7-7d2079bae992",
                            "name": "Example Cactus Consortium Member 1",
                            "nodes": [
                                {
                                    "nodeApiHost": "http://127.0.0.1:4000",
                                    "publicKeyPem": "-----BEGIN PUBLIC KEY-----\nMFYwEAYHKoZIzj0CAQYFK4EEAAoDQgAEtDeq7BgpelfsX7WKiSb7Lhxp8VeS6YY/\nInbYuTgwZ8ykGs2Am2fM03aeMX9pYEzaeOVRU6ptwaEBFYX+YftCSQ==\n-----END PUBLIC KEY-----\n"
                                }
                            ]
                        }
                    ]
                }
            }
        }
```

The configuration above will cause the `Consortium JWS` REST API endpoint (callable via the SDK) to respond with a
consortium JWS that looks similar to what is pasted below.

Code examples of how to use the SDK to call this endpoint can be seen at
`./packages/cactus-cockpit/src/app/consortium-inspector/consortium-inspector.page.ts`

```json
{
    "payload": "eyJjb25zb3J0aXVtIjp7ImlkIjoiMmFlMTM2ZjYtZjlmNy00MGEyLTlmNmMtOTJiMWI1ZDUwNDZjIiwibWFpbkFwaUhvc3QiOiJodHRwOi8vMTI3LjAuMC4xOjQwMDAiLCJtZW1iZXJzIjpbeyJpZCI6ImIyNGY4NzA1LTZkYTUtNDMzYS1iOGM3LTdkMjA3OWJhZTk5MiIsIm5hbWUiOiJFeGFtcGxlIENhY3R1cyBDb25zb3J0aXVtIE1lbWJlciAxIiwibm9kZXMiOlt7Im5vZGVBcGlIb3N0IjoiaHR0cDovLzEyNy4wLjAuMTo0MDAwIiwicHVibGljS2V5UGVtIjoiLS0tLS1CRUdJTiBQVUJMSUMgS0VZLS0tLS1cbk1GWXdFQVlIS29aSXpqMENBUVlGSzRFRUFBb0RRZ0FFdERlcTdCZ3BlbGZzWDdXS2lTYjdMaHhwOFZlUzZZWS9cbkluYll1VGd3Wjh5a0dzMkFtMmZNMDNhZU1YOXBZRXphZU9WUlU2cHR3YUVCRllYK1lmdENTUT09XG4tLS0tLUVORCBQVUJMSUMgS0VZLS0tLS1cbiJ9XX1dLCJuYW1lIjoiRXhhbXBsZSBDYWN0dXMgQ29uc29ydGl1bSJ9fQ",
    "signatures": [
        {
            "protected": "eyJpYXQiOjE1OTYyNDQzMzQ0NTksImp0aSI6IjM3NmJjMzk0LTBlYWMtNDcwZi04NjliLThkYWIzNDRmNmY3MiIsImlzcyI6Ikh5cGVybGVkZ2VyIENhY3R1cyIsImFsZyI6IkVTMjU2SyJ9",
            "signature": "ltnDyOe9WSdCk6f5Op8XlcnFoXUp3yJZgImsAvERnxWM-eeL6eX0MnCtfC5r3q6knt4kTTaUv8536SMCka_YyA"
        }
    ]
}
```

The same JWS after being decoded looks like this:

```json
{
    "payload": {
        "consortium": {
            "id": "2ae136f6-f9f7-40a2-9f6c-92b1b5d5046c",
            "mainApiHost": "http://127.0.0.1:4000",
            "members": [
                {
                    "id": "b24f8705-6da5-433a-b8c7-7d2079bae992",
                    "name": "Example Cactus Consortium Member 1",
                    "nodes": [
                        {
                            "nodeApiHost": "http://127.0.0.1:4000",
                            "publicKeyPem": "-----BEGIN PUBLIC KEY-----\nMFYwEAYHKoZIzj0CAQYFK4EEAAoDQgAEtDeq7BgpelfsX7WKiSb7Lhxp8VeS6YY/\nInbYuTgwZ8ykGs2Am2fM03aeMX9pYEzaeOVRU6ptwaEBFYX+YftCSQ==\n-----END PUBLIC KEY-----\n"
                        }
                    ]
                }
            ],
            "name": "Example Cactus Consortium"
        }
    },
    "signatures": [
        {
            "protected": {
                "iat": 1596244334459,
                "jti": "376bc394-0eac-470f-869b-8dab344f6f72",
                "iss": "Hyperledger Cactus",
                "alg": "ES256K"
            },
            "signature": "ltnDyOe9WSdCk6f5Op8XlcnFoXUp3yJZgImsAvERnxWM-eeL6eX0MnCtfC5r3q6knt4kTTaUv8536SMCka_YyA"
        }
    ]
}
```

The below sequence diagram demonstrates a real world example of how a consortium between two business organizations (who both
operate their own distributed ledgers) can be formed manually and then operated through the plugin discussed here.
There's many other ways to perform the initial agreement that happens offline, but a concrete, non-generic example is
provided here for ease of understanding:

<img width="700" src="./plugin-consortium-manual-bootstrap-sequence-diagram.png">

### 5.6.7 Test Tooling

Provides `Cactus` with a tool to test the diferent plugins of the proyect.


# 6. Identities, Authentication, Authorization

`Cactus` aims to provide a unified API surface for managing identities of an identity owner.
Developers using the `Cactus` Service API for their applications can support one or both of the below requirements:
1. Applications with a focus on access control and business process efficiency (usually in the enterprise)
2. Applications with a focus on individual privacy (usually consumer-based applications)

The following sections outline the high-level features of `Cactus` that make the above vision reality.

An end user (through a user interface) can issue API requests to
* register a username+password account (with optional MFA) **within** `Cactus`.
* associate their wallets to their `Cactus` account and execute transactions involving those registered wallet (transaction signatures performed either locally or remotely as explained above).
* execute a trade which executes a set of transactions across integrated Ledgers. `Cactus` may also executes recovery transaction(s) when the trade was failed with some reason. For example, recovery transactions may be executed to reverse executed transaction result using intermediate account which provide escrow trading service.

## 6.1 Definition of Identities in Cactus

Various identities are used at Cactus Service API.

**Cactus user ID**
* ID for user (behind web service application) to execute a Service API call.
* Service provider assign the role(s) and access right(s) of user in integrated service as part of `Business Logic Plugin`.
* The user can add Wallet(s) which is associated with account address and/or key.

**Wallet ID**
* ID for the user identity which is associated with authentication credential at integrated `Ledger`.
* It is recommended to store temporary credential here allowing minimal access to operate `Ledger` instead of giving full access with primary secret.
* Service API enables user to add/update/delete authentication credential for the Wallet.

**Ledger ID**
* ID for `Ledger Plugin` which is used at Wallet
* `Ledger ID` is assigned by administrator of integrated service, and provided for user to configure their own Wallet settings.
* The connectivity settings associated with the `Ledger ID` is also configured at `Ledger Plugin` by the administrator.

**Business Logic ID**
* ID for business logic to be invoked by Cactus user.
* Each business logic should be implemented to execute necessary transactions on integrated `Ledgers` without any interaction with user during its execution.
* Business logic may require user to setup access permission with storing credential before executing business logic call.


## 6.2 Transaction Signing Modes, Key Ownership

An application developer using `Cactus` can choose to enable users to sign their transactions locally on their user agent device without disclosing their private keys to `Cactus` or remotely where `Cactus` stores private keys server-side, encrypted at rest, made decryptable through authenticating with their `Cactus` account.
Each mode comes with its own pros and cons that need to be carefully considered at design time.

### 6.2.1 Client-side Transaction Signing

Usually a better fit for consumer-based applications where end users have higher expectation of individual privacy.

**Pros**
* Keys are not compromised when a `Cactus` deployment is compromised
* Operator of `Cactus` deployment is not liable for breach of keys (same as above)
* Reduced server-side complexity (no need to manage keys centrally)

**Cons**
* User experience is sub-optimal compared to sever side transaction signing
* Users can lose access permanently if they lose the key (not acceptable in most enterprise/professional use cases)

---

<img src="https://www.plantuml.com/plantuml/png/0/XLHXQnf14Fs-ls9geKt1n3JIBt8SEHkb0KD3jFqKaBtTKGVtTktiNjJI7z-vCr0j0Ry8i_FcxNjlvxoDINEgAmTV7Q5FC2MBC6FjepQ9WfU3fIU_LEeTUUDgwMQftcZB_Pu9LHLy_aPd4Nowr5kCeS9U5KfoU1PcTTAbZkU1QzoVnKJa5-IpCFABC3V4fj6d4YM7y6s_GNPebyWmTC6ipKgJXtkVSCcwpMJCki9juFMpFnkRmqM2581fkKfWYR45g8-WdGlRUKMx1XVNv3TQUE4E5xfsQOQxL3XXgHf-8p_8HwW9UKoY50AdLJXgHFnLepTOC8VjR4LcxJ56k3c2SAYzDO6zEFnoT5xfNILOlSH8ln7wrs_GFigwaA6D5b728ac94AN4TM3e59kD8tC8wOUyGGTqXBRt6R9CClAIyHx2LgxE9V5nCN_uFhoVZ2uEIsBnXGnsEmzj9L4qvRFF6Zs3_dMUVMWUF-irTTxvf7n826L8ALGG5d1C0kydJUBJzNxeQbG01vAR_qYoCeT7fXSjH78CBDujHX03vl2qhtH2NukZh5Vc2hs5vkhMm7Jqz7FqT57Iuh1qpNotCxmVmxIjszqGhGtshfWLms8wkh0kTJjt51DJMIUqC6aNhe6zndLrzIS_CJIGE4ohJRO9TsXa3jA_bLCdxjln4qq3qIEwjMFKTWzHLalkFIA0vWjK9pC76X4xW77WhMRxrfoEbnILkXLw-IVv2m00" width="700" >

---

### 6.2.2 Server-side Transaction Signing

Usually a better fit for enterprise applications where end users have most likely lowered their expectations of individual privacy due to the hard requirements of compliance, governance, internal or external policy enforcement.

**Pros**
* Frees end users from the burden of managing keys themselves (better user experience)
  * Improved compliance, governance

**Cons**
* Server-side breach can expose encrypted keys stored in the keychain

---

<img src="https://www.plantuml.com/plantuml/png/0/XLHTQzj047pNhzYgqBhWncbCNu8GaR5D3GuDiTkdG3YTrlAXqvrxj_97w8_ldXIeN5ByOhZTsTdPsPNlF0b7JQrXXMwF3bQgG5WxORoGfApXG6cKAQFedJ9IDvnDgDc9mer7qjQrDUaRcOqrz5aSqDiQHxNDbSQBi4AGo8M_3ApmT17ZssdIA2956k7RQOTEOr7oX1DjPIMtGXbO6CBIYNREkHCr7gohdin5ApHk2CY2K-MMe50EMq3q4OJMzl1SgsF0-KgPdM1UcE96D9hMUAHCCqkDXa3o3xeUQgaC4Yi5wsXhUmcFlneq4ZFdx66zLR8ow3tSz23EDgQGrXaM_hKNhyMnPgmeqQiNXF7r6xGFV09AgfrWKSp2Jh6GAEAfhOCus-sqafr9FzZN68I7DlS5aeGzCkpn2Uo1MwVi-3nxlly-MIndWsxn1UwLn65ytxxOYl2CFxN0rUpnv-nnaAjDjp3FTCDuifZtp_79947xxVWwJJw4vIUZy4wPmrX2o2sHhS5ku8m7tY_3UbRLQQ8RZ00wbfj_M239qmUdzeAPE1ne6YO1Xu740qyTz7Iy46B9A4yZD0M4xkqOqsoTJRBLR51e6iPJvScfl24iODdUN9ZsrR6hgzyfz8svPKTasuaF2eyekGxexzL5VN1NVZRcBLl5MXhZ-QwuOwyKmYSLdPlI4h3CrxB_5KLtdEM_XJy0" width="700" >

---

## 6.3 Open ID Connect Provider, Identity Provider

`Cactus` can authenticate users against *third party Identity Providers* or serve as an *Identity Provider* itself.
Everything follows the well-established industry standards of Open ID Connect to maximize information security and reduce the probability of data breaches.

## 6.4 Server-side Keychain for Web Applications

There is a gap between traditional web/mobile applications and blockchain applications (web 2.0 and 3.0 if you will) authentication protocols in the sense that blockchain networks rely on private keys belonging to a Public Key Infrastructure (PKI) to authenticate users while traditional web/mobile applications mostly rely on a centralized authority storing hashed passwords and the issuance of ephemeral tokens upon successful authentication (e.g. successful login with a password).
Traditional (Web 2.0) applications (that adhering security best practices) use server-side sessions (web) or secure keychains provided by the operating system (iOS, Android, etc.)
The current industry standard and state of the art authentication protocol in the enterprise application development industry is Open ID Connect (OIDC).

To successfully close the gap between the two worlds, `Cactus` comes equipped with an OIDC identity provider and a server-side key chain that can be leveraged by end user applications to authenticate once against Hyperledger Cactus and manage identities on other blockchains through that single Hyperledger Cactus identity.
This feature is important for web applications which do not have secure offline storage APIs (HTML localStorage is not secure).

Example: A user can register for a Hyperledger Cactus account, import their private keys from their Fabric/Ethereum wallets and then have access to all of those identities by authenticating once only against `Cactus` which will result in a server-side session (HTTP cookie) containing a JSON Web Token (JWT).

> Native mobile applications may not need to use the server-side keychain since they usually come equipped with an OS provided one (Android, iOS does).

<img width="700" src="https://www.plantuml.com/plantuml/png/0/bLLDRnen4BtlhnZHGqz0eUgbGYYaJLhKjAfASaEg77i0TxrZnpOXjCf_x-ooNqeMqXwGy7ZcpRmtuzcp48MFsyp03UcLHWLpXHHrtCDNGMAD6PyIFXk4ptk7tg1QeuTpOsKgDq8Jp2dYsekeBS6b5ndkh4-NT0elUGq6Ln6Y1Q_NcmXAUvGvGduLKarEC19SQSB8MS7wkB59Sn7mReiaSUQztLrlj4m9Gu1noyNRBIbfFN6rxrhsJ3naxCkb1FqRuUsR3jZlh8cMsWcAm2ZCcWj94c6CtVtCz8EcTP8u8LD6WTxv_B9csGCHu9QPLwnVNUK4FtcnXpy9WBtznKIXz_7gkb5cL4Gf4_K89XFfiRWGPZez5Z6k8yR_6F6jZg2d4O_CJ4RheJTppcXvQELDG5_457TvOJKdksDHEJ1PvUrc0LuOXXu71xkAE-4H53fZz_aOJAUbEX_sWbWTBhtMrANhld2EVxhFXToNjR2PhMmys6fr4QcG5q3Qp5bYTEWDsMzuFnfMTG_5DcxolymGbpIP_BXONCFi-nmkI3chyueEZ5j-M5wz3AvKlv7r9BnIZMCB__6P0hezLMnuDbMTlAkUBrWZBGkcqeWGolGLI3XSToOETwOVkErig7ApgRISphwuCuk3tv7y3T2f2bBS5nDLfQ_EfvD_ARsEfAv0sechwH_1GF5W3mxliCCsxh1H4rmiii7qI7V9HjvY1Bn8qlSm2y5ApTC5_4QNL3zIteUyJ9PKjOZHkz1Wm7bQu_04FPSVwpP34nzuQRM6g4IfHFaFb9DLDVtjH6I2mtmprSWUJR4lmaOxnZvZFFuU_GK0" >

In web 2.0 applications the prevalent authentication/authorization solution is Open ID Connect which bases authentication on passwords and tokens which are derived from the passwords.
Web 3.0 applications (decentralized apps or *DApps*) which interact with blockchain networks rely on private keys instead of passwords.

<div style="page-break-after: always; visibility: hidden"><!-- \pagebreak --></div>

# 7. Terminology

**Application user**: The user who requests an API call to a Hyperledger Cactus application or smart contract. The API call triggers the sending of the transaction to the remote ledger.

**Hyperledger Cactus Web application or Smart contract on a blockchain**: The entity executes business logic and provide integration services that include multiple blockchains.

**Tx verifier**: The entity verifies the signature of the transaction data transmitted over the secure bidirectional channel. Validated transactions are processed by the Hyperledger Cactus Web application or Smart Contract to execute the integrated business logic.

**Tx submitter**: The entity submits the remote transaction to the API server plug-in on one of the ledgers.

**API Server**: A Cactus package that is the backbone of the plugin architecture and the host component for all plugins with the ability to automaticaly wire up plugins that come with their own web services (REST or asynchronous APIs through HTTP or WebSockets for example)

**Cactus Node**: A set of identically configured API servers behind a single network host where the set size is customizable from 1 to infinity with the practical maximum being much lower of course. This logical distinction between node and API server is important because it allows consortium members to abstract away their private infrastructure details from the public consortium definition.

For example if a consortium member wants to have a highly available, high throughput service, they will be forced to run a cluster of API servers behind a load balancer and/or reverse proxy to achieve these system properties and their API servers may also be in an auto-scaling group of a cloud provider or (in the future) even run as Lambda functions. To avoid having to update the consortium definition (which requires a potentially costly consesus from other members) every time let's say an auto-scaling group adds a new API server to a node, the consortium member can define their presence in the consortium by declaring a single `Cactus Node` and then customize the underlying deployment as they see fit so long as they ensure that the previously agreed upon keys are used by the node and it is indeed accessible through the network host as declared by the `Cactus Node`.
To get a better understanding of the various, near-infinite deplyoment scenarios, head over to the [Deployment Scenarios](#57-deployment-scenarios) sub-section of the [Architecture](#5-architecture) top level section.

**Validator**: A module of Hyperledger Cactus which verifies validity of transaction to be sent out to the blockchain application.

**Lock asset**: An operation to the asset managed on blockchain ledger, which disable further operation to targeted asset. The target can be whole or partial depends on type of asset.

**Abort**: A state of Hyperledger Cactus which is determined integrated ledger operation is failed, and Hyperledger Cactus will execute recovery operations.

**Integrated ledger operation**: A series of blockchain ledger operations which will be triggered by Hyperledger Cactus. Hyperledger Cactus is responsible to execute 'recovery operations' when 'Abort' is occurred.

**Restore operation(s)**: Single or multiple ledger operations which is executed by Hyperledger Cactus to restore the state of integrated service before start of integrated operation.

**End User**: A person (private citizen or a corporate employee) who interacts with Hyperledger Cactus and other ledger-related systems to achieve a specific goal or complete a task such as to send/receive/exchange money or data.

**Business Organization**: A for-profit or non-profit entity formed by one or more people to achieve financial gain or achieve a specific (non-financial) goal. For brevity, *business organization* may be shortened to *organization* throughout the document.

**Identity Owner**: A person or organization who is in control of one or more identities. For example, owning two separate email accounts by one person means that said person is the identity owner of two separate identities (the email accounts). Owning cryptocurrency wallets (their private keys) also makes one an identity owner.

**Identity Secret**: A private key or a password that - by design - is only ever known by the identity owner (unless stolen).

**Credentials**: Could mean `user a` authentication credentials/identity proofs in an IT application or any other credentials in the traditional sense of the word such as a proof that a person obtained a bachelor's degree or a PhD.

**Ledger/Network/Chain**: Synonymous words meaning referring largely to the same thing in this paper.

**OIDC**: Open ID Connect authentication protocol

**PKI**: Public Key Infrastructure

**MFA**: Multi Factor Authentication

<div style="page-break-after: always; visibility: hidden"><!-- \pagebreak --></div>

# 8. Related Work
Blockchain interoperability is emerging as one of the crucial features of blockchain technology
A recent survey classifies blockchain interoperability studies in three categories: Cryptocurrency-directed interoperability approaches, Blockchain Engines, and Blockchain Connectors [[5](#8-references)]. Each category is further divided into sub-categories based on defined criteria.
Each category serves particular use cases.

![rw](./related-work-categories.png)


Cryptocurrency-directed interoperability approaches identify and define different strategies for chain interoperability across public blockchains, most of them implementing cryptocurrencies.

Blockchain engines are frameworks that provide reusable data, network, consensus, incentive, and contract layers for the creation of customized blockchains, serving general use-cases. Emerging blockchains are, for example, the Cosmos Network and Polkadot.

The Blockchain Connector category is composed of interoperability solutions that are not cryptocurrency-directed or blockchain engines. Several sub-categories exist: Trusted Relays, Blockchain Agnostic Protocols, Blockchain of Blockchains, and Blockchain Migrators”.

While Hyperledger Cactus has caracteristics from the the three categories, it can be considered a Blockchain Connector (namely a Trusted Relay). In particular, Cactus focuses on providing multiple use case scenarios via a trusted consortium.
Trusted relays allow the discovery of the target blockchains, appearing often in a permissioned blockchain environment, where cross-blockchain transactions are routed by trusted escrow parties. Thus, Cactus supports developers at building cross-chain dApps.

Depending on the validator plugin, the trust on the relay can be decentralized, making Cactus a decentralized, general-purpose, trustless relay.
The blockchain migrator feature paves the way for building a solution that performs data migration across blockchains.

# 9. References

1: [Heterogeneous System Architecture](https://en.wikipedia.org/wiki/Heterogeneous_System_Architecture) - Wikipedia, Retrieved at: 11th of December 2019

2: E Scheid and Burkhard Rodrigues, B Stiller. 2019. Toward a policy-based blockchain agnostic framework. 16th IFIP/IEEE International Symposium on Integrated Network Management (IM 2019) (2019)

3: Philipp Frauenthaler, Michael Borkowski, and Stefan Schulte. 2019. A Framework for Blockchain Interoperability and Runtime Selection.

4: H.M.N. Dilum Bandara, Xiwei Xu, and Ingo Weber. 2020. [Patterns for blockchain data migration](https://arxiv.org/abs/1906.00239). European Conf. on Pattern Languages of Programs 2020 (EuroPLoP 2020).

5: Belchior,  A.  Vasconcelos,  S.  Guerreiro,  and  M.  Correia,  “A  Surveyon Blockchain Interoperability: Past, Present, and Future Trends,”arXiv,2020. [Online]. Available: http://arxiv.org/abs/2005.14282

<div style="page-break-after: always; visibility: hidden"><!-- \pagebreak --></div>

# 10. Recommended Reference
Please use the following BibTex entry to cite this whitepaper:

@article{hyperledgercactus,
  title={Hyperledger Cactus Whitepaper v0.1},
  author={Montgomery, Hart and Borne-Pons, Hugo and Hamilton, Jonathan and Bowman, Mic and Somogyvari, Peter and Fujimoto, Shingo and Takeuchi, Takuma and Kuhrt, Tracy and Belchior, Rafael},
  journal={URL: https://github. com/hyperledger/cactus/blob/main/whitepaper/whitepaper. md},
  year={2020}
}