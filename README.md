![Cactus Logo Color](./images/HL_Cactus_Logo_Color.png)

# Hyperledger Cactus

 ![license](https://img.shields.io/github/license/hyperledger/cactus) [![CII Best Practices](https://bestpractices.coreinfrastructure.org/projects/4089/badge)](https://bestpractices.coreinfrastructure.org/projects/4089) [![codecov](https://codecov.io/gh/hyperledger/cactus/branch/main/graph/badge.svg?token=BJklIsqf1S)](https://codecov.io/gh/hyperledger/cactus)
 ![GitHub issues](https://img.shields.io/github/issues/hyperledger/cactus) ![Travis (.org)](https://img.shields.io/travis/hyperledger/cactus)

This project is an _Incubation_ Hyperledger project. For more information on the history of this project see the [Cactus wiki page](https://wiki.hyperledger.org/display/cactus). Information on what _Active_ entails can be found in
the [Hyperledger Project Lifecycle document](https://wiki.hyperledger.org/display/TSC/Project+Lifecycle).

Hyperledger Cactus aims to provide Decentralized, Secure and Adaptable Integration between Blockchain Networks.
Hyperledger Cactus is currently undergoing a major refactoring effort to enable the desired to-be architecture which will enable plug-in based collaborative development to increase the breadth of use cases & Ledgers supported.

## Scope of Project

As blockchain technology proliferates, blockchain integration will become an increasingly important topic in the broader blockchain ecosystem.  For instance, people might want to trade between multiple different blockchains that are run on different platforms. Hyperledger Cactus is a web application system designed to allow users to securely integrate different blockchains. It includes a set of libraries, data models, and SDK to accelerate development of an integrated services application. Our goal is to deliver a system that allows users of our code to securely conduct transactions between all of the most commonly used blockchains.

## Run the Examples

### Supply Chain Example

1. Run the following command to pull up the container that will run the example application and the test ledgers as well:
    ```sh
    docker run \
      --rm \
      --privileged \
      -p 3000:3000 \
      -p 3100:3100 \
      -p 3200:3200 \
      -p 4000:4000 \
      -p 4100:4100 \
      -p 4200:4200 \
      ghcr.io/hyperledger/cactus-example-supply-chain-app:2021-07-01--fix-1063-v2
    ```
2. Wait for the output to show the message `INFO (api-server): Cactus Cockpit reachable http://0.0.0.0:3100`
3. Visit http://localhost:3100 in a web browser with Javascript enabled
4. Use the graphical user interface to create data on both ledgers and observe that a consistent view of the data from different ledgers is provided.

Once the last command has finished executing, open link printed on the console with a web browser of your choice

### Car Trade Example

- The guidance is [here](./examples/cartrade/README.md).

### Electricity Trade Example

- The guidance is [here](./examples/electricity-trade/README.md).


## Documentation

* [Project Wiki](https://wiki.hyperledger.org/display/cactus): Schedule and logs of the maintainer meetings
* [Whitepaper](./whitepaper/whitepaper.md): The official document on Cactus design specifications
* [Contributing](./CONTRIBUTING.md): How to get from an idea to an approved pull request
* [Build](./BUILD.md): Instructions on how to set up the project for development

  ![Build Script Decision Tree](./docs/images/build-script-decision-tree-2021-03-06.png)
* [FAQ](./FAQ.md): A collection of frequently asked questions

## Contact
* mailing list: [cactus@lists.hyperledger.org](mailto:cactus@lists.hyperledger.org)
* rocketchat channel: [https://chat.hyperledger.org/channel/cactus](https://chat.hyperledger.org/channel/cactus).

## Build/Development Flow

To go from zero to hero with project setup and working on your contributions: [BUILD.md](./BUILD.md)

## Contributing
We welcome contributions to Hyperledger Cactus in many forms, and there’s always plenty to do!

Please review [contributing](/CONTRIBUTING.md) guidelines to get started.

## License
This distribution is published under the Apache License Version 2.0 found in the [LICENSE](/LICENSE) file.
