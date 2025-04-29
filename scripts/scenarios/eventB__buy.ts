import { ethers } from "hardhat";
import { ERC20 } from "../../typechain-types/@openzeppelin/contracts/token/ERC20/ERC20";
import { EntangleRouter } from "../../typechain-types/contracts/EntangleRouter.sol/EntangleRouter";
import { EntangleSynthFactory } from "../../typechain-types/contracts/EntangleSynthFactory";
import { ftm, avax } from "../deploy/addresses";

async function main() {
    process.env.NETWORK_URL = "http://127.0.0.1:8543";
    const c1 = ethers.providers.getDefaultProvider("http://127.0.0.1:8543");
    const c2 = ethers.providers.getDefaultProvider("http://127.0.0.1:8544");

    ethers.providers;

    const s1 = new ethers.Wallet(process.env.PRIVATE_KEY as string, c1);
    const s2 = new ethers.Wallet(process.env.PRIVATE_KEY as string, c2);
    console.log(ethers.providers);
    // const opToken__s2 = await ethers.getContractAt('EntangleSynth', ftm.opToken, s2) as ERC20;
    const router__s1 = (await ethers.getContractAt(
        "EntangleRouter",
        avax.router,
        s1
    )) as EntangleRouter;
    // const factory__s1 = await ethers.getContractAt('EntangleSynthFactory', avax.factory, s1) as EntangleSynthFactory

    // const synth = await factory__s1.synths(await s2.getChainId(), ftm.chef, 0);

    // await (await opToken__s2.transfer(ftm.idex, BigInt(100000000))).wait()
    // await (await router__s1.buy(synth, 25000000)).wait()
}

main().catch((_error) => console.log(_error));
