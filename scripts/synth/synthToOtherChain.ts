import hre from "hardhat";
import { ethers } from "hardhat";
import { BigNumber, providers } from "ethers";
import { EntangleSynthFactory__factory } from "../../typechain-types/factories/contracts/EntangleSynthFactory__factory";
import { EntangleSynthFactory } from "../../typechain-types/contracts/EntangleSynthFactory";
import { EntangleSynth__factory } from "../../typechain-types/factories/contracts/EntangleSynth__factory";

const config = {
    networks: {
        tavax: {
            stable: "0xA7D7079b0FEaD91F3e65f86E8915Cb59c1a4C664",
            decimals: "6",
            factory: "0x7A15F915De12797Ac4fc4A633367C32b523e45Ae",
            chef: "0x28497d56dF4D84ff8480402fDB3E0283E000CcE3",
            dex: "0x9BD6C251933a65De268C803fC55E98C5dd9A3CFD",
            chainId: "43114",
            pid: "51",
            provider: "https://nodes.test.entangle.fi/rpc/avalanche",
        },
        tftm: {
            stable: "0x04068DA6C83AFCFA0e13ba15A6696662335D5B75",
            decimals: "6",
            factory: "0x7A15F915De12797Ac4fc4A633367C32b523e45Ae",
            chef: "0x28497d56dF4D84ff8480402fDB3E0283E000CcE3",
            dex: "0x9BD6C251933a65De268C803fC55E98C5dd9A3CFD",
            chainId: "250",
            pid: "0",
            provider: "https://nodes.test.entangle.fi/rpc/fantom",
        },
        tbsc: {
            stable: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
            decimals: "18",
            factory: "0x7A15F915De12797Ac4fc4A633367C32b523e45Ae",
            chef: "0x28497d56dF4D84ff8480402fDB3E0283E000CcE3",
            dex: "0x9BD6C251933a65De268C803fC55E98C5dd9A3CFD",
            chainId: "56",
            pid: "7",
            provider: "https://nodes.test.entangle.fi/rpc/bsc",
        },
        tarb: {
            stable: "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8",
            decimals: "6",
            factory: "0x7A15F915De12797Ac4fc4A633367C32b523e45Ae",
            chef: "0x28497d56dF4D84ff8480402fDB3E0283E000CcE3",
            dex: "0x9BD6C251933a65De268C803fC55E98C5dd9A3CFD",
            chainId: "42161",
            pid: "0",
            provider: "https://nodes.test.entangle.fi/rpc/arbitrum",
        },
        top: {
            stable: "0x7F5c764cBc14f9669B88837ca1490cCa17c31607",
            decimals: "6",
            chef: "0x28497d56dF4D84ff8480402fDB3E0283E000CcE3",
            factory: "0x7A15F915De12797Ac4fc4A633367C32b523e45Ae",
            dex: "0x026a557ef9c75189508d61E3aDa117cBF7712d25",
            chainId: "10",
            pid: "0",
            provider: "https://nodes.test.entangle.fi/rpc/optimism",
        },
        tmat: {
            stable: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
            decimals: "6",
            factory: "0x7A15F915De12797Ac4fc4A633367C32b523e45Ae",
            chef: "0x28497d56dF4D84ff8480402fDB3E0283E000CcE3",
            dex: "0x9BD6C251933a65De268C803fC55E98C5dd9A3CFD",
            chainId: "137",
            pid: "0",
            provider: "https://nodes.test.entangle.fi/rpc/polygon",
        },
    },
};

interface IConfig {
    providers: {
        [key: string]: providers.JsonRpcProvider;
    };

    synthFactories: {
        [key: string]: EntangleSynthFactory;
    };
}

export default async function deploy() {
    const chainConfig: IConfig = { providers: {}, synthFactories: {} };
    const testNetKeys = Object.keys(config.networks);
    let net = hre.network.name as keyof typeof config.networks;
    const mnemonic =
        "poem depth dilemma pattern boat invest federal travel season slogan laugh humble";

    for (let i = 0; i < testNetKeys.length; i++) {
        if (net != testNetKeys[i]) {
            continue;
        }
        const provider = new providers.JsonRpcProvider(
            config.networks[testNetKeys[i] as keyof typeof config.networks].provider
        );
        const wallet = ethers.Wallet.fromMnemonic(mnemonic).connect(provider);
        chainConfig.providers[`${testNetKeys[i]}Provider`] = provider;

        chainConfig.synthFactories[`${testNetKeys[i]}SynthFactory`] =
            EntangleSynthFactory__factory.connect(
                config.networks[testNetKeys[i] as keyof typeof config.networks].factory,
                wallet
            );

        // let addrSynth = await chainConfig.synthFactories[`${testNetKeys[i]}SynthFactory`].deprecated_synths(config.networks[net].chainId, config.networks[net].chef,  config.networks[net].pid);

        // if(addrSynth != ethers.constants.AddressZero) {
        //     continue;
        // }

        let addr = await chainConfig.synthFactories[
            `${testNetKeys[i]}SynthFactory`
        ].previewSynthAddress(
            config.networks[net].chainId,
            config.networks[net].chef,
            config.networks[net].pid,
            config.networks[net].stable,
            { from: wallet.address }
        );
        let tx = await chainConfig.synthFactories[`${testNetKeys[i]}SynthFactory`].createSynth(
            config.networks[net].chainId,
            config.networks[net].chef,
            config.networks[net].pid,
            config.networks[net].stable,
            { from: wallet.address }
        );
        console.log(tx);
        await tx.wait();

        let synth = EntangleSynth__factory.connect(addr, wallet);
        await (await synth.setPrice("2000000000000000000", { from: wallet.address })).wait();
    }
}

deploy();
