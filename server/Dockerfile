FROM rust:slim-buster as build

# 1. Create binary from rust sources
# create a new empty shell project
RUN USER=root cargo new --bin server
WORKDIR /server

# copy over your manifests
COPY ./Cargo.lock ./Cargo.lock
COPY ./Cargo.toml ./Cargo.toml

RUN update-ca-certificates && apt-get update && apt-get install -y libssl-dev && apt-get install -y pkg-config && rm -rf /var/lib/apt/lists/*
RUN rm src/*.rs

# copy required source files
COPY ./src ./src
COPY ./prisma ./prisma
COPY ./prisma_cli ./prisma_cli
COPY ./.cargo ./.cargo
RUN rm src/db.rs

# generate db.rs 
RUN cargo run -p prisma_cli -- generate
# build for release
RUN cargo build --bin server --release

# 2. Migrate to execution environment
# final image without rust (smaller), since we just run a binary
FROM debian:buster-slim

# copy the build artifact from the build stage
COPY --from=build /server/target/release/server .

RUN apt-get update && apt-get install -y libssl-dev && apt-get install -y pkg-config && rm -rf /var/lib/apt/lists/*

# set the startup command to run your binary
CMD ["./server"]