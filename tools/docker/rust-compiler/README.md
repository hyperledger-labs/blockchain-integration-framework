# @hyperledger/cactus-rust-compiler<!-- omit in toc -->

A container image that can be used to compile Rust source code and then also
WASM pack it where necessary/applicable.

## Table of Contents<!-- omit in toc -->

- [Usage](#usage)
- [Build](#build)

## Usage

## Build

```sh
DOCKER_BUILDKIT=1 docker build -f ./tools/docker/rust-compiler/Dockerfile . --tag crc
```
