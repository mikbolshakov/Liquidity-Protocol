import hre from "hardhat";

import deployContracts from "../deploy/deployContracts";
import deployTestBridge from "../deploy/deployTestBridge";
import deployFaucet from "../deploy/deployFaucet";
import deployTestnetChecker from "../deploy/deployTestnetChecker";

import fs from "fs";
import path from "path";

function isTestnet(net: string): boolean {
    switch (net) {
        case "tbsc":
        case "teth":
        case "tavax":
        case "tftm":
        case "top":
        case "tarb":
        case "tmat":
            return true;
        case "bsc":
        case "eth":
        case "avax":
        case "ftm":
        case "op":
        case "arb":
        case "mat":
            return false;
        default:
            return true;
    }
}

// synapse bridge addresses
function getBridgeAddress(net: string): string {
    switch (net) {
        case "bsc":
            return "0x749F37Df06A99D6A8E065dd065f8cF947ca23697";
        case "eth":
            return "0x2796317b0fF8538F253012862c06787Adfb8cEb6";
        case "avax":
            return "0x0EF812f4c68DC84c22A4821EF30ba2ffAB9C2f3A";
        case "ftm":
            return "0xB003e75f7E0B5365e814302192E99b4EE08c0DEd";
        case "op":
            return "0x470f9522ff620eE45DF86C58E54E6A645fE3b4A7";
        case "arb":
            return "0x37f9aE2e0Ea6742b9CAD5AbCfB6bBC3475b3862B";
        case "mat":
            return "0x8F5BBB2BB8c2Ee94639E55d5F41de9b4839C1280";
        default:
            throw "Unavailable network:" + net;
    }
}

export async function scaffold(net: string = hre.network.name) {
    let addresses;
    let BRIDGE_ADDR = "";
    let FAUCET_ADDR = "";
    let TESTNET_CHECKER = "";

    if (isTestnet(net)) {
        // in case when we redeploy contracts in testnet - we can use deployed bridge and faucet
        if (fs.existsSync(`./scripts/deploy/addresses/${net}_addresses.json`) && net !== "hardhat") {
            addresses = JSON.parse(fs.readFileSync(`./scripts/deploy/addresses/${net}_addresses.json`).toString());
        } else {
            addresses = {};
        }

        if (addresses.bridge === "" || addresses.bridge === undefined) {
            BRIDGE_ADDR = await deployTestBridge();
        } else {
            BRIDGE_ADDR = addresses.bridge;
        }

        if (addresses.faucet === "" || addresses.faucet === undefined) {
            FAUCET_ADDR = await deployFaucet();
        } else {
            FAUCET_ADDR = addresses.faucet;
        }

        if (addresses.checker === "" || addresses.checker === undefined) {
            TESTNET_CHECKER = await deployTestnetChecker();
        } else {
            TESTNET_CHECKER = addresses.checker;
        }
    } else {
        BRIDGE_ADDR = getBridgeAddress(net);
    }

    addresses = await deployContracts(BRIDGE_ADDR, isTestnet(net));
    addresses = { ...addresses, faucet: FAUCET_ADDR, checker: TESTNET_CHECKER };
    fs.writeFileSync(path.join(`./scripts/deploy/addresses/${net}_addresses.json`), JSON.stringify(addresses, null, 2));

    return addresses;
}

if (process.argv[1] === __filename) {
    scaffold().catch(console.log);
}
