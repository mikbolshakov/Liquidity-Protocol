import { ethers } from "hardhat";
import hre from "hardhat";
import { TestnetChecker__factory } from "../../typechain-types/factories/contracts/testnet-checker/TestnetChecker__factory";
import path from "path";
import fs from "fs";

export default async function deployTestnetChecker() {
    console.log("Deploy TestnetChecker");

    const TestnetCheckerFactory = (await ethers.getContractFactory("TestnetChecker")) as TestnetChecker__factory;

    let checker = await TestnetCheckerFactory.deploy();
    await checker.deployed();

    console.log("checker address: %s", checker.address);

    return checker.address;
}
