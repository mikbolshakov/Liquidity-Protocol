import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { readFile } from "fs/promises";
import { impersonateAccount } from "@nomicfoundation/hardhat-network-helpers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

const USDC_ADDRESS = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const DAI_ADDRESS = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
const LP_ADDRESS = "0x845838DF265Dcd2c412A1Dc9e959c7d08537f8a2";
const POOL_ADDRESS = "0xeB21209ae4C2c9FF2a86ACA31E123764A3B6Bc06";
const FARM_ADDRESS = "0xf34DFF761145FF0B05e917811d488B441F33a968";
const CONVEX_ADDRESS = "0xF403C135812408BFbE8713b5A23a04b3D48AAE31";
const UNI_ADDRESS = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
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

describe("Mint USDC and DAI tokens", () => {
    async function load() {
        let signers: SignerWithAddress[];
        signers = await ethers.getSigners();
        const pool = await getContract("./test/ABI/CurveCompound.json", POOL_ADDRESS);
        const usdc = await getContract("./test/ABI/USDC.json", USDC_ADDRESS);
        const dai = await getContract("./test/ABI/DAI.json", DAI_ADDRESS);
        const uni = await getContract("./test/ABI/Uni.json", UNI_ADDRESS);
        const SynthFactory = await ethers.getContractFactory("CurveCompoundConvexSynthChef");
        const usdcOwner = await usdc.owner();
        // USDC
        await impersonateAccount(usdcOwner);
        const impersonatedSignerUSDC = await ethers.getSigner(usdcOwner);
        let tx = {
            to: impersonatedSignerUSDC.address,
            value: ethers.utils.parseEther("100"),
        };
        signers[1].sendTransaction(tx);
        await usdc.connect(impersonatedSignerUSDC).updateMasterMinter(usdcOwner);
        await usdc
            .connect(impersonatedSignerUSDC)
            .configureMinter(usdcOwner, ethers.constants.MaxUint256);
        await usdc.connect(impersonatedSignerUSDC).mint(signers[0].address, 1000000000000000);
        // DAI
        await usdc.connect(signers[0]).approve(UNI_ADDRESS, 1000000000000000);
        await uni
            .connect(signers[0])
            .swapExactTokensForTokens(
                100000000000000,
                100000000000000,
                [USDC_ADDRESS, DAI_ADDRESS],
                signers[0].address,
                Date.now()
            );
        // Deploy and add pool
        const synth = await upgrades.deployProxy(SynthFactory, [CONVEX_ADDRESS], {
            kind: "uups",
        });
        await synth.deployed();
        console.log("Synth deployed to: ", synth.address);
        const a = LP_ADDRESS;
        const b = 0;
        const c = DAI_ADDRESS;
        const d = USDC_ADDRESS;
        const e = POOL_ADDRESS;
        const f = FARM_ADDRESS;
        const myStructData = ethers.utils.AbiCoder.prototype.encode(
            ["address", "uint256", "address", "address", "address", "address"],
            [a, b, c, d, e, f]
        );
        await synth.addPool(poolId, myStructData);
        return { synth, pool, usdc, dai, signers };
    }

    describe("Synth test", async function () {
        it("Allows to check all functions", async function () {
            const { synth, dai, signers, usdc } = await loadFixture(load);
            const uAmount0 = ethers.utils.parseEther("1000000");
            const uAmount1 = ethers.utils.parseEther("0.000001");

            let [uToken0, uToken1] = await synth.getPoolTokens(poolId);
            expect(uToken0).to.equal(DAI_ADDRESS);
            expect(uToken1).to.equal(USDC_ADDRESS);
            let lpAmountBeforeDeposit = await synth.getTotalLpBalance(poolId);
            expect(lpAmountBeforeDeposit).to.equal(0);

            await dai
                .connect(signers[0])
                .transfer(synth.address, ethers.utils.parseEther("1000000"));
            await usdc
                .connect(signers[0])
                .transfer(synth.address, ethers.utils.parseEther("0.000001"));
            console.log("DAI contract balance: %s", await dai.balanceOf(synth.address));
            console.log("USDC contract balance: %s", await usdc.balanceOf(synth.address));

            const tx = await synth.deposit(poolId, [uAmount0, uAmount1]);
            await tx.wait();
            let lpAmountAfterDeposit = await synth.getTotalLpBalance(poolId);
            console.log("LP amount on farm after deposit function: %s", lpAmountAfterDeposit);

            let poolTokenAmounts = await synth.lpTokensToPoolTokens(poolId, lpAmountAfterDeposit);
            //!TODO math round problem
            // expect(poolTokenAmounts[0]).to.equal(uAmount0);

            const lpAmountToWithdraw = ethers.utils.parseEther("98765");
            const tx1 = await synth.withdrawLPs(poolId, lpAmountToWithdraw);
            await tx1.wait();
            let lpAmountAfterWithdrawPart = await synth.getTotalLpBalance(poolId);
            console.log(
                "LP amount on farm after withdrawLP function: %s",
                lpAmountAfterWithdrawPart
            );

            const tx2 = await synth.depositLps(poolId, lpAmountToWithdraw);
            await tx2.wait();
            let lpAmountAfterDepositPart = await synth.getTotalLpBalance(poolId);
            expect(lpAmountAfterDepositPart).to.equal(lpAmountAfterDeposit);

            await ethers.provider.send("evm_increaseTime", [3600 * 24 * 5]);

            const tx3 = await synth.withdraw(poolId, lpAmountAfterDeposit);
            await tx3.wait();
            let lpAmountAfterWithdraw = await synth.getTotalLpBalance(poolId);
            expect(lpAmountAfterWithdraw).to.equal(0);

            let rewards = await synth.callStatic.harvest(poolId);
            console.log("Reward token: %s, amount: %s", rewards[0][0], rewards[1][0]);
        });
    });
});
