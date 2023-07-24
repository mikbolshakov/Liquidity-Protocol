#!/usr/bin/env bash

declare -a networks=("teth" "tbsc" "top" "tavax" "tarb" "tftm" "tmat")

npx hardhat compile
for network in "${networks[@]}"
do
    npx hardhat --network "${network}" run ./scripts/scaffold/index.ts &
    sleep 1
done
