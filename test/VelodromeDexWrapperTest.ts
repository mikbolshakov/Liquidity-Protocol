import { expect } from "chai";
import { ethers, upgrades, setFork } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber } from "ethers";
import { mintOp } from "../scripts/utils/mintOp";
import { ERC20, DexWrapper, VelodromeDexWapper } from "../typechain-types";

const USDC_ADDRESS = "0x7F5c764cBc14f9669B88837ca1490cCa17c31607";
const DAI_ADDRESS = "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1";
const USDT_ADDRESS = "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58";
const VELO_ADDRESS = "0x3c8B650257cFb5f272f799F5e2b4e65093a11a05";
const VELODROME_ROUTER = "0x9c12939390052919aF3155f41Bf4160Fd3666A6f";
const INTERNAL_PROTODEX_ID = 2;

const encodeUSDCtoWETH =
    "0x000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000020000000000000000000000007f5c764cbc14f9669b88837ca1490cca17c316070000000000000000000000004200000000000000000000000000000000000006";
const encodeWETHtoDAI =
    "0x000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000020000000000000000000000004200000000000000000000000000000000000006000000000000000000000000da10009cbd5d07dd0cecc66161fc93d7c9000da1";
const encodeDAItoUSDT =
    "0x00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000002000000000000000000000000da10009cbd5d07dd0cecc66161fc93d7c9000da100000000000000000000000094b008aa00579c1307b0ef2c499ad98a8ce58e58";

describe("VelodromeDexWrapper test", () => {
    let USDC: ERC20;
    let DAI: ERC20;
    let USDT: ERC20;
    let VELO: ERC20;
    let DexWrap: DexWrapper;
    let VeloWrapper: VelodromeDexWapper;
    let signers: SignerWithAddress[];
    let admin: SignerWithAddress;
    let swapper: SignerWithAddress;
    before(async () => {
        await setFork("optimism");
        const toMint = BigNumber.from(10).pow(6).mul(300000);
        signers = await ethers.getSigners();
        admin = signers[1];
        swapper = signers[0];
        const [owner] = await ethers.getSigners();

        USDC = await ethers.getContractAt("ERC20", USDC_ADDRESS);
        DAI = await ethers.getContractAt("ERC20", DAI_ADDRESS);
        USDT = await ethers.getContractAt("ERC20", USDT_ADDRESS);
        VELO = await ethers.getContractAt("ERC20", VELO_ADDRESS);
        await mintOp("top", USDC.address, toMint, owner);
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

    it("Deploy VelodromeDexWapper", async () => {
        const VeloWrapperContract = await ethers.getContractFactory("VelodromeDexWapper");
        const veloWrapper = await upgrades.deployProxy(VeloWrapperContract, [VELODROME_ROUTER], {
            kind: "uups",
        });
        expect(veloWrapper.address).to.not.eq(ethers.constants.AddressZero);
        VeloWrapper = veloWrapper as VelodromeDexWapper;

        await veloWrapper.grantRole(await veloWrapper.MASTER_WRAPPER(), DexWrap.address);
    });

    it("Add protoDexWrapper and set default ProtoDexId", async () => {
        await DexWrap.connect(admin).addProtoDexWrapper(INTERNAL_PROTODEX_ID, VeloWrapper.address);
        await DexWrap.connect(admin).setDefaultProtoDexId(INTERNAL_PROTODEX_ID);
    });

    it("SwapTokens function", async () => {
        const USDAmt = 10;
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
        const USDAmt = 100;
        const amountToReceive = await DexWrap.previewSwap(
            USDC_ADDRESS,
            DAI_ADDRESS,
            BigNumber.from(10).pow(6).mul(USDAmt)
        );
        expect(amountToReceive).to.be.gt(0);
    });

    it("SwapTokens through wNative (WETH)", async () => {
        const USDAmt = 100;
        USDC.connect(signers[0]).increaseAllowance(
            DexWrap.address,
            BigNumber.from(10).pow(6).mul(USDAmt)
        );
        await DexWrap.connect(swapper).swapTokens(
            USDC_ADDRESS,
            VELO_ADDRESS,
            BigNumber.from(10).pow(6).mul(USDAmt)
        );

        expect(await VELO.balanceOf(signers[0].address)).to.be.gt(0);
    });

    it("PreviewSwap through wNative (WETH)", async () => {
        const USDAmt = 100;
        const amountToReceive = await DexWrap.previewSwap(
            USDC_ADDRESS,
            VELO_ADDRESS,
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
        const USDAmt = 10;
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
        const USDAmt = 10;
        const amountToReceive = await DexWrap.previewSwap(
            USDC_ADDRESS,
            USDT_ADDRESS,
            BigNumber.from(10).pow(6).mul(USDAmt)
        );
        expect(amountToReceive.gt(0)).to.be.true;
    });
});
