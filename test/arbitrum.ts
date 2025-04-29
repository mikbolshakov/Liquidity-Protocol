import { UniswapWrapper__factory } from "./../typechain-types/factories/contracts/dex-wrappers/UniswapWrapper__factory";
import { expect } from "chai";
import { Signer, Contract } from "ethers";
import { ethers } from "hardhat";
import { ArbitrumSynthChef } from "../typechain-types/contracts/synth-chefs/ArbitrumSynthChef.sol";
import { ArbitrumSynthChef__factory } from "./../typechain-types/factories/contracts/synth-chefs/ArbitrumSynthChef.sol";
import { UniswapWrapper } from "./../typechain-types/contracts/dex-wrappers/UniswapWrapper";

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

describe("Arbitrum Synth Chef", function () {
    let chef: ArbitrumSynthChef;
    let owner: Signer;
    let weth: Contract;
    let wrapper: UniswapWrapper;
    before(async function () {
        owner = (await ethers.getSigners())[0];
        const UniswapWrapperFactory = (await ethers.getContractFactory(
            "UniswapWrapper"
        )) as UniswapWrapper__factory;
        wrapper = (await UniswapWrapperFactory.deploy(
            "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",
            "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1"
        )) as UniswapWrapper;
        weth = new ethers.Contract("0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", WETH_ABI, owner);
        console.log("Swapping ETH to WETH...");
        await weth.deposit({ value: ethers.utils.parseEther("2.0") });
        console.log("WETH balance:", await weth.balanceOf(owner.getAddress()));
        const ChefFactory = (await ethers.getContractFactory(
            "ArbitrumSynthChef"
        )) as ArbitrumSynthChef__factory;
        chef = (await ChefFactory.deploy(
            "0x53Bf833A5d6c4ddA888F69c22C88C9f356a41614",
            wrapper.address,
            "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8",
            ["0x6694340fc020c5E6B96567843da2df01b2CE1eb6"],
            "1",
            await owner.getAddress()
        )) as ArbitrumSynthChef;
        await chef.grantRole(chef.ADMIN_ROLE(), owner.getAddress());
        await chef.addPool(
            "0x892785f33CdeE22A30AEF750F285E18c18040c3e",
            "0xeA8DfEE1898a7e0a59f7527F076106d7e44c2176",
            "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8",
            0,
            1
        );
    });

    it("Deposit", async function () {
        await weth.approve(chef.address, ethers.constants.MaxUint256);
        await chef.deposit(ethers.utils.parseEther("1.0"), weth.address, 0);
        expect(await chef.getBalanceOnFarm(0)).to.be.greaterThan(0);
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
        await chef.withdraw(
            0,
            "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8",
            (await chef.getBalanceOnFarm(0)).div(10),
            owner.getAddress()
        );
        let balanceAfterWithdraw = await chef.getBalanceOnFarm(0);
        expect(balanceAfterWithdraw).to.be.lessThan(balanceBeforeWithdraw);
    });
});
