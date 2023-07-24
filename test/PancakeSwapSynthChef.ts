import { expect } from "chai";
import { ethers, upgrades, setFork } from "hardhat";
import { readFile } from "fs/promises";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber, Contract } from "ethers";
import { mintOp } from "../scripts/utils/mintOp";
import { PancakeSwapSynthChef, ERC20 } from "../typechain-types";

const USDC_ADDRESS = "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d";
const ROUTER_ADDRESS = "0x10ED43C718714eb63d5aA57B78B54704E256024E";
const WRAPPED_BNB = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c";
const CHEF_ADDRESS = "0xa5f8C5Dbd5F286960b9d90548680aE5ebFf07652";
const LTC_ADDRESS = "0x4338665CBB7B2485A8855A139b75D5e34AB0DB94";
const POOL_ID = 21;
const INTERNAL_POOL_ID = 0;

async function getAbi(path: string) {
    const data = await readFile(path, "utf8");
    const abi = new ethers.utils.Interface(JSON.parse(data));
    return abi;
}

async function getContract(pathToAbi: string, deployedAddress: string) {
    const abi = await getAbi(pathToAbi);
    const prov = new ethers.providers.JsonRpcProvider("http://localhost:8545");
    //console.log(abi)
    return new ethers.Contract(deployedAddress, abi, prov);
}

describe("Pancake test", () => {
    let USDC: ERC20;
    let WB: ERC20;
    let LTC: ERC20;
    let signers: SignerWithAddress[];

    before(async () => {
        await setFork("bsc");
        const toMint = BigNumber.from(10).pow(6).mul(3000000000);
        const [owner] = await ethers.getSigners();
        signers = await ethers.getSigners();
        WB = await ethers.getContractAt("ERC20", WRAPPED_BNB);
        LTC = await ethers.getContractAt("ERC20", LTC_ADDRESS);
        USDC = await ethers.getContractAt("ERC20", USDC_ADDRESS);
        await mintOp("tbsc", USDC.address, toMint, owner);
    });

    let Chef: PancakeSwapSynthChef;

    it("Deploys", async () => {
        const SynthChef = await ethers.getContractFactory("PancakeSwapSynthChef");
        const chef = await upgrades.deployProxy(SynthChef, [CHEF_ADDRESS, ROUTER_ADDRESS], {
            kind: "uups",
        });
        expect(chef.address).to.not.eq(ethers.constants.AddressZero);
        Chef = chef as PancakeSwapSynthChef;
    });

    it("Add pool", async () => {
        const myStructData = ethers.utils.AbiCoder.prototype.encode(["uint256"], [POOL_ID]);
        await Chef.addPool(INTERNAL_POOL_ID, myStructData);
    });

    it("Swap usdc to trader joe tokens and wrapped avax", async () => {
        const router = await getContract("./test/ABI/PancakeRouter.json", ROUTER_ADDRESS);

        const USDAmt = 1_000;
        await USDC.connect(signers[0]).approve(ROUTER_ADDRESS, ethers.constants.MaxUint256);
        await router
            .connect(signers[0])
            .swapExactTokensForTokens(
                BigNumber.from(10).pow(12).mul(USDAmt),
                1,
                [USDC_ADDRESS, WRAPPED_BNB],
                signers[0].address,
                Date.now()
            );

        expect((await WB.balanceOf(signers[0].address)).gt(0)).to.be.true;

        await router
            .connect(signers[0])
            .swapExactTokensForTokens(
                BigNumber.from(10).pow(12).mul(USDAmt),
                1,
                [USDC_ADDRESS, LTC_ADDRESS],
                signers[0].address,
                Date.now()
            );

        expect((await LTC.balanceOf(signers[0].address)).gt(0)).to.be.true;
    });

    it("Correct coins", async () => {
        let [uToken0, uToken1] = await Chef.getPoolTokens(INTERNAL_POOL_ID);
        expect(uToken1).to.equal(WRAPPED_BNB);
        expect(uToken0).to.equal(LTC_ADDRESS);
    });

    it("Depost", async () => {
        const uAmount1 = ethers.utils.parseEther("0.0000000001");
        const uAmount0 = ethers.utils.parseEther("0.0000000001");

        let lpAmountBeforeDeposit = await Chef.getTotalLpBalance(INTERNAL_POOL_ID);
        expect(lpAmountBeforeDeposit).to.equal(0);

        await WB.transfer(Chef.address, ethers.utils.parseEther("0.0000000001"));
        await LTC.transfer(Chef.address, ethers.utils.parseEther("0.0000000001"));
        expect(await LTC.balanceOf(Chef.address)).gt(0);
        expect(await WB.balanceOf(Chef.address)).gt(0);

        const tx = await Chef.deposit(INTERNAL_POOL_ID, [uAmount0, uAmount1]);
        await tx.wait();
        let lpAmountAfterDeposit = await Chef.getTotalLpBalance(INTERNAL_POOL_ID);
        expect(lpAmountAfterDeposit.gt(0)).to.be.true;
    });

    it("LP tokens to pool tokens", async () => {
        let lpAmountAfterDeposit = await Chef.getTotalLpBalance(INTERNAL_POOL_ID);
        let poolTokenAmounts = await Chef.lpTokensToPoolTokens(INTERNAL_POOL_ID, lpAmountAfterDeposit);
        console.log("lpTokensToPoolTokens: %s, %s", poolTokenAmounts[0], poolTokenAmounts[1]);
    });

    it("withdrawLP and depositLP functions", async () => {
        let lpAmount = await Chef.getTotalLpBalance(INTERNAL_POOL_ID);
        const lpAmountToWithdraw = ethers.utils.parseEther("0.0000000000001");

        const tx1 = await Chef.withdrawLP(INTERNAL_POOL_ID, lpAmountToWithdraw);
        await tx1.wait();
        let lpAmountAfterWithdraw = await Chef.getTotalLpBalance(INTERNAL_POOL_ID);
        expect(lpAmountAfterWithdraw).to.eq(lpAmount.sub(lpAmountToWithdraw));
        const tx2 = await Chef.depositLP(INTERNAL_POOL_ID, lpAmountToWithdraw);
        await tx2.wait();
        let lpAmountAfterDepositPart = await Chef.getTotalLpBalance(INTERNAL_POOL_ID);
        expect(lpAmountAfterDepositPart).to.equal(lpAmount);
    });

    it("harvest", async () => {
        await ethers.provider.send("evm_increaseTime", [3600 * 24 * 360]);
        let rewards = await Chef.callStatic.harvest(INTERNAL_POOL_ID);
        expect(rewards[1][0]).gt(0);
    });

    it("withdraw", async () => {
        await ethers.provider.send("evm_increaseTime", [3600 * 24 * 5]);

        let lpAmount = await Chef.getTotalLpBalance(INTERNAL_POOL_ID);
        const tx3 = await Chef.withdraw(INTERNAL_POOL_ID, lpAmount);
        await tx3.wait();

        let lpAmountAfterWithdraw = await Chef.getTotalLpBalance(INTERNAL_POOL_ID);
        expect(lpAmountAfterWithdraw).to.equal(0);
    });
});
