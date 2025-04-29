import { expect } from "chai";
import { ethers, upgrades, setFork } from "hardhat";
import { readFile } from "fs/promises";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber } from "ethers";
import { mintOp } from "../scripts/utils/mintOp";
import { CurveCompoundConvexSynthChef, ERC20 } from "../typechain-types";
import { VelodromeSynthChef } from "../typechain-types/contracts/synth-chefs/VelodromeSynthChef.sol";

const USDC_ADDRESS = "0x7f5c764cbc14f9669b88837ca1490cca17c31607";
const DAI_ADDRESS = "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1";
const LP_TOKEN_ADDRESS = "0xd16232ad60188B68076a235c65d692090caba155";
const POOL_ADDRESS = "0xa132DAB612dB5cB9fC9Ac426A0Cc215A3423F9c9";
const FARM_ADDRESS = "0xb03f52D2DB3e758DD49982Defd6AeEFEa9454e80";
const UNI_ADDRESS = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"; //
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

describe("Velodrome test", () => {
    let USDC: ERC20;
    let DAI: ERC20;
    before(async () => {
        await setFork("op");
        const toMint = BigNumber.from(10).pow(6).mul(300000);

        const [owner] = await ethers.getSigners();
        USDC = await ethers.getContractAt("ERC20", USDC_ADDRESS);
        DAI = await ethers.getContractAt("ERC20", DAI_ADDRESS);
        await mintOp("teth", USDC.address, toMint, owner);
    });

    let Chef: VelodromeSynthChef;

    it("Deploys", async () => {
        const SynthChef = await ethers.getContractFactory("VelodromeSynthChef");
        const chef = await upgrades.deployProxy(SynthChef, [POOL_ADDRESS], {
            kind: "uups",
        });
        expect(chef.address).to.not.eq(ethers.constants.AddressZero);
        Chef = chef as VelodromeSynthChef;
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
        const uni = await getContract("./test/ABI/Velodrome.json", POOL_ADDRESS);

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
