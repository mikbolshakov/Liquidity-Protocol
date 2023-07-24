import { ethers } from "hardhat";
import hre from "hardhat";
import { Faucet__factory } from "../../typechain-types/factories/contracts/Faucet__factory";
import path from "path";
import fs from "fs";

export default async function deployFaucet() {
    console.log("Deploy Faucet");
    const config = JSON.parse(fs.readFileSync(path.join(__dirname, "faucet_config", "faucet_config.json")).toString());

    const FaucetFactory = (await ethers.getContractFactory("Faucet")) as Faucet__factory;

    let faucet = await FaucetFactory.deploy();
    await faucet.deployed();

    await (await faucet.grantRole(faucet.ADMIN_ROLE(), config.faucetAdminAddress)).wait();

    console.log("faucet address: %s", faucet.address);

    return faucet.address;
}
