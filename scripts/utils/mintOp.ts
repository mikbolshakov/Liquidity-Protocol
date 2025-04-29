import { BigNumber, BigNumberish, ContractTransaction, providers, Signer } from "ethers";
import { ethers } from "hardhat";
import _, { throttle } from "lodash";
import { BEP20Token } from "../../typechain-types";
import { impersonate } from ".";
import { sign } from "crypto";

async function mintAndTransfer(
    net: string,
    contract: BEP20Token,
    amount: BigNumberish,
    to: string,
    owner: string
): Promise<ContractTransaction> {
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

        case "teth":
        case "tavax": {
            await contract.updateMasterMinter(owner).then((x) => x.wait());
            await contract
                .configureMinter(owner, ethers.constants.MaxUint256)
                .then((x) => x.wait());
            // Fall through to `top` case
        }
        case "top": {
            return await contract["mint(address,uint256)"](to, amount);
        }
        case "tbsc": {
            await contract["mint(uint256)"](amount).then((x) => x.wait());
            return await contract.transfer(to, amount);
        }
        default: {
            throw new Error("Unavailable network");
        }
    }
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
            return await contract.getRoleMember(role, 0);
        }
        case "teth":
        case "tavax":
        case "tftm": {
            return await contract.owner();
        }
        case "tbsc": {
            return await contract.getOwner();
        }
        default: {
            throw new Error("Unavailable network");
        }
    }
}

export async function mintOp(net: string, token: string, toGet: BigNumberish, signer: Signer) {
    const provider = signer.provider;

    if (!provider || !(provider instanceof providers.JsonRpcProvider)) {
        throw new Error("Invalid provider");
    }

    const OpContract = await ethers.getContractAt("BEP20Token", token, signer);
    const owner = await net_GetOwner(net, OpContract);

    const toAddress = await signer.getAddress();

    return await impersonate(provider, owner, async (signer) => {
        const busd = await ethers.getContractAt("BEP20Token", token, signer);
        return await mintAndTransfer(net, busd, toGet, toAddress, owner);
    });
}
