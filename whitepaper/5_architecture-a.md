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
- ~~**Application user**: The entity submits API calls to "Cactus Routing Interface". Note: this component is exist outside of Cactus service system.~~
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
- ~~**Cactus Routing Interface**: The entity is a routing service between "Business Logic Plugin" and  "Ledger Plugin(s)". The entity is also a routing service between Business Logic Plugin and API calls from "Application user(s)".~~
- ~~**Ledger-n**: DLT platforms(e.g. Ethereum, Quorum, Hyperledger Fabric, ...)~~

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
