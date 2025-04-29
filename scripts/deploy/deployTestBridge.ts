import hre from "hardhat";
import { ethers } from "hardhat";
import { TestBridge__factory } from "../../typechain-types/factories/contracts/bridge/TestBridge__factory";
import path from "path";
import fs from "fs";

export default async function deployTestBridge() {
    const config = JSON.parse(
        fs.readFileSync(path.join(__dirname, "bridge_config", "bridge_config.json")).toString()
    );

    console.log("Deploy Bridge");
    const network = hre.network.name.replace("hardhat", "teth");

    const BridgeFactory = (await ethers.getContractFactory("TestBridge")) as TestBridge__factory;

    let bridge = await BridgeFactory.deploy();
    await bridge.deployed();
    await (await bridge.grantRole(await bridge.ADMIN_ROLE(), config.bridgeKeeperAddress)).wait();

    for (const token in config["tokens"]) {
        let token_conf = config["tokens"][token]["networks"][network];
        let id = token_conf["id"];
        let address = token_conf["address"];
        await (await bridge.addTokenId(id, address)).wait();
    }

    console.log("Bridge address: ", bridge.address);
    return bridge.address;
}
