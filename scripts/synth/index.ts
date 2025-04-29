import { ethers } from "hardhat";
import { Signer, Contract } from "ethers";
import { EntangleSynthFactory__factory } from "../../typechain-types/factories/contracts/EntangleSynthFactory__factory";
import { EntangleSynth__factory } from "../../typechain-types/factories/contracts/EntangleSynth__factory";
import { abi } from "../../artifacts/contracts/EntangleSynthFactory.sol/EntangleSynthFactory.json";
import hre from "hardhat";
export const synthInfo = {
    top: {
        stable: "0x7F5c764cBc14f9669B88837ca1490cCa17c31607",
        chef: "0x28497d56dF4D84ff8480402fDB3E0283E000CcE3",
        factory: "0x7A15F915De12797Ac4fc4A633367C32b523e45Ae",
        chainId: "10",
        pid: "0",
    },
    tbsc: {
        stable: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
        factory: "0x7A15F915De12797Ac4fc4A633367C32b523e45Ae",
        chef: "0x28497d56dF4D84ff8480402fDB3E0283E000CcE3",
        chainId: "56",
        pid: "7",
    },
    tmat: {
        stable: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
        factory: "0x7A15F915De12797Ac4fc4A633367C32b523e45Ae",
        chef: "0x28497d56dF4D84ff8480402fDB3E0283E000CcE3",
        chainId: "137",
        pid: "0",
    },
    tftm: {
        stable: "0x04068DA6C83AFCFA0e13ba15A6696662335D5B75",
        factory: "0x7A15F915De12797Ac4fc4A633367C32b523e45Ae",
        chef: "0x28497d56dF4D84ff8480402fDB3E0283E000CcE3",
        chainId: "250",
        pid: "0",
    },
    tarb: {
        stable: "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8",
        factory: "0x7A15F915De12797Ac4fc4A633367C32b523e45Ae",
        chef: "0xb9E836d1AFC7641AB21c725f5400E710C62BeCF8",
        chainId: "42161",
        pid: "0",
    },
    tavax: {
        stable: "0xA7D7079b0FEaD91F3e65f86E8915Cb59c1a4C664",
        factory: "0x7A15F915De12797Ac4fc4A633367C32b523e45Ae",
        chef: "0x28497d56dF4D84ff8480402fDB3E0283E000CcE3",
        chainId: "43114",
        pid: "8",
    },
    teth: {
        chainId: "1",
        pid: "0",
        factory: "0x6CFdbf0B52c677379f19f978780F6EDDc8d37DFe",
        stable: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        chef: "0xE892434C26FF82db5dd6d8E1585D2c63f7c348A3",
    },
};

export default async function deploy() {
    let owner = (await ethers.getSigners())[0];
    let SynthFactory: Contract;

    let net: string = hre.network.name;
    console.log(net);
    switch (net) {
        case "tftm": {
            SynthFactory = new ethers.Contract(synthInfo[net].factory, abi, owner);
            break;
        }
        case "tavax": {
            SynthFactory = new ethers.Contract(synthInfo[net].factory, abi, owner);
            break;
        }

        case "tbsc": {
            SynthFactory = new ethers.Contract(synthInfo[net].factory, abi, owner);
            break;
        }
        // case "teth": {
        //     SynthFactory = new ethers.Contract(synthInfo[net].factory, abi, owner);
        //     break;
        // }
        case "top": {
            SynthFactory = new ethers.Contract(synthInfo[net].factory, abi, owner);
            break;
        }
        case "tarb": {
            SynthFactory = new ethers.Contract(synthInfo[net].factory, abi, owner);
            break;
        }
        case "tmat": {
            SynthFactory = new ethers.Contract(synthInfo[net].factory, abi, owner);
            break;
        }
        default: {
            return;
            SynthFactory = new ethers.Contract(synthInfo.tmat.factory, abi, owner);
            break;
        }
    }
    if (net != "tmat") {
        let addr = await SynthFactory.previewSynthAddress(
            synthInfo.tmat.chainId,
            synthInfo.tmat.chef,
            synthInfo.tmat.pid,
            synthInfo.tmat.stable
        );
        await (
            await SynthFactory.createSynth(
                synthInfo.tmat.chainId,
                synthInfo.tmat.chef,
                synthInfo.tmat.pid,
                synthInfo.tmat.stable
            )
        ).wait();
        let synth = EntangleSynth__factory.connect(addr, owner);
        await (await synth.setPrice("2000000000000000000")).wait();
    }
    console.log("ues");
    if (net != "tftm") {
        let addr = await SynthFactory.previewSynthAddress(
            synthInfo.tftm.chainId,
            synthInfo.tftm.chef,
            synthInfo.tftm.pid,
            synthInfo.tftm.stable
        );
        await (
            await SynthFactory.createSynth(
                synthInfo.tftm.chainId,
                synthInfo.tftm.chef,
                synthInfo.tftm.pid,
                synthInfo.tftm.stable
            )
        ).wait();
        let synth = EntangleSynth__factory.connect(addr, owner);
        await (await synth.setPrice("2000000000000000000")).wait();
    }
    if (net != "tavax") {
        let addr = await SynthFactory.previewSynthAddress(
            synthInfo.tavax.chainId,
            synthInfo.tavax.chef,
            synthInfo.tavax.pid,
            synthInfo.tavax.stable
        );
        await (
            await SynthFactory.createSynth(
                synthInfo.tavax.chainId,
                synthInfo.tavax.chef,
                synthInfo.tavax.pid,
                synthInfo.tavax.stable
            )
        ).wait();
        let synth = EntangleSynth__factory.connect(addr, owner);
        await (await synth.setPrice("2000000000000000000")).wait();
    }
    if (net != "tbsc") {
        let addr = await SynthFactory.previewSynthAddress(
            synthInfo.tbsc.chainId,
            synthInfo.tbsc.chef,
            synthInfo.tbsc.pid,
            synthInfo.tbsc.stable
        );
        await (
            await SynthFactory.createSynth(
                synthInfo.tbsc.chainId,
                synthInfo.tbsc.chef,
                synthInfo.tbsc.pid,
                synthInfo.tbsc.stable
            )
        ).wait();
        let synth = EntangleSynth__factory.connect(addr, owner);
        await (await synth.setPrice("2000000000000000000")).wait();
    }
    if (net != "top") {
        let addr = await SynthFactory.previewSynthAddress(
            synthInfo.top.chainId,
            synthInfo.top.chef,
            synthInfo.top.pid,
            synthInfo.top.stable
        );
        await (
            await SynthFactory.createSynth(
                synthInfo.top.chainId,
                synthInfo.top.chef,
                synthInfo.top.pid,
                synthInfo.top.stable
            )
        ).wait();
        let synth = EntangleSynth__factory.connect(addr, owner);
        await (await synth.setPrice("2000000000000000000")).wait();
    }
    if (net != "tarb") {
        let addr = await SynthFactory.previewSynthAddress(
            synthInfo.tarb.chainId,
            synthInfo.tarb.chef,
            synthInfo.tarb.pid,
            synthInfo.tarb.stable
        );
        await (
            await SynthFactory.createSynth(
                synthInfo.tarb.chainId,
                synthInfo.tarb.chef,
                synthInfo.tarb.pid,
                synthInfo.tarb.stable
            )
        ).wait();
        let synth = EntangleSynth__factory.connect(addr, owner);
        await (await synth.setPrice("2000000000000000000")).wait();
    }
    console.log("done");
}

deploy(); //.catch(console.log);
