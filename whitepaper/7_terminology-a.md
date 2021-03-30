# 7. Terminology

**Application user**: The user who requests an API call to a Hyperledger Cactus application or smart contract. The API call triggers the sending of the transaction to the remote ledger.

**Hyperledger Cactus Web application or Smart contract on a blockchain**: The entity executes business logic and provide integration services that include multiple blockchains.

**Tx verifier**: The entity verifies the signature of the transaction data transmitted over the secure bidirectional channel. Validated transactions are processed by the Hyperledger Cactus Web application or Smart Contract to execute the integrated business logic.

**Tx submitter**: The entity submits the remote transaction to the API server plug-in on one of the ledgers.

**API Server**: A Cactus package that is the backbone of the plugin architecture and the host component for all plugins with the ability to automaticaly wire up plugins that come with their own web services (REST or asynchronous APIs through HTTP or WebSockets for example)

**Cactus Node**: A set of identically configured API servers behind a single network host where the set size is customizable from 1 to infinity with the practical maximum being much lower of course. This logical distinction between node and API server is important because it allows consortium members to abstract away their private infrastructure details from the public consortium definition.

For example if a consortium member wants to have a highly available, high throughput service, they will be forced to run a cluster of API servers behind a load balancer and/or reverse proxy to achieve these system properties and their API servers may also be in an auto-scaling group of a cloud provider or (in the future) even run as Lambda functions. To avoid having to update the consortium definiton (which requires a potentially costly consesus from other members) every time let's say an auto-scaling group adds a new API server to a node, the consortium member can define their presence in the consortium by declaring a single `Cactus Node` and then customize the underlying deployment as they see fit so long as they ensure that the previously agreed upon keys are used by the node and it is indeed accessible through the network host as declared by the `Cactus Node`.
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
