import hre, { ethers } from "hardhat";

import { ETHSynthChef__factory } from "../../typechain-types/factories/contracts/synth-chefs/ETHSynthChef.sol";
import { ArbitrumSynthChef__factory } from "../../typechain-types/factories/contracts/synth-chefs/ArbitrumSynthChef.sol";
import { AvaxSynthChef__factory } from "../../typechain-types/factories/contracts/synth-chefs/AvaxSynthChef.sol";
import { BSCSynthChef__factory } from "../../typechain-types/factories/contracts/synth-chefs/BSCSynthChef.sol";
import { FantomSynthChef__factory } from "../../typechain-types/factories/contracts/synth-chefs/FantomSynthChef.sol";
import { OptimismSynthChef__factory } from "../../typechain-types/factories/contracts/synth-chefs/OptimismSynthChef.sol/OptimismSynthChef__factory";
import { PolygonSynthChef__factory } from "../../typechain-types/factories/contracts/synth-chefs/PolygonSynthChef.sol";

import { assert } from "console";

import fs from "fs";
import path from "path";

export default async function deploySynthChef(wrapperAddress: string, feeCollector: string) {
    console.log("Deploy SynthChef");
    const network = hre.network.name.replace("hardhat", "teth");
    let owner = (await ethers.getSigners())[0];

    const chefs_config = JSON.parse(
        fs
            .readFileSync(path.join(__dirname, "synth_chef_config", "synth_chef_config.json"))
            .toString()
    );

    let chefAddress: string = "";
    let stableAddress: string = "";
    let pids = [];

    switch (network) {
        case "tftm": {
            const ChefFactory = (await ethers.getContractFactory(
                "FantomSynthChef"
            )) as FantomSynthChef__factory;
            const chef = await ChefFactory.deploy(
                chefs_config[network].masterChef,
                wrapperAddress,
                chefs_config[network].stable,
                chefs_config[network].rewardTokens,
                chefs_config[network].fee,
                feeCollector
            );
            await chef.deployed();

            await (await chef.grantRole(chef.ADMIN_ROLE(), await owner.getAddress())).wait();

            for (let pool of chefs_config[network].pools) {
                await (
                    await chef.addPool(
                        pool.lpToken,
                        pool.gaugeAddress,
                        pool.token0,
                        pool.token1,
                        pool.isStable
                    )
                ).wait();
                pids.push(pool.pid);
            }
            chefAddress = chef.address;
            stableAddress = chefs_config[network].stable;
            break;
        }
        case "tavax": {
            const ChefFactory = (await ethers.getContractFactory(
                "AvaxSynthChef"
            )) as AvaxSynthChef__factory;
            const chef = await ChefFactory.deploy(
                chefs_config[network].masterChef,
                chefs_config[network].router,
                wrapperAddress,
                chefs_config[network].stable,
                chefs_config[network].rewardTokens,
                chefs_config[network].fee,
                feeCollector
            );
            await chef.deployed();

            await (await chef.grantRole(chef.ADMIN_ROLE(), await owner.getAddress())).wait();

            for (let pool of chefs_config[network].pools) {
                // there is not needs add pool to chef
                pids.push(pool.pid);
            }
            chefAddress = chef.address;
            stableAddress = chefs_config[network].stable;
            break;
        }
        case "tbsc": {
            const ChefFactory = (await ethers.getContractFactory(
                "BSCSynthChef"
            )) as BSCSynthChef__factory;
            const chef = await ChefFactory.deploy(
                chefs_config[network].masterChef,
                chefs_config[network].router,
                wrapperAddress,
                chefs_config[network].stable,
                chefs_config[network].rewardTokens,
                chefs_config[network].fee,
                feeCollector
            );
            await chef.deployed();

            await (await chef.grantRole(chef.ADMIN_ROLE(), await owner.getAddress())).wait();

            for (let pool of chefs_config[network].pools) {
                // there is not needs add pool to chef
                pids.push(pool.pid);
            }
            chefAddress = chef.address;
            stableAddress = chefs_config[network].stable;
            break;
        }
        case "teth": {
            const ChefFactory = (await ethers.getContractFactory(
                "ETHSynthChef"
            )) as ETHSynthChef__factory;
            const chef = await ChefFactory.deploy(
                chefs_config[network].masterChef,
                wrapperAddress,
                chefs_config[network].stable,
                chefs_config[network].rewardTokens,
                chefs_config[network].fee,
                feeCollector
            );
            await chef.deployed();

            await (await chef.grantRole(chef.ADMIN_ROLE(), await owner.getAddress())).wait();

            for (let pool of chefs_config[network].pools) {
                await (
                    await chef.addPool(
                        pool.lpToken,
                        pool.pid,
                        pool.underlyingToken0,
                        pool.underlyingToken1,
                        pool.curveCompoundPool,
                        pool.convexReward
                    )
                ).wait();
                pids.push(pool.pid);
            }
            chefAddress = chef.address;
            stableAddress = chefs_config[network].stable;
            break;
        }
        case "top": {
            const ChefFactory = (await ethers.getContractFactory(
                "OptimismSynthChef"
            )) as OptimismSynthChef__factory;
            const chef = await ChefFactory.deploy(
                chefs_config[network].router,
                wrapperAddress,
                chefs_config[network].stable,
                chefs_config[network].rewardTokens,
                chefs_config[network].fee,
                feeCollector
            );
            await chef.deployed();

            await (await chef.grantRole(chef.ADMIN_ROLE(), await owner.getAddress())).wait();

            for (let pool of chefs_config[network].pools) {
                await (
                    await chef.addPool(
                        pool.lpToken,
                        pool.gaugeAddress,
                        pool.token0,
                        pool.token1,
                        pool.isStable
                    )
                ).wait();
                pids.push(pool.pid);
            }
            chefAddress = chef.address;
            stableAddress = chefs_config[network].stable;
            break;
        }
        case "tarb": {
            const ChefFactory = (await ethers.getContractFactory(
                "ArbitrumSynthChef"
            )) as ArbitrumSynthChef__factory;
            const chef = await ChefFactory.deploy(
                chefs_config[network].router,
                wrapperAddress,
                chefs_config[network].stable,
                chefs_config[network].rewardTokens,
                chefs_config[network].fee,
                feeCollector
            );
            await chef.deployed();

            await (await chef.grantRole(chef.ADMIN_ROLE(), await owner.getAddress())).wait();

            for (let pool of chefs_config[network].pools) {
                await (
                    await chef.addPool(
                        pool.lpToken,
                        pool.stargateAddress,
                        pool.token,
                        pool.stargateLPStakingPoolID,
                        pool.stargateRouterPoolID
                    )
                ).wait();
                pids.push(pool.pid);
            }
            chefAddress = chef.address;
            stableAddress = chefs_config[network].stable;
            break;
        }
        case "tmat": {
            const ChefFactory = (await ethers.getContractFactory(
                "PolygonSynthChef"
            )) as PolygonSynthChef__factory;
            const chef = await ChefFactory.deploy(
                chefs_config[network].router,
                wrapperAddress,
                chefs_config[network].stable,
                chefs_config[network].rewardTokens,
                chefs_config[network].fee,
                feeCollector
            );
            await chef.deployed();

            await (await chef.grantRole(chef.ADMIN_ROLE(), await owner.getAddress())).wait();

            for (let pool of chefs_config[network].pools) {
                await (
                    await chef.addPool(
                        pool.lpToken,
                        pool.stargateAddress,
                        pool.token,
                        pool.stargateLPStakingPoolID,
                        pool.stargateRouterPoolID
                    )
                ).wait();
                pids.push(pool.pid);
            }
            chefAddress = chef.address;
            stableAddress = chefs_config[network].stable;
            break;
        }

        default:
            throw "deploySynthChef: unavailable network:" + network;
    }

    assert(chefAddress !== "", "SynthChef was not deployed");

    console.log("Chef address: %s", chefAddress);

    return { stableAddress, chefAddress, pids };
}
