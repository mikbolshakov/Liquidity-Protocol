import { ethers, upgrades } from "hardhat";
import { expect } from "chai";
import { Synth, SynthFactory } from "../typechain-types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe("SynthFactory", () => {
    let SF: SynthFactory;
    let owner: SignerWithAddress;
    let synth: Synth;
    before(async () => {
        const ImplFactory = await ethers.getContractFactory("SynthFactory");
        [owner] = await ethers.getSigners();
        SF = (await upgrades.deployProxy(ImplFactory, { kind: "uups" })) as SynthFactory;
    });

    it("Deploys a synth", async () => {
        const address = await SF.deploySynth(0, "sTST");
        await address.wait();

        const synthInfo = await SF.synths(0);
        expect(synthInfo.synth).to.be.not.eq(ethers.constants.AddressZero);

        synth = await ethers.getContractAt("Synth", synthInfo.synth);
        expect(await synth.symbol()).to.be.eq("sTST");
    });

    const supply = ethers.BigNumber.from(10).mul(10).pow(18);
    it("Mint", async () => {
        const tx = await SF.mint(0, supply, owner.address, 0);
        tx.wait();

        const actualSupply = await synth.totalSupply();
        expect(supply.eq(actualSupply)).to.be.true;
    });

    it("Set price", async () => {
        const tx = await SF.setPrice(0, ethers.utils.parseEther("10.0"), supply);
        await tx.wait();

        const synthInfo = await SF.synths(0);

        expect(synthInfo.price).to.be.eq(ethers.utils.parseEther("10"));
        expect(synthInfo.totalSupplyAllChains).to.be.eq(supply);
    });

    describe("Price calculation", async () => {
        it("Set op token as erc-20 6-decimals", async () => {
            const DummyFactory = await ethers.getContractFactory("Dummy");
            const Dummy = await DummyFactory.deploy(6).then((e) => e.deployed());

            await SF.setOpToken(Dummy.address);

            const newOp = await SF.opToken();
            const newDecimals = await SF.opTokenDecimals();
            expect(newOp).to.eq(Dummy.address);
            expect(newDecimals).to.eq(6);
        });

        it("Calculate price with 6 decimals, from OP", async () => {
            const synthAmount = await SF.convertOpToSynth(0, ethers.utils.parseUnits("10", 6));
            expect(synthAmount).to.be.eq(ethers.utils.parseEther("1"));
        });

        it("Calculate price with 6 decimals, from Synth", async () => {
            const synthAmount = await SF.convertSynthToOp(0, ethers.utils.parseUnits("1", 18));
            expect(synthAmount).to.be.eq(ethers.utils.parseUnits("10", 6));
        });

        it("Set op token as erc-20 18-decimals", async () => {
            const DummyFactory = await ethers.getContractFactory("Dummy");
            const Dummy = await DummyFactory.deploy(18).then((e) => e.deployed());

            await SF.setOpToken(Dummy.address);

            const newOp = await SF.opToken();
            const newDecimals = await SF.opTokenDecimals();
            expect(newOp).to.eq(Dummy.address);
            expect(newDecimals).to.eq(18);
        });

        it("Calculate price with 18 decimals, from OP", async () => {
            const synthAmount = await SF.convertOpToSynth(0, ethers.utils.parseUnits("10", 18));
            expect(synthAmount).to.be.eq(ethers.utils.parseEther("1"));
        });

        it("Calculate price with 18 decimals, from Synth", async () => {
            const synthAmount = await SF.convertSynthToOp(0, ethers.utils.parseUnits("1", 18));
            expect(synthAmount).to.be.eq(ethers.utils.parseUnits("10", 18));
        });
    });

    it("Burn", async () => {
        const tx = await SF.burn(0, supply, owner.address, 0);
        tx.wait();

        const actualSupply = await synth.totalSupply();
        expect(actualSupply.eq(0)).to.be.true;
    });
});
