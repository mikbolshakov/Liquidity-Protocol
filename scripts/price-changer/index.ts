import { BigNumber, BigNumberish } from "ethers";
import { readdirSync, readFileSync } from "fs";
import { ethers } from "hardhat";
import _ from "lodash";
import path from "path";
import Config from "../../hardhat.config";
import { Synth } from "../../typechain-types";
import { synthInfo } from "../synth";
import { promisify } from "util";
const sleep = promisify(setTimeout);

type SynthInfoKeys = keyof typeof synthInfo;
type TestnetConfigT = Record<string, { url: string; accounts: { mnemonic: string } }>;

class DefaultDict {
    constructor(defaultInit: any) {
        return new Proxy(
            {},
            {
                get: (target: any, name) =>
                    name in target
                        ? target[name]
                        : (target[name] =
                              typeof defaultInit === "function" ? new defaultInit().valueOf() : defaultInit),
            }
        );
    }
}

const DECIMALS = 18;

const decimal = (x: BigNumberish) => BigNumber.from(10).pow(x);
const extend = (n: BigNumber, from: number, to: number) => n.mul(decimal(to - from));

function price(tlv: BigNumberish, tvlDecimals: number, synthAmt: BigNumberish, decimalsOut: number) {
    console.log(`tvl=${tlv} synthAmt=${synthAmt}`);
    //  tlvDecimalAdjusted = tlvInOpTokenWEI * (10 ** (DECIMALS -opTokenDecimals))
    let tlvDecimalAdjusted = BigNumber.from(tlv).mul(decimal(DECIMALS - tvlDecimals));
    //console.log(`adj=${tlvDecimalAdjusted.toBigInt()} decimals=${DECIMALS}`);

    //  price = tlvDecimalAdjusted / synthAmt
    let price = tlvDecimalAdjusted.mul(decimal(DECIMALS)).div(synthAmt);
    //console.log(`ratio=${price.toBigInt()} synthAmt=${synthAmt}`);
    //  price = price * (10 ** opTokenDecimals)
    //price = price.mul(decimal(Math.abs(decimalsOut)));
    /*
  if(price.eq(1)) {
    //console.log('price is one');
    price = price.mul(decimal(decimalsOut));
    return price;
  }
  if(decimalsOut > tvlDecimals) {
    price = price.mul(decimal(decimalsOut - tvlDecimals));
  }
  if(decimalsOut < tvlDecimals) {
    price = price.mul(decimal(decimalsOut));
  }
*/
    //console.log(`price=${price.toBigInt()} decimals=${decimalsOut}`);
    //console.log(decimal(DECIMALS - opTokenDecimals));

    return price;
}

class SynthGroup {
    constructor(
        public tlv = BigNumber.from(0),
        public circulation = BigNumber.from(0),
        public lpSupply = BigNumber.from(0),
        public tlvDecimals = 0
    ) {}
    public setLpSupply(x: BigNumber) {
        this.lpSupply = x;
    }
    public setTlv(x: BigNumber, d: number) {
        this.tlv = x;
        this.tlvDecimals = d;
    }

    public addSupply(x: BigNumberish) {
        this.circulation = this.circulation.add(x);
    }

    public synths: SynthMeta[] = [];
    public addSynth(synth: Synth, s: string, d: number) {
        this.synths.push(new SynthMeta(synth, s, d, this));
    }
}
class SynthMeta {
    constructor(
        public synth: Synth,
        public srcChain: string,
        public opDecimals = NaN,
        public synthGroup: SynthGroup
    ) {}

    public getPrice() {
        // Set price to uint256 max so synth would be practically unobtainable
        // if we are short on circulation or backing asset
        if (this.synthGroup.circulation.eq(0) || this.synthGroup.tlv.eq(0)) {
            return ethers.constants.MaxUint256;
        }
        return price(this.synthGroup.tlv, this.synthGroup.tlvDecimals, this.synthGroup.circulation, this.opDecimals);
    }

    public async fmtChainInfo() {
        const chainId = await this.synth.signer.getChainId();
        const chainHuman = _.findKey(_synthInfo, (e) => e.chainId === chainId.toString()) || "????";
        return `[${this.srcChain.padStart(8)} -> ${chainHuman.padEnd(8)}]`;
    }
}

