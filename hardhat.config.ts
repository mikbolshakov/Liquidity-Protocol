import * as dotenv from "dotenv";

import "@nomicfoundation/hardhat-chai-matchers";
import "@nomicfoundation/hardhat-toolbox";
import "@nomiclabs/hardhat-ganache";
import "@nomiclabs/hardhat-vyper";
import "@openzeppelin/hardhat-upgrades";
import "hardhat-tracer";
import { HardhatUserConfig } from "hardhat/config";
import { nameTags } from "./nameTags";
import "./tasks/fillCStpl";
import "./tasks/fork-tests";

dotenv.config();

// load tasks after the .env is loaded
import "./tasks/fillCStpl";
import "./tasks/fork-in-tests";

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more
export const projectRoot = __dirname;

const config: HardhatUserConfig = {
    solidity: {
        compilers: [
            {
                version: "0.8.19",
                settings: {
                    optimizer: {
                        enabled: true,
                        runs: 1000,
                    },
                    viaIR: true,
                },
            },
            {
                version: "0.6.6",
            },
            {
                version: "0.6.12",
            },
            { version: "0.5.16" },
        ],
    },
    networks: {
        hardhat: {
            // mining: {
            //   auto: false,
            //   interval: [5000, 5000],
            // },
            chainId: Number(process.env.CHAIN_ID || 1337),
            forking: {
                url: process.env.FORK_URL_OVERRIDE || "https://rpc.ankr.com/eth",
                // blockNumber: Number(process.env.FROM_BLOCK) || 228,
            },
            // accounts: [
            //   {
            //     balance: "100000000000000000000000000000",
            //     privateKey: process.env.PRIVATE_KEY as string,
            //   },
            // ],
        },

        teth: {
            url: "https://nodes.test.entangle.fi/rpc/eth",
            accounts: {
                mnemonic:
                    "poem depth dilemma pattern boat invest federal travel season slogan laugh humble",
            },
        },
        tbsc: {
            url: "https://nodes.test.entangle.fi/rpc/bsc",
            accounts: {
                mnemonic:
                    "poem depth dilemma pattern boat invest federal travel season slogan laugh humble",
            },
        },
        tavax: {
            url: "https://nodes.test.entangle.fi/rpc/avalanche",
            accounts: {
                mnemonic:
                    "poem depth dilemma pattern boat invest federal travel season slogan laugh humble",
            },
        },
        tftm: {
            url: "https://nodes.test.entangle.fi/rpc/fantom",
            accounts: {
                mnemonic:
                    "poem depth dilemma pattern boat invest federal travel season slogan laugh humble",
            },
        },
        top: {
            url: "https://nodes.test.entangle.fi/rpc/optimism",
            accounts: {
                mnemonic:
                    "poem depth dilemma pattern boat invest federal travel season slogan laugh humble",
            },
        },
        tarb: {
            url: "https://nodes.test.entangle.fi/rpc/arbitrum",
            accounts: {
                mnemonic:
                    "poem depth dilemma pattern boat invest federal travel season slogan laugh humble",
            },
        },
        tmat: {
            url: "https://nodes.test.entangle.fi/rpc/polygon",
            accounts: {
                mnemonic:
                    "poem depth dilemma pattern boat invest federal travel season slogan laugh humble",
            },
        },
        ftm: {
            url: "https://rpc.ftm.tools",
            accounts: {
                mnemonic:
                    "poem depth dilemma pattern boat invest federal travel season slogan laugh humble",
            },
        },
        avax: {
            url: "https://avalanche-evm.publicnode.com",
            accounts: {
                mnemonic:
                    "poem depth dilemma pattern boat invest federal travel season slogan laugh humble",
            },
        },
        bsc: {
            url: "https://bsc-mainnet.public.blastapi.io",
            accounts: {
                mnemonic:
                    "poem depth dilemma pattern boat invest federal travel season slogan laugh humble",
            },
        },
        eth: {
            url: "https://eth-rpc.gateway.pokt.network",
            accounts: {
                mnemonic:
                    "poem depth dilemma pattern boat invest federal travel season slogan laugh humble",
            },
        },
        op: {
            url: "https://1rpc.io/op",
            accounts: {
                mnemonic:
                    "poem depth dilemma pattern boat invest federal travel season slogan laugh humble",
            },
        },
        arb: {
            url: "https://arb1.arbitrum.io/rpc",
            accounts: {
                mnemonic:
                    "poem depth dilemma pattern boat invest federal travel season slogan laugh humble",
            },
        },
        /*
    // local testnet
    teth: {
      url: "http://192.168.1.188:8590",
      accounts: {
        mnemonic: "poem depth dilemma pattern boat invest federal travel season slogan laugh humble"
      },
    },
    tbsc: {
      url: "http://192.168.1.188:8591",
      accounts: {
        mnemonic: "poem depth dilemma pattern boat invest federal travel season slogan laugh humble"
      },
    },
    top: {
      url: "http://192.168.1.188:8592",
      accounts: {
        mnemonic: "poem depth dilemma pattern boat invest federal travel season slogan laugh humble"
      },
    },
    tavax: {
      url: "http://192.168.1.188:8593",
      accounts: {
        mnemonic: "poem depth dilemma pattern boat invest federal travel season slogan laugh humble"
      },
    },
    tarb: {
      url: "http://192.168.1.188:8594",
      accounts: {
        mnemonic: "poem depth dilemma pattern boat invest federal travel season slogan laugh humble"
      },
    },
    tftm: {
      url: "http://192.168.1.188:8595",
      accounts: {
        mnemonic: "poem depth dilemma pattern boat invest federal travel season slogan laugh humble"
      },
    },
    tmat: {
      url: "http://192.168.1.188:8596",
      accounts: {
        mnemonic: "poem depth dilemma pattern boat invest federal travel season slogan laugh humble"
      },
    }
*/
    },
    vyper: {
        version: "0.2.12",
    },
    etherscan: {
        apiKey: process.env.BSCSCAN_KEY,
    },
    mocha: {
        timeout: 100000000,
    },
    tracer: {
        nameTags,
    },
    gasReporter: {
        enabled: process.env.REPORT_GAS !== undefined,
        currency: "USD",
    },
};

export default config;
