# Hyperledger Cactus Example - Supply Chain App


## Usage

1. Execute the following from:
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
2. Observe the example application pulling up in the logs
   1. the test ledger containers,
   2. a test consortium with multiple members and their Cactus nodes
3. Wait for the output to show the message `INFO (api-server): Cactus Cockpit reachable http://0.0.0.0:3100`
4. Visit http://0.0.0.0:3100 in your web browser with Javascript enabled

## Building and running the container locally

```sh
# Change directories to the project root

# Build the dockar image and tag it as "scaeb" for supply chain app example backend
DOCKER_BUILDKIT=1 docker build -f ./examples/supply-chain-app/Dockerfile . -t scaeb

# Run the built image with ports mapped to the host machine as you see fit
# The --privileged flag is required because we use Docker-in-Docker for pulling
# up ledger containers from within the container in order to have the example
# be completely self-contained where you don't need to worry about running
# multiple different ledgers jus this one container.
docker run --rm -it --privileged -p 3000:3000 -p 3100:3100 -p 3200:3200 -p 4000:4000 -p 4100:4100 -p 4200:4200 scaeb
```

## Configuring and running the example as a process

1. If the `cactus-example-supply-chain-frontend` is in another directory from the default or need expose the API in another port, check the `process.env`
2. Execute the following command:

```
 npm run start
```
