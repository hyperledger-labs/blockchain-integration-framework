FROM rust:1.52.1-slim-bullseye

RUN apt update

# wasm-pack dependencies+install
RUN apt install -y build-essential pkg-config libssl-dev
RUN cargo install wasm-pack
