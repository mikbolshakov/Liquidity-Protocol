import { expect } from "chai";
import { ethers, upgrades, setFork } from "hardhat";
import { readFile } from "fs/promises";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber } from "ethers";
import { mintOp } from "../scripts/utils/mintOp";
import { CurveCompoundConvexSynthChef, ERC20, SpiritSwapSynthChef } from "../typechain-types";

const USDC_ADDRESS = "0x04068DA6C83AFCFA0e13ba15A6696662335D5B75";
const DAI_ADDRESS = "0x8D11eC38a3EB5E956B052f67Da8Bdc9bef8Abf3E";
const LP_TOKEN_ADDRESS = "0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83 "; // ???
const POOL_ADDRESS = "0x09855B4ef0b9df961ED097EF50172be3e6F13665";
const FARM_ADDRESS = "0x9ad5E3Fcc5a65D3675139e50C7a20E6f30Fd80A0";
const poolId = 1;

async function getAbi(path: string) {
    const data = await readFile(path, "utf8");
    const abi = new ethers.utils.Interface(JSON.parse(data));
    return abi;
}

async function getContract(pathToAbi: string, deployedAddress: string) {
    const abi = await getAbi(pathToAbi);
    const prov = new ethers.providers.JsonRpcProvider("http://localhost:8545");
    return new ethers.Contract(deployedAddress, abi, prov);
}

describe("SpiritSwap test", () => {
    let USDC: ERC20;
    let DAI: ERC20;
    before(async () => {
        await setFork("fantom");
        const toMint = BigNumber.from(10).pow(6).mul(300000);

        const [owner] = await ethers.getSigners();
        USDC = await ethers.getContractAt("ERC20", USDC_ADDRESS);
        DAI = await ethers.getContractAt("ERC20", DAI_ADDRESS);
        await mintOp("teth", USDC.address, toMint, owner);
    });

    let Chef: SpiritSwapSynthChef;

    it("Deploys", async () => {
        const SynthChef = await ethers.getContractFactory("SpiritSwapSynthChef");
        const chef = await upgrades.deployProxy(SynthChef, [POOL_ADDRESS], {
            kind: "uups",
        });
        expect(chef.address).to.not.eq(ethers.constants.AddressZero);
        Chef = chef as SpiritSwapSynthChef;
    });

    it("Add pool", async () => {
        const myStructData = ethers.utils.AbiCoder.prototype.encode(
            ["address", "address", "address", "address", "bool"],
            [LP_TOKEN_ADDRESS, FARM_ADDRESS, DAI_ADDRESS, USDC_ADDRESS, true]
        );
        await Chef.addPool(poolId, myStructData);
    });

    it("Swap usdc to dai", async () => {
        let signers: SignerWithAddress[];
        signers = await ethers.getSigners();
        const uni = await getContract("./test/ABI/SpiritSwap.json", POOL_ADDRESS);

        await USDC.approve(POOL_ADDRESS, ethers.constants.MaxUint256);
        const USDAmt = 100_000;
        await uni
            .connect(signers[0])
            .swapExactTokensForTokens(
                BigNumber.from(10).pow(6).mul(USDAmt),
                1,
                [USDC_ADDRESS, DAI_ADDRESS],
                signers[0].address,
                Date.now()
            );

        expect((await DAI.balanceOf(signers[0].address)).gt(0)).to.be.true;
    });

    it("Correct coins", async () => {
        let [uToken0, uToken1] = await Chef.getPoolTokens(poolId);
        expect(uToken0).to.equal(DAI_ADDRESS);
        expect(uToken1).to.equal(USDC_ADDRESS);
    });

    it("Depost", async () => {
        const uAmount0 = ethers.utils.parseEther("1000");
        const uAmount1 = ethers.utils.parseUnits("1000", 6);

        let lpAmountBeforeDeposit = await Chef.getTotalLpBalance(poolId);
        expect(lpAmountBeforeDeposit).to.equal(0);

        await DAI.transfer(Chef.address, ethers.utils.parseEther("1000"));
        await USDC.transfer(Chef.address, ethers.utils.parseUnits("1000", 6));
        console.log("DAI contract balance: %s", await DAI.balanceOf(Chef.address));
        console.log("USDC contract balance: %s", await USDC.balanceOf(Chef.address));

        const tx = await Chef.deposit(poolId, [uAmount0, uAmount1]);
        await tx.wait();
        let lpAmountAfterDeposit = await Chef.getTotalLpBalance(poolId);
        expect(lpAmountAfterDeposit.gt(0)).to.be.true;
        console.log("LP amount on farm after deposit function: %s", lpAmountAfterDeposit);
    });

    it("LP tokens to pool tokens", async () => {
        let lpAmountAfterDeposit = await Chef.getTotalLpBalance(poolId);
        let poolTokenAmounts = await Chef.lpTokensToPoolTokens(poolId, lpAmountAfterDeposit);
        console.log("lpTokensToPoolTokens: %s, %s", poolTokenAmounts[0], poolTokenAmounts[1]);
    });

    it("withdrawLP and depositLP functions", async () => {
        let lpAmount = await Chef.getTotalLpBalance(poolId);
        const lpAmountToWithdraw = ethers.utils.parseEther("500");

        const tx1 = await Chef.withdrawLPs(poolId, lpAmountToWithdraw);
        await tx1.wait();
        let lpAmountAfterWithdraw = await Chef.getTotalLpBalance(poolId);
        console.log("LP amount on farm after withdrawLP function: %s", lpAmountAfterWithdraw);

        const tx2 = await Chef.depositLps(poolId, lpAmountToWithdraw);
        await tx2.wait();
        let lpAmountAfterDepositPart = await Chef.getTotalLpBalance(poolId);
        expect(lpAmountAfterDepositPart).to.equal(lpAmount);
    });

    it("withdraw", async () => {
        await ethers.provider.send("evm_increaseTime", [3600 * 24 * 5]);

        let lpAmount = await Chef.getTotalLpBalance(poolId);
        const tx3 = await Chef.withdraw(poolId, lpAmount);
        await tx3.wait();

        let lpAmountAfterWithdraw = await Chef.getTotalLpBalance(poolId);
        expect(lpAmountAfterWithdraw).to.equal(0);
    });

    it("harvest", async () => {
        await ethers.provider.send("evm_increaseTime", [3600 * 24 * 5]);

        let rewards = await Chef.callStatic.harvest(poolId);
        console.log("Reward token: %s, amount: %s", rewards[0][0], rewards[1][0]);
    });
});
