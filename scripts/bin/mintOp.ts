import { BigNumber } from "ethers";
import { readdirSync, readFileSync } from "fs";
import { ethers } from "hardhat";
import _ from "lodash";
import path from "path";
import config, { projectRoot } from "../../hardhat.config";
import { mintOp } from "../utils/mintOp";

const getSynthInfo = () => {
    const deploys = path.join(projectRoot, "scripts", "deploy", "addresses");
    const files = readdirSync(deploys).filter((e) => /^t[a-z]+_addresses/g.test(e));

    const keys = files.map((e) => e.replace("_addresses.json", ""));
    const items = files
        .map((e) => path.join(deploys, e))
        .map((e) => readFileSync(e))
        .map((e) => JSON.parse(e.toString("utf-8")));

    const obj = _.zipObject(keys, items);
    return obj;
};

async function main() {
    const newNet = _.merge(config.networks, getSynthInfo());
    //console.log();
    const netz = _.pickBy(newNet, (e) => Object.keys(e).length > 2);

    for (const [name, net] of Object.entries(netz)) {
        const provider = new ethers.providers.JsonRpcProvider(net.url);
        const signer = provider.getSigner("0x69475350714B09b60b2ecc3AA5C407b9D1cAEC86");
        const op = await ethers.getContractAt("ERC20", net.opToken, signer);

        console.log(name);
        console.log("Before: ", await op.balanceOf(await signer.getAddress()));

        const toMint = BigNumber.from("10")
            .pow(name === "tbsc" ? 18 : 6)
            .mul(1_000_000);
        await mintOp(name, net.opToken, toMint, signer);

        console.log("After:  ", await op.balanceOf(await signer.getAddress()));
        console.log("========");
    }
}

main()
    .then()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    });
