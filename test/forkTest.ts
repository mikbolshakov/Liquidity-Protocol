import { ethers, setFork } from "hardhat";
import { expect } from "chai";

describe("Test provider hotswapping mid test", function () {
    before(async () => {
        await setFork("eth");
    });

    it("Fetches USDC on ETH", async () => {
        const usdc = await ethers.getContractAt("ERC20", "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48");
        expect(await usdc.symbol()).to.be.eq("USDC");
        expect(await usdc.decimals()).to.be.eq(6);
    });

    it("Fetches BUSD on BSC", async () => {
        await setFork("bsc");

        const usdc = await ethers.getContractAt("ERC20", "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56");
        expect(await usdc.symbol()).to.be.eq("BUSD");
        expect(await usdc.decimals()).to.be.eq(18);
    });
});
