import { expect } from "chai";
import { ethers, upgrades, setFork } from "hardhat";
import { readFile } from "fs/promises";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber } from "ethers";
import { mintOp } from "../scripts/utils/mintOp";
import { CurveCompoundConvexSynthChef, ERC20 } from "../typechain-types";

const USDC_ADDRESS = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const DAI_ADDRESS = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
const LP_TOKEN_ADDRESS = "0x845838DF265Dcd2c412A1Dc9e959c7d08537f8a2";
const POOL_ADDRESS = "0xeB21209ae4C2c9FF2a86ACA31E123764A3B6Bc06";
const FARM_ADDRESS = "0xf34DFF761145FF0B05e917811d488B441F33a968";
const CONVEX_ADDRESS = "0xF403C135812408BFbE8713b5A23a04b3D48AAE31";
const UNI_ADDRESS = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
const INTERNAL_POOL_ID = 1;

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

describe("CurveCompoundSynthChef test", () => {
    let USDC: ERC20;
    let DAI: ERC20;
    let signers: SignerWithAddress[];
    let admin: SignerWithAddress;
    let master: SignerWithAddress;
    let Chef: CurveCompoundConvexSynthChef;
    before(async () => {
        await setFork("eth");
        const toMint = BigNumber.from(10).pow(6).mul(300000);
        signers = await ethers.getSigners();
        admin = signers[1];
        master = signers[2];
        const [owner] = await ethers.getSigners();

        USDC = await ethers.getContractAt("ERC20", USDC_ADDRESS);
        DAI = await ethers.getContractAt("ERC20", DAI_ADDRESS);
        await mintOp("teth", USDC.address, toMint, owner);
    });

    it("Deploys", async () => {
        const SynthChef = await ethers.getContractFactory("CurveCompoundConvexSynthChef");
        const chef = await upgrades.deployProxy(SynthChef, [CONVEX_ADDRESS], {
            kind: "uups",
        });
        expect(chef.address).to.not.eq(ethers.constants.AddressZero);
        Chef = chef as CurveCompoundConvexSynthChef;

        await chef.grantRole(await chef.ADMIN(), admin.address);
        await chef.grantRole(await chef.MASTER(), master.address);
    });

    it("Add pool", async () => {
        const uTokens = [DAI_ADDRESS, USDC_ADDRESS];

        const myStructData = ethers.utils.defaultAbiCoder.encode(
            ["address", "uint256", "address[2]", "address", "address"],
            [LP_TOKEN_ADDRESS, 0, uTokens, POOL_ADDRESS, FARM_ADDRESS]
        );

        await Chef.connect(admin).addPool(INTERNAL_POOL_ID, myStructData);
    });

    it("Swap usdc to dai", async () => {
        const uni = await getContract("./test/ABI/UniV2.json", UNI_ADDRESS);

        await USDC.approve(UNI_ADDRESS, ethers.constants.MaxUint256);
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
        let [uToken0, uToken1] = await Chef.getPoolTokens(INTERNAL_POOL_ID);
        expect(uToken0).to.equal(DAI_ADDRESS);
        expect(uToken1).to.equal(USDC_ADDRESS);
    });

    it("Depost", async () => {
        const uAmount0 = ethers.utils.parseEther("1000");
        const uAmount1 = ethers.utils.parseUnits("1000", 6);

        let lpAmountBeforeDeposit = await Chef.getTotalLpBalance(INTERNAL_POOL_ID);
        expect(lpAmountBeforeDeposit).to.equal(0);

        await DAI.transfer(Chef.address, ethers.utils.parseEther("1000"));
        await USDC.transfer(Chef.address, ethers.utils.parseUnits("1000", 6));
        expect(await DAI.balanceOf(Chef.address)).gt(0);
        expect(await USDC.balanceOf(Chef.address)).gt(0);

        const tx = await Chef.connect(master).deposit(INTERNAL_POOL_ID, [uAmount0, uAmount1]);
        await tx.wait();
        let lpAmountAfterDeposit = await Chef.getTotalLpBalance(INTERNAL_POOL_ID);
        expect(lpAmountAfterDeposit).to.be.gt(0);
    });

    it("LP tokens to pool tokens", async () => {
        let lpAmountAfterDeposit = await Chef.getTotalLpBalance(INTERNAL_POOL_ID);
        let poolTokenAmounts = await Chef.lpTokensToPoolTokens(INTERNAL_POOL_ID, lpAmountAfterDeposit);
        expect(poolTokenAmounts[0]).to.be.gt(0);
        expect(poolTokenAmounts[1]).to.be.gt(0);
    });

    it("withdrawLP and depositLP functions", async () => {
        let lpAmount = await Chef.getTotalLpBalance(INTERNAL_POOL_ID);
        const lpAmountToWithdraw = lpAmount.div(2);

        const tx1 = await Chef.connect(master).withdrawLP(INTERNAL_POOL_ID, lpAmountToWithdraw);
        await tx1.wait();
        let lpAmountAfterWithdraw = await Chef.getTotalLpBalance(INTERNAL_POOL_ID);
        expect(lpAmountAfterWithdraw).to.eq(lpAmount.sub(lpAmountToWithdraw));

        const tx2 = await Chef.connect(master).depositLP(INTERNAL_POOL_ID, lpAmountToWithdraw);
        await tx2.wait();

        let lpAmountAfterDepositPart = await Chef.getTotalLpBalance(INTERNAL_POOL_ID);
        expect(lpAmountAfterDepositPart).to.equal(lpAmount);
    });

    it("withdraw", async () => {
        await ethers.provider.send("evm_increaseTime", [3600 * 24 * 5]);

        let lpAmount = await Chef.getTotalLpBalance(INTERNAL_POOL_ID);
        const tx3 = await Chef.connect(master).withdraw(INTERNAL_POOL_ID, lpAmount);
        await tx3.wait();

        let lpAmountAfterWithdraw = await Chef.getTotalLpBalance(INTERNAL_POOL_ID);
        expect(lpAmountAfterWithdraw).to.equal(0);
    });

    it("harvest", async () => {
        await ethers.provider.send("evm_increaseTime", [3600 * 24 * 5]);

        let rewards = await Chef.connect(master).callStatic.harvest(INTERNAL_POOL_ID);
        expect(rewards[1][0]).to.be.gt(0);
    });
});
