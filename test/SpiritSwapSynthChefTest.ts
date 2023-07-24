import { expect } from "chai";
import { ethers, upgrades, setFork } from "hardhat";
import { readFile } from "fs/promises";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber } from "ethers";
import { mintOp } from "../scripts/utils/mintOp";
import { ERC20, SpiritSwapSynthChef } from "../typechain-types";

const USDC_ADDRESS = "0x04068DA6C83AFCFA0e13ba15A6696662335D5B75";
const DAI_ADDRESS = "0x8D11eC38a3EB5E956B052f67Da8Bdc9bef8Abf3E";
const LP_TOKEN_ADDRESS = "0x9692129bb91b4E3942C0f17B0bdCC582Ff22fFB5";
const POOL_ADDRESS = "0x09855B4ef0b9df961ED097EF50172be3e6F13665";
const FARM_ADDRESS = "0x8B8C47f904BF18541f93c7dFcb10F3A8451438a3";
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

describe("SpiritSwapSynthChef test", () => {
    let USDC: ERC20;
    let DAI: ERC20;
    let signers: SignerWithAddress[];
    let admin: SignerWithAddress;
    let master: SignerWithAddress;
    let Chef: SpiritSwapSynthChef;
    before(async () => {
        await setFork("fantom");
        const toMint = BigNumber.from(10).pow(6).mul(300000);
        signers = await ethers.getSigners();
        admin = signers[1];
        master = signers[2];
        const [owner] = await ethers.getSigners();

        USDC = await ethers.getContractAt("ERC20", USDC_ADDRESS);
        DAI = await ethers.getContractAt("ERC20", DAI_ADDRESS);
        await mintOp("tftm", USDC.address, toMint, owner);
    });

    it("Deploys", async () => {
        const SynthChef = await ethers.getContractFactory("SpiritSwapSynthChef");
        const chef = await upgrades.deployProxy(SynthChef, [POOL_ADDRESS], {
            kind: "uups",
        });
        expect(chef.address).to.not.eq(ethers.constants.AddressZero);
        Chef = chef as SpiritSwapSynthChef;

        await chef.grantRole(await chef.ADMIN(), admin.address);
        await chef.grantRole(await chef.MASTER(), master.address);
    });

    it("Add pool", async () => {
        const uTokens = [DAI_ADDRESS, USDC_ADDRESS];

        const myStructData = ethers.utils.AbiCoder.prototype.encode(
            ["address", "address", "address[2]", "bool"],
            [LP_TOKEN_ADDRESS, FARM_ADDRESS, uTokens, true]
        );

        await Chef.connect(admin).addPool(INTERNAL_POOL_ID, myStructData);
    });

    it("Swap usdc to dai", async () => {
        const uni = await getContract("./test/ABI/SpiritSwap.json", POOL_ADDRESS);

        await USDC.approve(POOL_ADDRESS, ethers.constants.MaxUint256);
        const USDAmt = 100_000;
        const route = {
            from: USDC_ADDRESS,
            to: DAI_ADDRESS,
            stable: true,
        };
        await uni
            .connect(signers[0])
            .swapExactTokensForTokens(
                BigNumber.from(10).pow(6).mul(USDAmt),
                1,
                [route],
                signers[0].address,
                Date.now()
            );

        expect(await DAI.balanceOf(signers[0].address)).to.be.gt(0);
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

        await DAI.transfer(Chef.address, ethers.utils.parseEther("10000"));
        await USDC.transfer(Chef.address, ethers.utils.parseUnits("10000", 6));
        expect(await DAI.balanceOf(Chef.address)).gt(0);
        expect(await USDC.balanceOf(Chef.address)).gt(0);

        const tx = await Chef.connect(master).deposit(INTERNAL_POOL_ID, [uAmount0, uAmount1]);
        await tx.wait();
        let lpAmountAfterDeposit = await Chef.getTotalLpBalance(INTERNAL_POOL_ID);
        expect(lpAmountAfterDeposit.gt(0)).to.be.true;
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
