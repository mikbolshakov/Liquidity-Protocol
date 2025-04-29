import { MessageTrace } from "hardhat/internal/hardhat-network/stack-traces/message-trace";
import { createProviderProxy } from "@nomiclabs/hardhat-ethers/internal/provider-proxy";
import { createProvider } from "hardhat/internal/core/providers/construction";
import { HardhatContext } from "hardhat/internal/context";
import { lazyObject } from "hardhat/internal/util/lazy";
import { HardhatNetworkConfig } from "hardhat/types";
import { EventEmitter } from "events";
import debug from "debug";

const log = debug("hardhat:entn:ext:fork");

const _networks = {
    eth: process.env.ENT_ETH_URL,
    bsc: process.env.ENT_BSC_URL,
    avax: process.env.ENT_AVALANCHE_URL,
    avalanche: process.env.ENT_AVALANCHE_URL,
    optimism: process.env.ENT_OPTIMISM_URL,
    polygon: process.env.ENT_POLYGON_URL,
    fantom: process.env.ENT_FANTOM_URL,
    arbitrum: process.env.ENT_ARBITRUM_URL,
};
type NetKeys = keyof typeof _networks;

const networks = createKeyofT(_networks);

function createKeyofT<T extends object>(o: T) {
    return Object.assign(o, {
        keyof: function (x: unknown): x is keyof T {
            if (x === "keyof") {
                return false;
            }
            const k = Object.keys(this);
            const idx = k.findIndex((e) => e === x);
            return idx !== -1;
        },
    });
}

async function changeNetwork(f: string) {
    return new Promise<void>((resolve) => {
        bus.once("net_changed", (f: string) => {
            log("net_CHANGE", f);
            resolve();
        });
        bus.emit("ch_net", f);
    });
}
const bus = new EventEmitter();
declare module "hardhat/types/runtime" {
    interface HardhatRuntimeEnvironment {
        setFork(urlOrShortname: keyof typeof _networks): Promise<void>;
    }
}

function resolveUrl(s: string) {
    try {
        const url = new URL(s);
        return url.toString();
    } catch (e) {}

    if (!networks.keyof(s)) {
        throw new Error(`Unknown network name \`${s}\` `);
    }

    if (!networks[s] || typeof networks[s] !== "string") {
        throw new Error(`Network url is missing for \`${s}\`; Check your .env file`);
    }

    return networks[s]!;
}

// WORKING POC!!!!
// TODO: Make it switch mid test
HardhatContext.getHardhatContext().extendersManager.add((hre) => {
    hre.setFork = changeNetwork;

    bus.on("ch_net", (shortName: string) => {
        //self.network.provider = null as any;
        const nextNet = resolveUrl(shortName);
        log("Change network to ", nextNet);

        const networkName = hre.network.name;
        const networkConfig = hre.network.config as HardhatNetworkConfig;

        if (networkConfig.forking) {
            networkConfig.forking.url = nextNet;
            const bn = process.env[`ENT_${shortName.toUpperCase()}_BLOCK`];
            networkConfig.forking.blockNumber = bn ? Number(bn) : undefined;
        }

        const provider = lazyObject(() => {
            log(`Creating provider for network ${networkName}`);
            return createProvider(
                networkName,
                networkConfig,
                hre.config.paths,
                hre.artifacts,
                HardhatContext.getHardhatContext().experimentalHardhatNetworkMessageTraceHooks.map(
                    (hook) => (trace: MessageTrace, isCallMessageTrace: boolean) =>
                        hook(hre, trace, isCallMessageTrace)
                )
            );
        });

        hre.network.provider = provider;
        hre.ethers.provider = createProviderProxy(hre.network.provider);

        bus.emit("net_changed", shortName);
    });
});
