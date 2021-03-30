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

<img src="https://render.githubusercontent.com/render/math?math=O_1 =\text{ Object 1}">

<img src="https://render.githubusercontent.com/render/math?math=O_1^{begin}= \text{ State of object } \quad\!\!\!\! O_1 \quad \!\! \! \! \text{ at the beginning of transaction}">

<img src="https://render.githubusercontent.com/render/math?math=O_2^{begin} = \text{ State of object } \quad\!\!\!\! O_2 \quad\!\!\!\! \text{ at the beginning of transaction}">

<img src="https://render.githubusercontent.com/render/math?math=O_1^{end} = \text{ State of object } \quad\!\!\!\! O_1 \quad\!\!\!\! \text{ at the end of transaction}">

<img src="https://render.githubusercontent.com/render/math?math=O_2^{end} = \text{ State of object } \quad\!\!\!\! O_2 \quad\!\!\!\! \text{ at the end of transaction}">

<img src="https://render.githubusercontent.com/render/math?math=\overline{O}_1^{end} = \text{ Representation of object } \quad\!\!\!\! O_1\quad\!\!\!\! \text{ at the end of transaction in another blockchain}">

<img src="https://render.githubusercontent.com/render/math?math=\overline{O}_2^{end} = \text{ Representation of object } \quad\!\!\!\! O_2 \quad\!\!\!\! \text{ at the end of transaction in another blockchain}">

<img src="https://render.githubusercontent.com/render/math?math=T_1 =\text{ Transaction 1}">

<img src="https://render.githubusercontent.com/render/math?math=T_2 =\text{ Transaction 2}">

<img src="https://render.githubusercontent.com/render/math?math=\overline{T}_1 = \text{ Representation of transaction 1 } \quad\!\!\!\! (T_1) \quad\!\!\!\! \text{ in another blockchain}">

<img src="https://render.githubusercontent.com/render/math?math=\overline{T}_2 = \text{ Representation of transaction 2 } \quad\!\!\!\! (T_2) \quad\!\!\!\! \text{ in another blockchain}">

<img src="https://render.githubusercontent.com/render/math?math=E_1 =\text{ Event 1}">

<img src="https://render.githubusercontent.com/render/math?math=E_2(O_1||T_1||E_1) = \text{ Event 2 depends on }\quad\!\!\!\! O_1 \quad\!\!\!\!\text{ or }\quad\!\!\!\!T_1\quad\!\!\!\! \text{ or }\quad\!\!\!\!E_1">

<img src="https://render.githubusercontent.com/render/math?math=T_2(O_1||T_1||E_1) = \text{ Transaction 2 depends on }\quad\!\!\!\!O_1\quad\!\!\!\! \text{ or } \quad\!\!\!\!T_1\quad\!\!\!\! \text{ or }\quad\!\!\!\!E_1">





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


