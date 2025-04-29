import { UniswapWrapper__factory } from "../typechain-types/factories/contracts/dex-wrappers/UniswapWrapper__factory";
import { expect } from "chai";
import { Signer, Contract, BigNumber } from "ethers";
import { ethers } from "hardhat";
import { AvaxSynthChef } from "../typechain-types/contracts/synth-chefs/AvaxSynthChef.sol";
import { AvaxSynthChef__factory } from "../typechain-types/factories/contracts/synth-chefs/AvaxSynthChef.sol";
import { UniswapWrapper } from "../typechain-types/contracts/dex-wrappers/UniswapWrapper";
import { EntangleSynthFactory__factory } from "../typechain-types/factories/contracts/EntangleSynthFactory__factory";
import { EntangleSynth__factory } from "../typechain-types/factories/contracts/EntangleSynth__factory";
import { EntangleSynthFactory } from "../typechain-types/contracts/EntangleSynthFactory";
import { EntangleSynth } from "../typechain-types/contracts/EntangleSynth";
import { EntangleDEXOnDemand__factory } from "../typechain-types/factories/contracts/EntangleDEXOnDemand__factory";
import { EntangleDEXOnDemand } from "../typechain-types/contracts/EntangleDEXOnDemand";
import { ERC20__factory } from "../typechain-types/factories/@openzeppelin/contracts/token/ERC20/ERC20__factory";
import { EntangleRouter__factory } from "../typechain-types/factories/contracts/EntangleRouter.sol/EntangleRouter__factory";
import { EntangleRouter } from "../typechain-types/contracts/EntangleRouter.sol/EntangleRouter";
import { EntangleLending__factory } from "../typechain-types/factories/contracts/EntangleLending__factory";
import { EntangleLending } from "../typechain-types/contracts/EntangleLending";
import { EntanglePool__factory } from "../typechain-types/factories/contracts/EntanglePool__factory";
import { EntanglePool } from "../typechain-types/contracts/EntanglePool";
import { EntangleDEX__factory } from "../typechain-types/factories/contracts/EntangleDEX__factory";
import { EntangleDEX } from "../typechain-types/contracts/EntangleDEX";
import { ERC20 } from "../typechain-types/@openzeppelin/contracts/token/ERC20/ERC20";

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

