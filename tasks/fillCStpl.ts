import { readdirSync, readFileSync, writeFileSync } from "fs";
import { task } from "hardhat/config";
import * as _ from "lodash";
import path from "path";
import "@nomicfoundation/hardhat-toolbox";

task("fill_tpl", "Fill template with addresses")
    .addParam("tpl", "Path to template")
    .setAction(async (x: any): Promise<void> => {
        const { tpl } = x;
        const deploys = path.join(__dirname, "deploy", "addresses");
        const files = readdirSync(deploys).filter((e) => /^t[a-z]+_addresses/g.test(e));

        const keys = files.map((e) => e.replace("_addresses.json", ""));
        const items = files
            .map((e) => path.join(deploys, e))
            .map((e) => readFileSync(e))
            .map((e) => JSON.parse(e.toString("utf-8")));

        const obj = _.zipObject(keys, items);

        const txt = readFileSync(tpl).toString("utf-8");
        let i = 1;
        const out = txt.replace(/\{\{\s*[a-zA-Z.]+\s*\}\}/g, (x) => {
            const path = x.replace("{{", "").replace("}}", "").trim();
            const val = _.get(obj, path);
            if (val === undefined) {
                console.error(path, "was not found. No changes were made");
                process.exit(1);
            }
            console.log(path, "=", val);
            i++;
            return val;
        });

        writeFileSync(tpl.replace(".tpl", ""), out);
        console.log(`Done! Replaced ${i} values`);
    });
