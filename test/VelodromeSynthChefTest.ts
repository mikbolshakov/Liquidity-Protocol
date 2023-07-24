import { expect } from "chai";
import { ethers, upgrades, setFork } from "hardhat";
import { readFile } from "fs/promises";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber } from "ethers";
import { mintOp } from "../scripts/utils/mintOp";
import { ERC20, VelodromeSynthChef } from "../typechain-types";

const USDC_ADDRESS = "0x7F5c764cBc14f9669B88837ca1490cCa17c31607";
const SUSD_ADDRESS = "0x8c6f28f2F1A3C87F0f938b96d27520d9751ec8d9";
const LP_TOKEN_ADDRESS = "0xd16232ad60188B68076a235c65d692090caba155";
const POOL_ADDRESS = "0xa132DAB612dB5cB9fC9Ac426A0Cc215A3423F9c9";
const FARM_ADDRESS = "0xb03f52D2DB3e758DD49982Defd6AeEFEa9454e80";
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

describe("VelodromeSynthChef test", () => {
    let USDC: ERC20;
    let SUSD: ERC20;
    let signers: SignerWithAddress[];
    let admin: SignerWithAddress;
    let master: SignerWithAddress;
    let Chef: VelodromeSynthChef;
    before(async () => {
        await setFork("optimism");
        const toMint = BigNumber.from(10).pow(6).mul(300000);
        signers = await ethers.getSigners();
        admin = signers[1];
        master = signers[2];
        const [owner] = await ethers.getSigners();

        USDC = await ethers.getContractAt("ERC20", USDC_ADDRESS);
        SUSD = await ethers.getContractAt("ERC20", SUSD_ADDRESS);
        await mintOp("top", USDC.address, toMint, owner);
    });

    it("Deploys", async () => {
        const SynthChef = await ethers.getContractFactory("VelodromeSynthChef");
        const chef = await upgrades.deployProxy(SynthChef, [POOL_ADDRESS], {
            kind: "uups",
        });
        expect(chef.address).to.not.eq(ethers.constants.AddressZero);
        Chef = chef as VelodromeSynthChef;

        await chef.grantRole(await chef.ADMIN(), admin.address);
        await chef.grantRole(await chef.MASTER(), master.address);
    });

    it("Add pool", async () => {
        const uTokens = [USDC_ADDRESS, SUSD_ADDRESS];

        const myStructData = ethers.utils.AbiCoder.prototype.encode(
            ["address", "address", "address[2]", "bool"],
            [LP_TOKEN_ADDRESS, FARM_ADDRESS, uTokens, true]
        );

        await Chef.connect(admin).addPool(INTERNAL_POOL_ID, myStructData);
    });

    it("Swap USDC to SUSD", async () => {
        const uni = await getContract("./test/ABI/Velodrome.json", POOL_ADDRESS);

        await USDC.approve(POOL_ADDRESS, ethers.constants.MaxUint256);
        const USDAmt = 100_000;
        const route = {
            from: USDC_ADDRESS,
            to: SUSD_ADDRESS,
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

        expect(await SUSD.balanceOf(signers[0].address)).to.be.gt(0);
    });

    it("Correct coins", async () => {
        let [uToken0, uToken1] = await Chef.getPoolTokens(INTERNAL_POOL_ID);
        expect(uToken0).to.equal(USDC_ADDRESS);
        expect(uToken1).to.equal(SUSD_ADDRESS);
    });

    it("Depost", async () => {
        const uAmount0 = ethers.utils.parseUnits("1000", 6);
        const uAmount1 = ethers.utils.parseEther("1000");

        let lpAmountBeforeDeposit = await Chef.getTotalLpBalance(INTERNAL_POOL_ID);
        expect(lpAmountBeforeDeposit).to.equal(0);

        await USDC.transfer(Chef.address, ethers.utils.parseUnits("10000", 6));
        await SUSD.transfer(Chef.address, ethers.utils.parseEther("10000"));
        expect(await USDC.balanceOf(Chef.address)).gt(0);
        expect(await SUSD.balanceOf(Chef.address)).gt(0);

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
        expect(rewards[1][2]).to.be.gt(0);
    });
});
