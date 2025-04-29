import { UniswapWrapper__factory } from "../typechain-types/factories/contracts/dex-wrappers/UniswapWrapper__factory";
import { expect } from "chai";
import { Signer, Contract } from "ethers";
import hre, { ethers } from "hardhat";
import { ETHSynthChef } from "../typechain-types/contracts/synth-chefs/ETHSynthChef.sol";
import { ETHSynthChef__factory } from "../typechain-types/factories/contracts/synth-chefs/ETHSynthChef.sol";
import { UniswapWrapper } from "../typechain-types/contracts/dex-wrappers/UniswapWrapper";

const WETH_ABI = [
    {
        anonymous: false,
        inputs: [
            { indexed: true, internalType: "address", name: "src", type: "address" },
            { indexed: true, internalType: "address", name: "guy", type: "address" },
            { indexed: false, internalType: "uint256", name: "wad", type: "uint256" },
        ],
        name: "Approval",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            { indexed: true, internalType: "address", name: "dst", type: "address" },
            { indexed: false, internalType: "uint256", name: "wad", type: "uint256" },
        ],
        name: "Deposit",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            { indexed: true, internalType: "address", name: "src", type: "address" },
            { indexed: true, internalType: "address", name: "dst", type: "address" },
            { indexed: false, internalType: "uint256", name: "wad", type: "uint256" },
        ],
        name: "Transfer",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            { indexed: true, internalType: "address", name: "src", type: "address" },
            { indexed: false, internalType: "uint256", name: "wad", type: "uint256" },
        ],
        name: "Withdrawal",
        type: "event",
    },
    { payable: true, stateMutability: "payable", type: "fallback" },
    {
        constant: true,
        inputs: [
            { internalType: "address", name: "", type: "address" },
            { internalType: "address", name: "", type: "address" },
        ],
        name: "allowance",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        payable: false,
        stateMutability: "view",
        type: "function",
    },
    {
        constant: false,
        inputs: [
            { internalType: "address", name: "guy", type: "address" },
            { internalType: "uint256", name: "wad", type: "uint256" },
        ],
        name: "approve",
        outputs: [{ internalType: "bool", name: "", type: "bool" }],
        payable: false,
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        constant: true,
        inputs: [{ internalType: "address", name: "", type: "address" }],
        name: "balanceOf",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        payable: false,
        stateMutability: "view",
        type: "function",
    },
    {
        constant: true,
        inputs: [],
        name: "decimals",
        outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
        payable: false,
        stateMutability: "view",
        type: "function",
    },
    {
        constant: false,
        inputs: [],
        name: "deposit",
        outputs: [],
        payable: true,
        stateMutability: "payable",
        type: "function",
    },
    {
        constant: true,
        inputs: [],
        name: "name",
        outputs: [{ internalType: "string", name: "", type: "string" }],
        payable: false,
        stateMutability: "view",
        type: "function",
    },
    {
        constant: true,
        inputs: [],
        name: "symbol",
        outputs: [{ internalType: "string", name: "", type: "string" }],
        payable: false,
        stateMutability: "view",
        type: "function",
    },
    {
        constant: true,
        inputs: [],
        name: "totalSupply",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        payable: false,
        stateMutability: "view",
        type: "function",
    },
    {
        constant: false,
        inputs: [
            { internalType: "address", name: "dst", type: "address" },
            { internalType: "uint256", name: "wad", type: "uint256" },
        ],
        name: "transfer",
        outputs: [{ internalType: "bool", name: "", type: "bool" }],
        payable: false,
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        constant: false,
        inputs: [
            { internalType: "address", name: "src", type: "address" },
            { internalType: "address", name: "dst", type: "address" },
            { internalType: "uint256", name: "wad", type: "uint256" },
        ],
        name: "transferFrom",
        outputs: [{ internalType: "bool", name: "", type: "bool" }],
        payable: false,
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        constant: false,
        inputs: [{ internalType: "uint256", name: "wad", type: "uint256" }],
        name: "withdraw",
        outputs: [],
        payable: false,
        stateMutability: "nonpayable",
        type: "function",
    },
];
async function trace<T>(fn: () => Promise<T>): Promise<T> {
    hre.tracer.enabled = !!process.env.TRACE;
    const out = await fn();
    hre.tracer.enabled = false;
    return out;
}
describe("ETH Synth Chef", function () {
    let chef: ETHSynthChef;
    let owner: Signer;
    let weth: Contract;
    let wrapper: UniswapWrapper;
    before(async function () {
        owner = (await ethers.getSigners())[0];
        const UniswapWrapperFactory = (await ethers.getContractFactory(
            "UniswapWrapper"
        )) as UniswapWrapper__factory;
        wrapper = (await UniswapWrapperFactory.deploy(
            "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
            "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
        )) as UniswapWrapper;
        weth = new ethers.Contract("0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", WETH_ABI, owner);
        console.log("Swapping ETH to WETH...");
        await weth.deposit({ value: ethers.utils.parseEther("2.0") });
        console.log("WETH balance:", await weth.balanceOf(owner.getAddress()));
        const ChefFactory = (await ethers.getContractFactory(
            "ETHSynthChef"
        )) as ETHSynthChef__factory;
        chef = (await ChefFactory.deploy(
            "0xF403C135812408BFbE8713b5A23a04b3D48AAE31", //convex
            wrapper.address, //dex interface
            "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", //stable
            [
                "0xD533a949740bb3306d119CC777fa900bA034cd52",
                "0x4e3FBD56CD56c3e72c1403e103b45Db9da5B9D2B",
            ], //reward
            "1", //fee
            await owner.getAddress()
        )) as ETHSynthChef; //fee collector
        await chef.grantRole(chef.ADMIN_ROLE(), owner.getAddress());
        await chef.addPool(
            "0x02d341CcB60fAaf662bC0554d13778015d1b285C",
            26,
            "0x6B175474E89094C44Da98b954EedeAC495271d0F",
            "0x57Ab1ec28D129707052df4dF418D58a2D46d5f51",
            "0xEB16Ae0052ed37f479f7fe63849198Df1765a733",
            "0xF86AE6790654b70727dbE58BF1a863B270317fD0"
        );
    });

    it("Deposit", async function () {
        await weth.approve(chef.address, ethers.constants.MaxUint256);
        await chef.deposit(0, weth.address, ethers.utils.parseEther("1.0"), 0);
        let onFarm = await chef.getBalanceOnFarm(0);
        expect(onFarm).to.be.greaterThan(0);
    });

    it("Compound", async function () {
        let balanceBeforeCompound = await chef.getBalanceOnFarm(0);
        await ethers.provider.send("evm_increaseTime", [3600 * 24 * 365]);
        await chef.compound(0);
        let balanceAfterCompound = await chef.getBalanceOnFarm(0);
        expect(balanceAfterCompound).to.be.greaterThan(balanceBeforeCompound);
    });

    it("Withdraw", async function () {
        let balanceBeforeWithdraw = await chef.getBalanceOnFarm(0);

        const tx = await trace(() =>
            chef.withdraw(
                0,
                "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
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
