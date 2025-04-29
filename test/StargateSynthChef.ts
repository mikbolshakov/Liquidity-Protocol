import { expect } from "chai";
import { ethers, upgrades, setFork } from "hardhat";
import { readFile } from "fs/promises";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber, Contract } from "ethers";
import { mintOp } from "../scripts/utils/mintOp";
import { ERC20, StargateSynthChef } from "../typechain-types";

const USDC_ADDRESS = "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8";
const ROUTER_ADDRESS = "0x53Bf833A5d6c4ddA888F69c22C88C9f356a41614";
const LP_TOKEN = "0x892785f33CdeE22A30AEF750F285E18c18040c3e";
const STARGATE = "0xeA8DfEE1898a7e0a59f7527F076106d7e44c2176";
const STARGATE_TOKEN_ADDRESS = "0x6694340fc020c5E6B96567843da2df01b2CE1eb6";
const STARGATE_ROUTER_POOL_ID = 1;
const STARGATE_LP_STAKING_POOL_ID = 0;
const INTERNAL_POOL_ID = 0;

describe("TraderJoe test", () => {
    let USDC: ERC20;
    let LP: ERC20;
    let STG: ERC20;
    let signers: SignerWithAddress[];
    let ENT_MASTER_CHEF_ADDRESS: String;
    let master: SignerWithAddress;
    let admin: SignerWithAddress;
    before(async () => {
        await setFork("arbitrum");
        const toMint = BigNumber.from(10).pow(6).mul(300000);
        signers = await ethers.getSigners();
        ENT_MASTER_CHEF_ADDRESS = signers[1].address;
        master = signers[2];
        admin = signers[3];
        const [owner] = await ethers.getSigners();
        USDC = await ethers.getContractAt("ERC20", USDC_ADDRESS);
        LP = await ethers.getContractAt("ERC20", LP_TOKEN);
        STG = await ethers.getContractAt("ERC20", STARGATE_TOKEN_ADDRESS);
        await mintOp("tarb", USDC.address, toMint, owner);
    });

    let Chef: StargateSynthChef;

    it("Deploys", async () => {
        const SynthChef = await ethers.getContractFactory("StargateSynthChef");
        const chef = await upgrades.deployProxy(
            SynthChef,
            [[ROUTER_ADDRESS, ENT_MASTER_CHEF_ADDRESS, admin.address, master.address]],
            {
                kind: "uups",
            }
        );
        expect(chef.address).to.not.eq(ethers.constants.AddressZero);
        Chef = chef as StargateSynthChef;
    });

    it("Add pool", async () => {
        const myStructData = ethers.utils.AbiCoder.prototype.encode(
            ["address", "address", "address", "uint256", "uint256"],
            [LP_TOKEN, STARGATE, USDC_ADDRESS, STARGATE_LP_STAKING_POOL_ID, STARGATE_ROUTER_POOL_ID]
        );
        await Chef.connect(admin).addPool(INTERNAL_POOL_ID, myStructData);
        const resp = await Chef.pools(INTERNAL_POOL_ID);
        expect(resp[0]).to.eq(LP_TOKEN);
        expect(resp[1]).to.eq(STARGATE);
        expect(resp[2]).to.eq(USDC_ADDRESS);
        expect(resp[3]).to.eq(BigNumber.from(STARGATE_LP_STAKING_POOL_ID));
        expect(resp[4]).to.eq(BigNumber.from(STARGATE_ROUTER_POOL_ID));
    });

    it("Correct coins", async () => {
        let [uToken0] = await Chef.getPoolTokens(INTERNAL_POOL_ID);
        expect(uToken0).to.equal(USDC_ADDRESS);
    });
    it("get lp token address", async () => {
        let uToken0 = await Chef.lpTokenAddress(INTERNAL_POOL_ID);
        expect(uToken0).to.equal(LP_TOKEN);
    });

    it("Depost", async () => {
        const uAmount0 = ethers.utils.parseUnits("1000", 6);

        let lpAmountBeforeDeposit = await Chef.getTotalLpBalance(INTERNAL_POOL_ID);
        expect(lpAmountBeforeDeposit).to.equal(0);
        await USDC.transfer(Chef.address, ethers.utils.parseUnits("1000", 6));
        expect(await USDC.balanceOf(Chef.address)).gt(0);

        const tx = await Chef.connect(master).deposit(INTERNAL_POOL_ID, [uAmount0]);
        await tx.wait();
        let lpAmountAfterDeposit = await Chef.getTotalLpBalance(INTERNAL_POOL_ID);
        expect(lpAmountAfterDeposit.gt(0)).to.be.true;
    });

    it("LP tokens to pool tokens", async () => {
        let lpAmountAfterDeposit = await Chef.getTotalLpBalance(INTERNAL_POOL_ID);
        let poolTokenAmounts = await Chef.lpTokensToPoolTokens(
            INTERNAL_POOL_ID,
            lpAmountAfterDeposit
        );
        console.log("lpTokensToPoolTokens: %s, %s", poolTokenAmounts[0]);
    });

    it("harvest", async () => {
        await ethers.provider.send("evm_increaseTime", [3600 * 24 * 50]);

        const balanceBefore = await STG.balanceOf(signers[1].address);
        await Chef.connect(master).harvest(INTERNAL_POOL_ID);
        const balanceAfter = await STG.balanceOf(signers[1].address);
        expect(balanceAfter).gt(balanceBefore);
    });
    it("withdrawLP and depositLP functions", async () => {
        let lpAmount = await Chef.getTotalLpBalance(INTERNAL_POOL_ID);
        const lpAmountToWithdraw = lpAmount.div(2);
        const tx1 = await Chef.connect(master).withdrawLP(INTERNAL_POOL_ID, lpAmountToWithdraw);
        await tx1.wait();
        let lpAmountAfterWithdraw = await Chef.getTotalLpBalance(INTERNAL_POOL_ID);
        expect(lpAmountAfterWithdraw).to.eq(lpAmount.sub(lpAmountToWithdraw));
        await LP.connect(signers[1]).transfer(Chef.address, lpAmountToWithdraw);
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
});
