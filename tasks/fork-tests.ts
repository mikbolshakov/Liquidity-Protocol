import { task } from "hardhat/config";
import {
    TASK_COMPILE,
    TASK_TEST_GET_TEST_FILES,
    TASK_TEST_RUN_MOCHA_TESTS,
    TASK_TEST_RUN_SHOW_FORK_RECOMMENDATIONS,
    TASK_TEST_SETUP_TEST_ENVIRONMENT,
} from "hardhat/builtin-tasks/task-names";
import { HARDHAT_NETWORK_NAME } from "hardhat/internal/constants";

import { HardhatContext } from "hardhat/internal/context";
import { createProvider } from "hardhat/internal/core/providers/construction";
import { lazyObject } from "hardhat/internal/util/lazy";
import { MessageTrace } from "hardhat/internal/hardhat-network/stack-traces/message-trace";
import { HardhatNetworkConfig } from "hardhat/types";
import { promisify } from "util";
import { EventEmitter } from "events";
import { createProviderProxy } from "@nomiclabs/hardhat-ethers/internal/provider-proxy";

const sleep = promisify(setTimeout);

type KeysOf<T> = (keyof T)[];
function processName(filename: string) {
    const networks = {
        eth: process.env.ETH_URL,
        bsc: process.env.BSC_URL,
        avax: process.env.AVALANCHE_URL,
        avalanche: process.env.AVALANCHE_URL,
        optimism: process.env.OPTIMISM_URL,
        polygon: process.env.POLYGON_URL,
        fantom: process.env.FANTOM_URL,
        arbitrum: process.env.ARBITRUM_URL,
    };

    const keys = Object.keys(networks) as KeysOf<typeof networks>;
    const matches = keys.map((e) => filename.indexOf(e));
    console.log(filename, matches);
    const keyIdx = matches.findIndex((e) => e >= 0);

    if (keyIdx === -1) {
        throw new Error("Network not found for filename: " + filename);
    }

    const name = keys[keyIdx];
    const url = networks[name];
    return { name, url };
}

async function changeNetwork(f: string) {
    return new Promise<void>((resolve) => {
        bus.once("net_changed", (f: string) => {
            console.log("net_CHANGE", f);
            resolve();
        });
        bus.emit("ch_net", f);
    });
}
const bus = new EventEmitter();
// WORKING POC!!!!
// TODO: Make it switch mid test
HardhatContext.getHardhatContext().extendersManager.add((hre) => {
    console.log("called onece");
    bus.on("ch_net", (filename: string) => {
        //self.network.provider = null as any;
        const nextNet = processName(filename);
        console.log("Change network to ", nextNet);

        const networkName = hre.network.name;
        const networkConfig = hre.network.config as HardhatNetworkConfig;

        if (networkConfig.forking) {
            networkConfig.forking.url = nextNet.url!;
        }
        const provider = lazyObject(() => {
            console.log(`Creating provider for network ${networkName}`);
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

        bus.emit("net_changed", filename);
    });
});

task("fork-test", "Runs mocha tests")
    .addOptionalVariadicPositionalParam("testFiles", "An optional list of files to test", [])
    .addFlag("noCompile", "Don't compile before running this task")
    .addFlag("parallel", "Run tests in parallel")
    .addFlag("bail", "Stop running tests after the first test failure")
    .addOptionalParam("grep", "Only run tests matching the given string or regexp")
    .setAction(
        async (
            {
                testFiles,
                noCompile,
                parallel,
                bail,
                grep,
            }: {
                testFiles: string[];
                noCompile: boolean;
                parallel: boolean;
                bail: boolean;
                grep?: string;
            },
            { run, network }
        ) => {
            if (!noCompile) {
                //await run(TASK_COMPILE, { quiet: true });
            }

            const files = await run(TASK_TEST_GET_TEST_FILES, { testFiles });

            console.log({ files });

            await run(TASK_TEST_SETUP_TEST_ENVIRONMENT);

            await run(TASK_TEST_RUN_SHOW_FORK_RECOMMENDATIONS);
            let testFailures = 0;
            for (const f of files) {
                await changeNetwork(f);

                testFailures += await run(TASK_TEST_RUN_MOCHA_TESTS, {
                    testFiles: [f],
                    parallel,
                    bail,
                    grep,
                });

                if (network.name === HARDHAT_NETWORK_NAME) {
                    const stackTracesFailures = await network.provider.send(
                        "hardhat_getStackTraceFailuresCount"
                    );

                    if (stackTracesFailures !== 0) {
                        console.warn(
                            `Failed to generate ${stackTracesFailures} stack trace(s) . Run Hardhat with --verbose to learn more.`
                        );
                    }
                }
            }
            process.exitCode = testFailures;
            return testFailures;
        }
    );
