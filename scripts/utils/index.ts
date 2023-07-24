import { providers, Signer } from "ethers";

export async function impersonate<T>(
    provider: providers.JsonRpcProvider,
    addr: string,
    x: (s: Signer) => Promise<T>
): Promise<T> {
    await provider.send("hardhat_impersonateAccount", [addr]);
    provider.send("hardhat_setBalance", [addr, "0x1111111111111111111111111"]);

    const signer = await provider.getSigner(addr);
    const ret = await x(signer);

    await provider.send("hardhat_stopImpersonatingAccount", [addr]);

    return ret;
}