const getSynthInfo = () => {
    const deploys = path.join(__dirname, "..", "deploy", "addresses");
    const files = readdirSync(deploys).filter((e) => /^t[a-z]+_addresses/g.test(e));

    const keys = files.map((e) => e.replace("_addresses.json", ""));
    const items = files
        .map((e) => path.join(deploys, e))
        .map((e) => readFileSync(e))
        .map((e) => JSON.parse(e.toString("utf-8")));

    const obj = _.zipObject(keys, items);
    console.log(obj);
    return obj;
};

const _synthInfo = _.merge(synthInfo, getSynthInfo());

async function main() {
    const networks = Config.networks!;
    // Assume all test nets prefixed with the `t`
    const testnets = Object.fromEntries(
        Object.entries(networks).filter(([k, v]) => k.startsWith("t"))
    ) as TestnetConfigT;

    console.log(testnets);
    while (1) {
        const synthMeta = new DefaultDict(SynthGroup) as Record<string, SynthGroup>;
        // Iterate over all networks
        for (const [k, v] of Object.entries(testnets)) {
            const config = _synthInfo[k as SynthInfoKeys];
            // Setup rpcs and wallets from mnemonics
            const provider = new ethers.providers.JsonRpcProvider(v.url);
            const mnemo = ethers.Wallet.fromMnemonic(v.accounts.mnemonic, `m/44'/60'/0'/0/1`);
            const wallet = new ethers.Wallet(mnemo.privateKey, provider);

            const factory = await ethers.getContractAt("SynthFactory", config.factory, wallet);
            console.log("---- ", config.chainId, factory.address);

            const opToken = await ethers.getContractAt("ERC20", config.stable, wallet);
            const decimals = await opToken.decimals();
            // Iterate over all onchain synths
            for (const [network, info] of Object.entries(_synthInfo)) {
                const synthId = `${info.chainId}_${info.chef}_${info.pid}`;
                console.log(`on network ${k}, from network ${network}`, synthId);
                // If we hit the network of origin (where SynthChef is deployed)
                // just collect the tlv and some info about opToken
                if (k === network) {
                    console.log("--------- SKIP ---------");
                    const chef = await ethers.getContractAt("BaseSynthChef", config.chef, wallet);
                    const tlv = await chef.getBalanceOnFarm(config.pid);
                    const lpAmt = await chef.getLPAmountOnFarm(config.pid);
                    const opToken = await ethers.getContractAt("ERC20", config.stable, wallet);
                    const tlvDecimals = await opToken.decimals();
                    console.log(`lpAmount=${lpAmt} ${tlvDecimals}`);
                    synthMeta[synthId].setTlv(tlv, tlvDecimals);
                    if (["tmat", "tarb"].includes(network)) {
                        synthMeta[synthId].setLpSupply(extend(lpAmt, 6, 18));
                    } else {
                        synthMeta[synthId].setLpSupply(lpAmt);
                    }
                    continue;
                }
                // Get the amount of synth minted on this chain
                // and accumulate it to get the total circulation
                // of this synth across all chains.
                // Also save the synth itself for future reference
                const synthAddress = await factory.deprecated_synths(info.chainId, info.chef, info.pid);
                const synth = await ethers.getContractAt("Synth", synthAddress, wallet);
                const totalSupply = await synth.totalSupply();
                synthMeta[synthId].addSupply(totalSupply);
                synthMeta[synthId].addSynth(synth, network, decimals);
            }
        }
        console.log(synthMeta);
        // Update the prices after we collected all the info from all chains
        for (const [k, v] of Object.entries(synthMeta)) {
            for (const meta of v.synths) {
                const newPrice = meta.getPrice();
                console.log(
                    await meta.fmtChainInfo(),
                    formatSynthHashKey(k),
                    "|",
                    meta.synth.address,
                    "->",
                    newPrice,
                    ethers.utils.formatUnits(newPrice, meta.opDecimals),
                    meta.opDecimals
                );
                await meta.synth.setPrice(newPrice);
            }
        }

        await sleep(300000);
    }
}

const formatSynthHashKey = (x: string) => {
    const [chainId, chefAddr, pid] = x.split("_");
    const chainIdMaxLen = Math.max(
        ...Object.values(_synthInfo)
            .map((e) => e.chainId)
            .map((e) => e.length)
    );
    const pidMaxLen = Math.max(
        ...Object.values(_synthInfo)
            .map((e) => e.pid)
            .map((e) => e.length)
    );
    return `${chainId.padStart(chainIdMaxLen)}_${chefAddr}_${pid.padEnd(pidMaxLen)}`;
};

main()
    .then()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    });
