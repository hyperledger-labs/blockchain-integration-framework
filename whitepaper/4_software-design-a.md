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
