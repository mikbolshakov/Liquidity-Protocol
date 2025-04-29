import { assert, expect } from "chai";
import { BigNumber } from "ethers";
import hre, { ethers } from "hardhat";
import * as mainnet from "../constants";

async function trace<T>(fn: () => Promise<T>): Promise<T> {
    hre.tracer.enabled = !!process.env.TRACE;
    const out = await fn();
    hre.tracer.enabled = false;
    return out;
}

async function verifyForkChainId() {
    const fork = new ethers.providers.JsonRpcProvider(process.env.FORK_URL);
    const network = await fork.getNetwork();
    if (network.chainId !== 1) {
        console.error(
            "This test is designed for ETH Mainnet, check your FORK_URL environment variable"
        );
        process.exit(1);
    }
}

describe("ETH Synth Chef", async function () {
    it("Using correct chain for the fork", async () => {
        await verifyForkChainId();
    });
    async function chefFixture() {
        const [owner] = await ethers.getSigners();
        // Use our patched version of the Liquidity Gauge so the tests could pass at all
        // Otherwise if running on a hardhat network the node will just run out of memory
        const patched = await hre.artifacts.readArtifact(
            "contracts/thirdparty/LiquidityGaugeV3.vy:LiquidityGaugeV3"
        );
        await ethers.provider.send("hardhat_setCode", [
            mainnet.crv3crypto__gauge,
            patched.deployedBytecode,
        ]);

        const UniswapWrapperFactory = await ethers.getContractFactory("UniswapWrapper");
        const ChefFactory = await ethers.getContractFactory("TricryptoSynthChef");

        const wETH = await ethers.getContractAt("WETH", mainnet.WETH);
        wETH.deposit({ value: ethers.utils.parseEther("10") });

        const UniswapWrapper = await UniswapWrapperFactory.deploy(
            mainnet.UNSIWAP_ROUTER,
            mainnet.WETH
        );
        await UniswapWrapper.deployed();

        const chef = await ChefFactory.deploy(
            "0xF403C135812408BFbE8713b5A23a04b3D48AAE31",
            UniswapWrapper.address,
            mainnet.USDC,
            [mainnet.CRV, mainnet.CVX],
            "1",
            owner.address
        );
        await chef.deployed();

        await chef.grantRole(chef.ADMIN_ROLE(), owner.address);
        await chef.addConvexPool(38);
        return { wETH, chef, owner };
    }

    describe("Basic functions", async () => {
        let { chef, wETH, owner } = {} as Awaited<ReturnType<typeof chefFixture>>;

        it("Deploys", async () => {
            const fixture = await chefFixture();
            chef = fixture.chef;
            wETH = fixture.wETH;
            owner = fixture.owner;
        });

        it("Deposit", async function () {
            const lpAddr = await chef.getLpToken(0);
            const LP = await ethers.getContractAt("ERC20", lpAddr);

            const balance = await LP.balanceOf(chef.address);
            expect(balance.eq(0)).to.be.true;

            await wETH.approve(chef.address, ethers.constants.MaxUint256);

            const tx = await trace(() =>
                chef.deposit(0, wETH.address, ethers.utils.parseEther("1.0"), 0, {
                    gasLimit: 2500000,
                })
            );

            const receipt = await tx.wait(1);
            const event = receipt.events?.find((e) => e.event === "ExpectLPs");
            assert(event && event.args);

            const expectedAmount = event.args[0] as BigNumber;

            const onFarm = await chef.getLPAmountOnFarm(0);
            expect(onFarm.toString()).to.be.eq(expectedAmount.toString());
        });

        it("Compound", async function () {
            let balanceBeforeCompound = await chef.getBalanceOnFarm(0);

            await ethers.provider.send("evm_increaseTime", [3600 * 24 * 360]);
            // This one is a real gas guzzler
            const tx = await trace(() => chef.compound(0, { gasLimit: 5000000 }));
            await tx.wait(1);
            let balanceAfterCompound = await chef.getBalanceOnFarm(0);
            expect(balanceAfterCompound).to.be.greaterThan(balanceBeforeCompound);
        });

        it("Withdraw", async function () {
            let balanceBeforeWithdraw = await chef.getBalanceOnFarm(0);

            const tx = await trace(() =>
                chef.withdraw(
                    0,
                    mainnet.USDC,
                    1200_000_000, // USDC is 6 decimals
                    owner.getAddress(),
                    0
                )
            );
            await tx.wait(1);
            let balanceAfterWithdraw = await chef.getBalanceOnFarm(0);
            expect(balanceAfterWithdraw).to.be.lessThan(balanceBeforeWithdraw);
        });
    });
});
