import { ethers } from "hardhat";
import { SidLibrary } from "../typechain-types";
import { expect } from "chai";

describe("SidLibrary", () => {
    let sidLibrary: SidLibrary;

    beforeEach(async () => {
        const Factory = await ethers.getContractFactory("SidLibrary");
        sidLibrary = await Factory.deploy();

        await sidLibrary.deployed();
    });

    it("should get bit values", async () => {
        const SID = ethers.BigNumber.from("0x1111222233334444D555666677778888");

        const [chainId, protocolId, poolId] = await sidLibrary.unpack(SID);

        const isLpStackingSynth = await sidLibrary.isLpStackingSynth(SID);

        expect(chainId).to.equal(ethers.BigNumber.from("0x1111222233334444"));
        expect(protocolId).to.equal(ethers.BigNumber.from("0xD5556666"));
        expect(poolId).to.equal(ethers.BigNumber.from("0x77778888"));
        expect(isLpStackingSynth);
    });
});
