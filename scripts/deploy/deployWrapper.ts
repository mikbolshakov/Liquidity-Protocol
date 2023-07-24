import hre, { ethers } from "hardhat";

import { UniswapWrapper__factory } from "../../typechain-types/factories/contracts/dex-wrappers/UniswapWrapper__factory";
import { VelodromeWrapper__factory } from "../../typechain-types/factories/contracts/dex-wrappers/VelodromeWrapper.sol";

import { assert } from "console";

import fs from "fs";
import path from "path";

export default async function deployWrapper(): Promise<string> {
    console.log("Deploy Wrapper");
    const network = hre.network.name.replace("hardhat", "teth");
    const wrapper_conf = JSON.parse(
        fs.readFileSync(path.join(__dirname, "wrapper_config", "wrapper_config.json")).toString()
    );

    let wrapperAddress: string = "";

    switch (network) {
        case "tftm":
        case "tavax":
        case "tbsc":
        case "teth":
        case "tarb":
        case "tmat":
            console.log("Uniswap wrapper");
            const UniswapWrapperFactory = (await ethers.getContractFactory(
                "UniswapWrapper"
            )) as UniswapWrapper__factory;
            const uniswapWrapper = await UniswapWrapperFactory.deploy(
                wrapper_conf[network].routerAddress,
                wrapper_conf[network].wNative
            );
            await uniswapWrapper.deployed();
            wrapperAddress = uniswapWrapper.address;
            break;
        case "top":
            console.log("Velodrome wrapper");
            const VelodromeWrapperFactory = (await ethers.getContractFactory(
                "VelodromeWrapper"
            )) as VelodromeWrapper__factory;
            const velodromWrapper = await VelodromeWrapperFactory.deploy(wrapper_conf[network].routerAddress);
            await velodromWrapper.deployed();
            wrapperAddress = velodromWrapper.address;
            break;

        default:
            throw "deployWrapper: unavailable network:" + network;
    }

    assert(wrapperAddress !== "", "Wrapper was not deployed");

    console.log("Wrapper address: %s", wrapperAddress);

    return wrapperAddress;
}
