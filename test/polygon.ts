import { UniswapWrapper__factory } from "./../typechain-types/factories/contracts/dex-wrappers/UniswapWrapper__factory";
import { expect } from "chai";
import { Signer, Contract } from "ethers";
import { ethers } from "hardhat";
import { PolygonSynthChef } from "../typechain-types/contracts/synth-chefs/PolygonSynthChef.sol";
import { PolygonSynthChef__factory } from "./../typechain-types/factories/contracts/synth-chefs/PolygonSynthChef.sol";
import { UniswapWrapper } from "./../typechain-types/contracts/dex-wrappers/UniswapWrapper";

const WETH_ABI = [
    {
        constant: true,
        inputs: [],
        name: "name",
        outputs: [{ name: "", type: "string" }],
        payable: false,
        stateMutability: "view",
        type: "function",
    },
    {
        constant: false,
        inputs: [
            { name: "guy", type: "address" },
            { name: "wad", type: "uint256" },
        ],
        name: "approve",
        outputs: [{ name: "", type: "bool" }],
        payable: false,
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        constant: true,
        inputs: [],
        name: "totalSupply",
        outputs: [{ name: "", type: "uint256" }],
        payable: false,
        stateMutability: "view",
        type: "function",
    },
    {
        constant: false,
        inputs: [
            { name: "src", type: "address" },
            { name: "dst", type: "address" },
            { name: "wad", type: "uint256" },
        ],
        name: "transferFrom",
        outputs: [{ name: "", type: "bool" }],
        payable: false,
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        constant: false,
        inputs: [{ name: "wad", type: "uint256" }],
        name: "withdraw",
        outputs: [],
        payable: false,
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        constant: true,
        inputs: [],
        name: "decimals",
        outputs: [{ name: "", type: "uint8" }],
        payable: false,
        stateMutability: "view",
        type: "function",
    },
    {
        constant: true,
        inputs: [{ name: "", type: "address" }],
        name: "balanceOf",
        outputs: [{ name: "", type: "uint256" }],
        payable: false,
        stateMutability: "view",
        type: "function",
    },
    {
        constant: true,
        inputs: [],
        name: "symbol",
        outputs: [{ name: "", type: "string" }],
        payable: false,
        stateMutability: "view",
        type: "function",
    },
    {
        constant: false,
        inputs: [
            { name: "dst", type: "address" },
            { name: "wad", type: "uint256" },
        ],
        name: "transfer",
        outputs: [{ name: "", type: "bool" }],
        payable: false,
        stateMutability: "nonpayable",
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
        inputs: [
            { name: "", type: "address" },
            { name: "", type: "address" },
        ],
        name: "allowance",
        outputs: [{ name: "", type: "uint256" }],
        payable: false,
        stateMutability: "view",
        type: "function",
    },
    { payable: true, stateMutability: "payable", type: "fallback" },
    {
        anonymous: false,
        inputs: [
            { indexed: true, name: "src", type: "address" },
            { indexed: true, name: "guy", type: "address" },
            { indexed: false, name: "wad", type: "uint256" },
        ],
        name: "Approval",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            { indexed: true, name: "src", type: "address" },
            { indexed: true, name: "dst", type: "address" },
            { indexed: false, name: "wad", type: "uint256" },
        ],
        name: "Transfer",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            { indexed: true, name: "dst", type: "address" },
            { indexed: false, name: "wad", type: "uint256" },
        ],
        name: "Deposit",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            { indexed: true, name: "src", type: "address" },
            { indexed: false, name: "wad", type: "uint256" },
        ],
        name: "Withdrawal",
        type: "event",
    },
];
const STR_ABI = [
    {
        inputs: [
            { internalType: "string", name: "_name", type: "string" },
            { internalType: "string", name: "_symbol", type: "string" },
            { internalType: "address", name: "_endpoint", type: "address" },
            { internalType: "uint16", name: "_mainEndpointId", type: "uint16" },
            { internalType: "uint256", name: "_initialSupplyOnMainEndpoint", type: "uint256" },
        ],
        stateMutability: "nonpayable",
        type: "constructor",
    },
    {
        anonymous: false,
        inputs: [
            { indexed: true, internalType: "address", name: "owner", type: "address" },
            { indexed: true, internalType: "address", name: "spender", type: "address" },
            { indexed: false, internalType: "uint256", name: "value", type: "uint256" },
        ],
        name: "Approval",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            { indexed: true, internalType: "address", name: "previousOwner", type: "address" },
            { indexed: true, internalType: "address", name: "newOwner", type: "address" },
        ],
        name: "OwnershipTransferred",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [{ indexed: false, internalType: "bool", name: "isPaused", type: "bool" }],
        name: "Paused",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            { indexed: false, internalType: "uint16", name: "srcChainId", type: "uint16" },
            { indexed: false, internalType: "uint64", name: "nonce", type: "uint64" },
            { indexed: false, internalType: "uint256", name: "qty", type: "uint256" },
        ],
        name: "ReceiveFromChain",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            { indexed: false, internalType: "uint16", name: "dstChainId", type: "uint16" },
            { indexed: false, internalType: "bytes", name: "to", type: "bytes" },
            { indexed: false, internalType: "uint256", name: "qty", type: "uint256" },
        ],
        name: "SendToChain",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            { indexed: true, internalType: "address", name: "from", type: "address" },
            { indexed: true, internalType: "address", name: "to", type: "address" },
            { indexed: false, internalType: "uint256", name: "value", type: "uint256" },
        ],
        name: "Transfer",
        type: "event",
    },
    {
        inputs: [
            { internalType: "address", name: "owner", type: "address" },
            { internalType: "address", name: "spender", type: "address" },
        ],
        name: "allowance",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            { internalType: "address", name: "spender", type: "address" },
            { internalType: "uint256", name: "amount", type: "uint256" },
        ],
        name: "approve",
        outputs: [{ internalType: "bool", name: "", type: "bool" }],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [{ internalType: "address", name: "account", type: "address" }],
        name: "balanceOf",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "chainId",
        outputs: [{ internalType: "uint16", name: "", type: "uint16" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "decimals",
        outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            { internalType: "address", name: "spender", type: "address" },
            { internalType: "uint256", name: "subtractedValue", type: "uint256" },
        ],
        name: "decreaseAllowance",
        outputs: [{ internalType: "bool", name: "", type: "bool" }],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [{ internalType: "uint16", name: "", type: "uint16" }],
        name: "dstContractLookup",
        outputs: [{ internalType: "bytes", name: "", type: "bytes" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "endpoint",
        outputs: [{ internalType: "contract ILayerZeroEndpoint", name: "", type: "address" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            { internalType: "uint16", name: "_dstChainId", type: "uint16" },
            { internalType: "bool", name: "_useZro", type: "bool" },
            { internalType: "bytes", name: "txParameters", type: "bytes" },
        ],
        name: "estimateSendTokensFee",
        outputs: [
            { internalType: "uint256", name: "nativeFee", type: "uint256" },
            { internalType: "uint256", name: "zroFee", type: "uint256" },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            { internalType: "uint16", name: "_srcChainId", type: "uint16" },
            { internalType: "bytes", name: "_srcAddress", type: "bytes" },
        ],
        name: "forceResumeReceive",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            { internalType: "address", name: "spender", type: "address" },
            { internalType: "uint256", name: "addedValue", type: "uint256" },
        ],
        name: "increaseAllowance",
        outputs: [{ internalType: "bool", name: "", type: "bool" }],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [],
        name: "isMain",
        outputs: [{ internalType: "bool", name: "", type: "bool" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            { internalType: "uint16", name: "_srcChainId", type: "uint16" },
            { internalType: "bytes", name: "_fromAddress", type: "bytes" },
            { internalType: "uint64", name: "nonce", type: "uint64" },
            { internalType: "bytes", name: "_payload", type: "bytes" },
        ],
        name: "lzReceive",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [],
        name: "name",
        outputs: [{ internalType: "string", name: "", type: "string" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "owner",
        outputs: [{ internalType: "address", name: "", type: "address" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [{ internalType: "bool", name: "_pause", type: "bool" }],
        name: "pauseSendTokens",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [],
        name: "paused",
        outputs: [{ internalType: "bool", name: "", type: "bool" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "renounceOwnership",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            { internalType: "uint16", name: "_dstChainId", type: "uint16" },
            { internalType: "bytes", name: "_to", type: "bytes" },
            { internalType: "uint256", name: "_qty", type: "uint256" },
            { internalType: "address", name: "zroPaymentAddress", type: "address" },
            { internalType: "bytes", name: "adapterParam", type: "bytes" },
        ],
        name: "sendTokens",
        outputs: [],
        stateMutability: "payable",
        type: "function",
    },
    {
        inputs: [
            { internalType: "uint16", name: "_version", type: "uint16" },
            { internalType: "uint16", name: "_chainId", type: "uint16" },
            { internalType: "uint256", name: "_configType", type: "uint256" },
            { internalType: "bytes", name: "_config", type: "bytes" },
        ],
        name: "setConfig",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            { internalType: "uint16", name: "_dstChainId", type: "uint16" },
            { internalType: "bytes", name: "_destinationContractAddress", type: "bytes" },
        ],
        name: "setDestination",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [{ internalType: "uint16", name: "version", type: "uint16" }],
        name: "setReceiveVersion",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [{ internalType: "uint16", name: "version", type: "uint16" }],
        name: "setSendVersion",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [],
        name: "symbol",
        outputs: [{ internalType: "string", name: "", type: "string" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "totalSupply",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            { internalType: "address", name: "recipient", type: "address" },
            { internalType: "uint256", name: "amount", type: "uint256" },
        ],
        name: "transfer",
        outputs: [{ internalType: "bool", name: "", type: "bool" }],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            { internalType: "address", name: "sender", type: "address" },
            { internalType: "address", name: "recipient", type: "address" },
            { internalType: "uint256", name: "amount", type: "uint256" },
        ],
        name: "transferFrom",
        outputs: [{ internalType: "bool", name: "", type: "bool" }],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [{ internalType: "address", name: "newOwner", type: "address" }],
        name: "transferOwnership",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
];

describe("Polygon Synth Chef", function () {
    let chef: PolygonSynthChef;
    let owner: Signer;
    let weth: Contract;
    let wrapper: UniswapWrapper;
    let tokenStr: Contract;

    before(async function () {
        owner = (await ethers.getSigners())[0];
        const UniswapWrapperFactory = (await ethers.getContractFactory(
            "UniswapWrapper"
        )) as UniswapWrapper__factory;
        wrapper = (await UniswapWrapperFactory.deploy(
            "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",
            "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270"
        )) as UniswapWrapper;
        weth = new ethers.Contract("0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270", WETH_ABI, owner);
        tokenStr = new ethers.Contract(
            "0x2F6F07CDcf3588944Bf4C42aC74ff24bF56e7590",
            STR_ABI,
            owner
        );
        console.log("Swapping ETH to WETH...");
        await weth.deposit({ value: ethers.utils.parseEther("8999.0") });
        console.log("WETH balance:", await weth.balanceOf(owner.getAddress()));
        const ChefFactory = (await ethers.getContractFactory(
            "PolygonSynthChef"
        )) as PolygonSynthChef__factory;
        chef = (await ChefFactory.deploy(
            "0x45A01E4e04F14f7A4a6702c74187c5F6222033cd",
            wrapper.address,
            "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
            ["0x2F6F07CDcf3588944Bf4C42aC74ff24bF56e7590"],
            "1",
            await owner.getAddress()
        )) as PolygonSynthChef;
        await chef.grantRole(chef.ADMIN_ROLE(), owner.getAddress());
        await chef.addPool(
            "0x1205f31718499dBf1fCa446663B532Ef87481fe1",
            "0x8731d54E9D02c286767d56ac03e8037C07e01e98",
            "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
            0,
            1
        );
    });

    it("Deposit", async function () {
        await weth.approve(chef.address, ethers.constants.MaxUint256);
        await chef.deposit(0, weth.address, ethers.utils.parseEther("5000.0"), 0);
        expect(await chef.getBalanceOnFarm(0)).to.be.greaterThan(0);
    });

    it("Compound", async function () {
        let balanceBeforeCompound = await chef.getBalanceOnFarm(0);
        await ethers.provider.send("evm_increaseTime", [3600 * 24 * 365]);
        let balanceTokenBefore = await tokenStr.balanceOf(chef.address);
        //await chef.deposit(0, weth.address, ethers.utils.parseEther("0.05"), 0);
        let balanceTokenAfter = await tokenStr.balanceOf(chef.address);
        //console.log(balanceTokenBefore, balanceTokenAfter);
        await chef.compound(0);
        let balanceAfterCompound = await chef.getBalanceOnFarm(0);
        expect(balanceAfterCompound).to.be.greaterThan(balanceBeforeCompound);
    });

    it("Withdraw", async function () {
        let balanceBeforeWithdraw = await chef.getBalanceOnFarm(0);
        await chef.withdraw(
            0,
            "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
            (await chef.getBalanceOnFarm(0)).div(10),
            owner.getAddress(),
            0
        );
        let balanceAfterWithdraw = await chef.getBalanceOnFarm(0);
        expect(balanceAfterWithdraw).to.be.lessThan(balanceBeforeWithdraw);
    });
});
