import hre from "hardhat";
import { ethers } from "hardhat";
import { BigNumber, providers } from "ethers";
import { EntangleSynthFactory__factory } from "../../typechain-types/factories/contracts/EntangleSynthFactory__factory";
import { FantomSynthChef__factory } from "../../typechain-types/factories/contracts/synth-chefs/FantomSynthChef.sol";
import { PolygonSynthChef__factory } from "../../typechain-types/factories/contracts/synth-chefs/PolygonSynthChef.sol";
import { BSCSynthChef__factory } from "../../typechain-types/factories/contracts/synth-chefs/BSCSynthChef.sol";
import { OptimismSynthChef__factory } from "../../typechain-types/factories/contracts/synth-chefs/OptimismSynthChef.sol";
import { ArbitrumSynthChef__factory } from "../../typechain-types/factories/contracts/synth-chefs/ArbitrumSynthChef.sol";
import { AvaxSynthChef__factory } from "../../typechain-types/factories/contracts/synth-chefs/AvaxSynthChef.sol";
import { EntangleSynthFactory } from "../../typechain-types/contracts/EntangleSynthFactory";
import { EntangleSynth__factory } from "../../typechain-types/factories/contracts/EntangleSynth__factory";
import config from "./config.json";

interface IConfig {
    providers: {
        [key: string]: providers.JsonRpcProvider;
    };
    synthFactories: {
        [key: string]: EntangleSynthFactory;
    };
}

export default async function deploy() {
    let SynthChef;
    const chainConfig: IConfig = { providers: {}, synthFactories: {} };
    const configKeys = Object.keys(config.Networks);
    const testNetKeys = Object.keys(config.Contracts);

    let net = hre.network.name;
    for (let i = 0; i < configKeys.length; i++) {
        const provider = new providers.JsonRpcProvider(
            config.Networks[configKeys[i] as keyof typeof config.Networks].provider
        );
        chainConfig.providers[`${configKeys[i]}Provider`] = provider;

        chainConfig.synthFactories[`${configKeys[i]}SynthFactory`] =
            EntangleSynthFactory__factory.connect(
                config.Contracts[testNetKeys[i] as keyof typeof config.Contracts].factory,
                provider
            );
    }
    const networkInfo = config.Contracts[net as keyof typeof config.Contracts];

    console.log(networkInfo);
    switch (net) {
        case "tftm": {
            SynthChef = FantomSynthChef__factory.connect(
                config.Contracts.tftm.chef,
                chainConfig.providers.fantomProvider
            );
            delete chainConfig.synthFactories["fantomSynthFactory"];
            break;
        }

        case "tavax": {
            SynthChef = AvaxSynthChef__factory.connect(
                config.Contracts.tavax.chef,
                chainConfig.providers.avaxProvider
            );
            delete chainConfig.synthFactories["avaxSynthFactory"];
            break;
        }

        case "tbsc": {
            SynthChef = BSCSynthChef__factory.connect(
                config.Contracts.tbsc.chef,
                chainConfig.providers.bscProvider
            );
            delete chainConfig.synthFactories["bscSynthFactory"];
            break;
        }

        case "top": {
            SynthChef = OptimismSynthChef__factory.connect(
                config.Contracts.top.chef,
                chainConfig.providers.optimismProvider
            );
            delete chainConfig.synthFactories["optimismSynthFactory"];
            break;
        }

        case "tarb": {
            SynthChef = ArbitrumSynthChef__factory.connect(
                config.Contracts.tarb.chef,
                chainConfig.providers.arbitrumProvider
            );
            delete chainConfig.synthFactories["arbitrumSynthFactory"];
            break;
        }

        case "tmat": {
            SynthChef = PolygonSynthChef__factory.connect(
                config.Contracts.tmat.chef,
                chainConfig.providers.polygonProvider
            );
            delete chainConfig.synthFactories["polygonSynthFactory"];
            break;
        }
        default: {
            break;
        }
    }

    let balanceBeforeDeposit = await SynthChef?.getBalanceOnFarm(networkInfo.pid);

    await SynthChef?.deposit(
        0,
        networkInfo.stable,
        BigNumber.from(150000).mul(BigNumber.from(10).pow(BigNumber.from(networkInfo.decimals))),
        0
    );

    let balanceAfterDeposit = await SynthChef?.getBalanceOnFarm(networkInfo.pid);

    let balanceOnFarm = BigNumber.from(balanceAfterDeposit).sub(
        BigNumber.from(balanceBeforeDeposit)
    );

    console.log(balanceAfterDeposit, balanceOnFarm);

    for (const [key, value] of Object.entries(chainConfig.synthFactories)) {
        await value.mint(
            networkInfo.chainId,
            networkInfo.chef,
            networkInfo.pid,
            BigNumber.from(balanceOnFarm).div(BigNumber.from(5)),
            networkInfo.dex,
            0
        );
        console.log(key);
        console.log(value);
    }
}

deploy();
