import { BigNumber, BigNumberish, Signer, providers } from "ethers";
import { readdirSync, readFileSync } from "fs";
import { ethers } from "hardhat";
import _ from "lodash";
import config from "../hardhat.config";
import path from "path";
import { BEP20Token } from "../typechain-types";

async function impersonate<T>(
    provider: providers.JsonRpcProvider,
    addr: string,
    x: (s: Signer) => Promise<T>
): Promise<T> {
    await provider.send("hardhat_impersonateAccount", [addr]);
    const signer = await provider.getSigner(addr);
    const ret = await x(signer);

    await provider.send("hardhat_stopImpersonatingAccount", [addr]);

    return ret;
}

const getSynthInfo = () => {
    const deploys = path.join(__dirname, "deploy", "addresses");
    const files = readdirSync(deploys).filter((e) => /^t[a-z]+_addresses/g.test(e));

    const keys = files.map((e) => e.replace("_addresses.json", ""));
    const items = files
        .map((e) => path.join(deploys, e))
        .map((e) => readFileSync(e))
        .map((e) => JSON.parse(e.toString("utf-8")));

    const obj = _.zipObject(keys, items);
    return obj;
};
async function mintAndTransfer(
    net: string,
    contract: BEP20Token,
    amount: BigNumberish,
    to: string,
    owner: string
) {
    switch (net) {
        case "tftm": {
            return contract.Swapin(Buffer.alloc(32), to, amount);
        }
        case "tarb": {
            return contract.bridgeMint(to, amount);
        }
        case "tmat": {
            const amt = ethers.utils.defaultAbiCoder.encode(["uint256"], [amount]);
            return contract.deposit(to, amt);
        }

        default: {
            try {
                const ok = await contract["mint(uint256)"](amount);
                console.log(await ok.wait());
                await contract.transfer(to, amount);
                return;
            } catch (e) {
                await contract
                    .updateMasterMinter(owner)
                    .then(() => contract.configureMinter(owner, ethers.constants.MaxUint256))
                    .catch();

                const ok = await contract["mint(address,uint256)"](to, amount);
                console.log(await ok.wait());
            }
        }
    }
}
async function getMeSomeTokesn(
    net: string,
    provider: providers.JsonRpcProvider,
    token: string,
    owner: string,
    toGet: BigNumberish,
    toAcc: string
) {
    if (BigNumber.from(toGet).eq(0)) {
        console.log("pass");
        return;
    }
    // Set owner balance just in case
    provider.send("hardhat_setBalance", [owner, "0x1111111111111111"]);

    return await impersonate(provider, owner, async (signer) => {
        const busd = await ethers.getContractAt("BEP20Token", token, signer);
        await mintAndTransfer(net, busd, toGet, toAcc, owner);
    });
}

async function net_GetOwner(net: string, contract: BEP20Token) {
    switch (net) {
        case "top": {
            return await contract.l2Bridge();
        }
        case "tarb": {
            return await contract.gatewayAddress();
        }
        case "tmat": {
            const role = await contract.DEPOSITOR_ROLE();
            console.log(role);
            return await contract.getRoleMember(role, 0);
        }
        default: {
            return await contract.owner().catch(() => contract.getOwner());
        }
    }
}
//const toMint = ethers.BigNumber.from("9244148").mul(BigNumber.from(10).pow());

async function main() {
    const [self] = [{ address: "0x69475350714B09b60b2ecc3AA5C407b9D1cAEC86" }]; //await ethers.getSigners();
    console.log(self.address);
    const newNet = _.merge(config.networks, getSynthInfo());
    //console.log();
    const netz = _.pickBy(newNet, (e) => Object.keys(e).length > 2);

    for (const [name, net] of Object.entries(netz)) {
        const provider = new ethers.providers.JsonRpcProvider(net.url);
        const signer = provider.getSigner("0x69475350714B09b60b2ecc3AA5C407b9D1cAEC86");

        console.log(name, net.opToken);

        const selfBUSD = await ethers.getContractAt("BEP20Token", net.opToken, signer);
        const bal = await selfBUSD.balanceOf(self.address);
        const toMint = ethers.BigNumber.from("1337").mul(BigNumber.from(10).pow(25)).sub(bal);
        console.log(toMint);

        const owner = await net_GetOwner(name, selfBUSD);
        console.log(owner);
        console.log("-----");

        await getMeSomeTokesn(
            name,
            provider,
            net.opToken,
            owner!,
            toMint,
            await signer.getAddress()
        );
        console.log("========");
    }
}

main()
    .then()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    });
