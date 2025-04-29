import { expect } from "chai";
import { ethers, upgrades, setFork } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber } from "ethers";
import { mintOp } from "../scripts/utils/mintOp";
import { ERC20, DexWrapper, UniswapDexWrapper } from "../typechain-types";

const USDC_ADDRESS = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const DAI_ADDRESS = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
const USDT_ADDRESS = "0xdAC17F958D2ee523a2206206994597C13D831ec7";
const WETH_ADDRESS = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
const UNI_ADDRESS = "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984";
const UNISWAPV2_ROUTER02 = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
const INTERNAL_PROTODEX_ID = 1;

const encodeUSDCtoWETH =
    "0x00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000002000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2";
const encodeWETHtoDAI =
    "0x00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000002000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc20000000000000000000000006b175474e89094c44da98b954eedeac495271d0f";
const encodeDAItoUSDT =
    "0x000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000020000000000000000000000006b175474e89094c44da98b954eedeac495271d0f000000000000000000000000dac17f958d2ee523a2206206994597c13d831ec7";

describe("UniswapDexWrapper test", () => {
    let USDC: ERC20;
    let DAI: ERC20;
    let USDT: ERC20;
    let UNI: ERC20;
    let DexWrap: DexWrapper;
    let UniWrapper: UniswapDexWrapper;
    let signers: SignerWithAddress[];
    let admin: SignerWithAddress;
    let swapper: SignerWithAddress;
    before(async () => {
        await setFork("eth");
        const toMint = BigNumber.from(10).pow(6).mul(300000);
        signers = await ethers.getSigners();
        admin = signers[1];
        swapper = signers[0];
        const [owner] = await ethers.getSigners();

        USDC = await ethers.getContractAt("ERC20", USDC_ADDRESS);
        DAI = await ethers.getContractAt("ERC20", DAI_ADDRESS);
        USDT = await ethers.getContractAt("ERC20", USDT_ADDRESS);
        UNI = await ethers.getContractAt("ERC20", UNI_ADDRESS);
        await mintOp("teth", USDC.address, toMint, owner);
    });

    it("Deploy DexWrapper", async () => {
        const DexWrapperContract = await ethers.getContractFactory("DexWrapper");
        const dexWrapper = await upgrades.deployProxy(DexWrapperContract, [], {
            kind: "uups",
        });
        expect(dexWrapper.address).to.not.eq(ethers.constants.AddressZero);
        DexWrap = dexWrapper as DexWrapper;

        await dexWrapper.grantRole(await dexWrapper.ADMIN(), admin.address);
        await dexWrapper.grantRole(await dexWrapper.SWAPPER(), swapper.address);
    });

    it("Deploy UniswapDexWrapper", async () => {
        const UniWrapperContract = await ethers.getContractFactory("UniswapDexWrapper");
        const uniWrapper = await upgrades.deployProxy(
            UniWrapperContract,
            [UNISWAPV2_ROUTER02, WETH_ADDRESS],
            {
                kind: "uups",
            }
        );
        expect(uniWrapper.address).to.not.eq(ethers.constants.AddressZero);
        UniWrapper = uniWrapper as UniswapDexWrapper;

        await uniWrapper.grantRole(await uniWrapper.MASTER_WRAPPER(), DexWrap.address);
    });

    it("Add protoDexWrapper and set default ProtoDexId", async () => {
        await DexWrap.connect(admin).addProtoDexWrapper(INTERNAL_PROTODEX_ID, UniWrapper.address);
        await DexWrap.connect(admin).setDefaultProtoDexId(INTERNAL_PROTODEX_ID);
    });

    it("SwapTokens function", async () => {
        const USDAmt = 100000;
        USDC.connect(signers[0]).increaseAllowance(
            DexWrap.address,
            BigNumber.from(10).pow(6).mul(USDAmt)
        );

        await DexWrap.connect(swapper).swapTokens(
            USDC_ADDRESS,
            DAI_ADDRESS,
            BigNumber.from(10).pow(6).mul(USDAmt)
        );
        expect(await DAI.balanceOf(signers[0].address)).to.be.gt(0);
    });

    it("PreviewSwap function", async () => {
        const USDAmt = 100000;
        const amountToReceive = await DexWrap.previewSwap(
            USDC_ADDRESS,
            DAI_ADDRESS,
            BigNumber.from(10).pow(6).mul(USDAmt)
        );
        expect(amountToReceive).to.be.gt(0);
    });

    it("SwapTokens through wNative (WETH)", async () => {
        const USDAmt = 10;
        USDC.connect(signers[0]).increaseAllowance(
            DexWrap.address,
            BigNumber.from(10).pow(6).mul(USDAmt)
        );
        await DexWrap.connect(swapper).swapTokens(
            USDC_ADDRESS,
            UNI_ADDRESS,
            BigNumber.from(10).pow(6).mul(USDAmt)
        );

        expect(await UNI.balanceOf(signers[0].address)).to.be.gt(0);
    });

    it("PreviewSwap through wNative (WETH)", async () => {
        const USDAmt = 10;
        const amountToReceive = await DexWrap.previewSwap(
            USDC_ADDRESS,
            UNI_ADDRESS,
            BigNumber.from(10).pow(6).mul(USDAmt)
        );
        expect(amountToReceive).to.be.gt(0);
    });

    it("Add SpecifiedSwapPath", async () => {
        const SpecifiedSwapPath1 = {
            tokensPath: encodeUSDCtoWETH,
            protoDexId: INTERNAL_PROTODEX_ID,
        };
        const SpecifiedSwapPath2 = {
            tokensPath: encodeWETHtoDAI,
            protoDexId: INTERNAL_PROTODEX_ID,
        };
        const SpecifiedSwapPath3 = {
            tokensPath: encodeDAItoUSDT,
            protoDexId: INTERNAL_PROTODEX_ID,
        };

        const swapPathArray = [SpecifiedSwapPath1, SpecifiedSwapPath2, SpecifiedSwapPath3];
        await DexWrap.connect(admin).addSpecifiedSwapPath(
            USDC_ADDRESS,
            USDT_ADDRESS,
            swapPathArray
        );
    });

    it("SwapTokens by SpecifiedSwapPath", async () => {
        const USDAmt = 100000;
        USDC.connect(signers[0]).increaseAllowance(
            DexWrap.address,
            BigNumber.from(10).pow(6).mul(USDAmt)
        );

        await DexWrap.connect(swapper).swapTokens(
            USDC_ADDRESS,
            USDT_ADDRESS,
            BigNumber.from(10).pow(6).mul(USDAmt)
        );
        expect(await USDT.balanceOf(signers[0].address)).to.be.gt(0);
    });

    it("PreviewSwap by SpecifiedSwapPath", async () => {
        const USDAmt = 100000;
        const amountToReceive = await DexWrap.previewSwap(
            USDC_ADDRESS,
            USDT_ADDRESS,
            BigNumber.from(10).pow(6).mul(USDAmt)
        );
        expect(amountToReceive.gt(0)).to.be.true;
    });
});
