


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
  - [3.1 Ethereum to Quorum Asset Transfer](#31-ethereum-to-quorum-asset-transfer)
  - [3.2 Escrowed Sale of Data for Coins](#32-escrowed-sale-of-data-for-coins)
  - [3.3 Money Exchanges](#33-money-exchanges)
  - [3.4 Stable Coin Pegged to Other Currency](#34-stable-coin-pegged-to-other-currency)
    - [3.4.1 With Permissionless Ledgers (BTC)](#341-with-permissionless-ledgers-btc)
    - [3.4.2 With Fiat Money (USD)](#342-with-fiat-money-usd)
  - [3.5 Healthcare Data Sharing with Access Control Lists](#35-healthcare-data-sharing-with-access-control-lists)
  - [3.6 Integrate Existing Food Traceability Solutions](#36-integrate-existing-food-traceability-solutions)
  - [3.7 End User Wallet Authentication/Authorization](#37-end-user-wallet-authenticationauthorization)
  - [3.8 Blockchain Migration](#38-blockchain-migration)
    - [3.8.1 Blockchain Data Migration](#381-blockchain-data-migration)
    - [3.8.2 Blockchain Smart Contract Migration](#382-blockchain-smart-contract-migration)
    - [3.8.3 Semi-Automatic Blockchain Migration](#383-semi-automatic-blockchain-migration)
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

<div style="page-break-after: always; visibility: hidden"><!-- \pagebreak --></div>

# 1. Abstract

Blockchain technologies are growing in usage, but fragmentation is a big problem that may hinder reaching critical levels of adoption in the future.

We propose a protocol and it's implementation to connect as many of them as possible in an attempt to solve the fragmentation problem by creating a heterogeneous system architecture <sup>[1](#9-references)</sup>.
