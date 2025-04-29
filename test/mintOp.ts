import { BigNumber } from "ethers";
import { ethers, setFork } from "hardhat";
import { mintOp } from "../scripts/utils/mintOp";
import { expect } from "chai";

describe("Test mint op token", function () {
    it("Mint USDC on eth", async () => {
        await setFork("eth");
        const toMint = BigNumber.from(10).pow(6).mul(1337);

        const [owner] = await ethers.getSigners();
        const USDC = await ethers.getContractAt(
            "ERC20",
            "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"
        );

        const balBefore = await USDC.balanceOf(owner.address);

        await mintOp("teth", USDC.address, toMint, owner);

        const balAfter = await USDC.balanceOf(owner.address);
        expect(balAfter.sub(balBefore)).to.eq(toMint);
    });
});