describe("Avax Synth Chef", function () {
    let chef: AvaxSynthChef;
    let owner: Signer;
    let weth: Contract;
    let stable: ERC20;
    let wrapper: UniswapWrapper;
    let factory: EntangleSynthFactory;
    let router: EntangleRouter;
    let lending: EntangleLending;
    let idex: EntangleDEX;
    let pool: EntanglePool;
    let synth: EntangleSynth;
    let chainId: number;
    let DEXonDemand: EntangleDEXOnDemand;
    const PID = 51;
    const WETH_ADDR = "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7";
    const STABLE_ADDR = "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E";
    const BRIDGE_ADDR = "0x0EF812f4c68DC84c22A4821EF30ba2ffAB9C2f3A";

    before(async function () {
        owner = (await ethers.getSigners())[0];
        chainId = (await owner.provider?.getNetwork())?.chainId ?? 0;

        const LendingFactory = (await ethers.getContractFactory(
            "EntangleLending"
        )) as EntangleLending__factory;
        const PoolFactory = (await ethers.getContractFactory(
            "EntanglePool"
        )) as EntanglePool__factory;
        const RouterFactory = (await ethers.getContractFactory(
            "EntangleRouter"
        )) as EntangleRouter__factory;
        const UniswapWrapperFactory = (await ethers.getContractFactory(
            "UniswapWrapper"
        )) as UniswapWrapper__factory;
        const ChefFactory = (await ethers.getContractFactory(
            "AvaxSynthChef"
        )) as AvaxSynthChef__factory;
        const SynthFactoryFactory = (await ethers.getContractFactory(
            "EntangleSynthFactory"
        )) as EntangleSynthFactory__factory;
        const DEXonDemandFactory = (await ethers.getContractFactory(
            "EntangleDEXOnDemand"
        )) as EntangleDEXOnDemand__factory;
        const IDEXFactory = (await ethers.getContractFactory(
            "EntangleDEX"
        )) as EntangleDEX__factory;

        wrapper = (await UniswapWrapperFactory.deploy(
            "0x60aE616a2155Ee3d9A68541Ba4544862310933d4",
            WETH_ADDR
        )) as UniswapWrapper;
        chef = (await ChefFactory.deploy(
            "0x188bED1968b795d5c9022F6a0bb5931Ac4c18F00", //chef
            "0x60aE616a2155Ee3d9A68541Ba4544862310933d4", //router
            wrapper.address, //dex interface
            STABLE_ADDR, //stable
            ["0x6e84a6216eA6dACC71eE8E6b0a5B7322EEbC0fDd"], //reward
            "1", //fee
            await owner.getAddress()
        )) as AvaxSynthChef; //fee collector
        factory = await SynthFactoryFactory.deploy();
        DEXonDemand = await DEXonDemandFactory.deploy(factory.address, chef.address);
        lending = await LendingFactory.deploy();
        pool = await PoolFactory.deploy();
        idex = await IDEXFactory.deploy(owner.getAddress());
        router = await RouterFactory.deploy(
            pool.address,
            idex.address,
            chef.address,
            factory.address,
            lending.address,
            BRIDGE_ADDR
        );

        await chef.grantRole(chef.ADMIN_ROLE(), owner.getAddress());
        await chef.grantRole(chef.BORROWER_ROLE(), lending.address);
        await idex.grantRole(idex.ADMIN(), owner.getAddress());
        await idex.grantRole(idex.BORROWER_ROLE(), lending.address);
        await router.grantRole(router.ADMIN(), owner.getAddress());
        await lending.grantRole(lending.BORROWER_ROLE(), router.address);
        await pool.grantRole(pool.DEPOSITER_ROLE(), router.address);
        await pool.grantRole(pool.DEPOSITER_ROLE(), owner.getAddress());
        await factory.grantRole(factory.MINT_ROLE(), owner.getAddress());
        await DEXonDemand.grantRole(DEXonDemand.ADMIN_ROLE(), owner.getAddress());
        await DEXonDemand.grantRole(DEXonDemand.BUYER(), owner.getAddress());
        await chef.grantRole(chef.ADMIN_ROLE(), DEXonDemand.address);
        await chef.grantRole(chef.ADMIN_ROLE(), router.address);
        await factory.grantRole(factory.MINT_ROLE(), DEXonDemand.address);

        weth = new ethers.Contract(WETH_ADDR, WETH_ABI, owner);
        stable = ERC20__factory.connect(STABLE_ADDR, owner);
        console.log("Swapping ETH to WETH...");
        await weth.deposit({ value: ethers.utils.parseEther("1000") });
        console.log("WETH balance:", await weth.balanceOf(owner.getAddress()));

        await weth.approve(wrapper.address, ethers.constants.MaxUint256);
        await wrapper.convert(weth.address, stable.address, ethers.utils.parseEther("100"));
        console.log(await stable.symbol(), "balance:", await stable.balanceOf(owner.getAddress()));
        let addr = await factory.previewSynthAddress(chainId, chef.address, PID, STABLE_ADDR);
        await factory.createSynth(chainId, chef.address, PID, STABLE_ADDR);
        synth = EntangleSynth__factory.connect(addr, owner);
        await synth.setPrice("2000000");

        await idex.add(synth.address);
    });

    it("Deposit", async function () {
        await weth.approve(router.address, ethers.constants.MaxUint256);
        await router.deposit(PID, ethers.utils.parseEther("1.0"), weth.address, 1);
        expect(await chef.getBalanceOnFarm(PID)).to.be.greaterThan(0);
    });

    it("Compound", async function () {
        let balanceBeforeCompound = await chef.getBalanceOnFarm(PID);
        await ethers.provider.send("evm_increaseTime", [3600 * 24 * 365]);
        await chef.compound(PID);
        let balanceAfterCompound = await chef.getBalanceOnFarm(PID);
        expect(balanceAfterCompound).to.be.greaterThan(balanceBeforeCompound);
    });

    it("Withdraw", async function () {
        let balanceBeforeWithdraw = await chef.getBalanceOnFarm(PID);
        await chef.withdraw(
            PID,
            STABLE_ADDR,
            (await chef.getBalanceOnFarm(PID)).div(10),
            owner.getAddress(),
            0
        );
        let balanceAfterWithdraw = await chef.getBalanceOnFarm(PID);
        expect(balanceAfterWithdraw).to.be.lessThan(balanceBeforeWithdraw);
    });

    it("Mint from factory", async function () {
        let supply = BigNumber.from(10).pow((await synth.decimals()) + 6);
        await factory.mint(chainId, chef.address, PID, supply, owner.getAddress());
        expect(await synth.totalSupply()).to.be.equal(supply);
        await synth.transfer(idex.address, supply);
    });

    it("Buy at DEX on Demand", async function () {
        let balanceBefore = await synth.balanceOf(owner.getAddress());
        let ERC20Factory = (await ethers.getContractFactory("ERC20")) as ERC20__factory;
        let weth = ERC20Factory.attach(WETH_ADDR);
        await weth.approve(wrapper.address, ethers.constants.MaxUint256);
        await wrapper.convert(WETH_ADDR, STABLE_ADDR, ethers.utils.parseEther("0.05"));
        let stable = ERC20Factory.attach(STABLE_ADDR);
        await stable.approve(DEXonDemand.address, ethers.constants.MaxUint256);
        await DEXonDemand.buy(PID, "10000000");
        expect(await synth.balanceOf(owner.getAddress())).to.be.greaterThan(balanceBefore);
    });

    it("Buy at DEX", async function () {
        let balanceBefore = await synth.balanceOf(owner.getAddress());
        await stable.approve(router.address, ethers.constants.MaxUint256);
        await router.buy(synth.address, BigNumber.from("10000000"));
        expect(await synth.balanceOf(owner.getAddress())).to.be.greaterThan(balanceBefore);
    });

    it("Sell at DEX", async function () {
        console.log("aaaa", await synth.balanceOf(owner.getAddress()));
        let balanceBefore = await synth.balanceOf(owner.getAddress());
        await synth.approve(router.address, ethers.constants.MaxUint256);
        await router.sell(synth.address, BigNumber.from("5000000000000000000"));
        expect(await synth.balanceOf(owner.getAddress())).to.be.lessThan(balanceBefore);
    });

    it("Deposit to pool", async function () {
        let value = ethers.utils.parseEther("0.05");
        await weth.approve(pool.address, ethers.constants.MaxUint256);
        await pool.depositToken(value, weth.address, 1);
        expect(await weth.balanceOf(pool.address)).to.be.equal(value);
    });

    it("Deposit from pool", async function () {
        let balanceBeforeWithdraw = await chef.getBalanceOnFarm(PID);
        await router.depositFromPool(ethers.utils.parseEther("0.05"), weth.address, PID, 1);
        let balanceAfterWithdraw = await chef.getBalanceOnFarm(PID);
        expect(balanceAfterWithdraw).to.be.greaterThan(balanceBeforeWithdraw);
    });
});
