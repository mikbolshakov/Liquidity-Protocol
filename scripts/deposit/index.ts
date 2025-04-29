import { deposit, mint } from "../utils";

type D = {
    chef: string;
    pid: number;
    token: string;
    decimals: number;
};
type M = {
    factory: string;
    chef: string;
    pid: number;
    chainId: number;
    to: string;
    op: string;
};

export async function depositMint(d: D, m: M) {
    const { chef, pid, token, decimals } = d;

    const { factory, chainId, chef: _chef, pid: _pid, to, op } = m;

    const depositAmount = BigInt(20) * BigInt(Math.pow(10, decimals));
    const mintAmount = BigInt(10) * BigInt(Math.pow(10, 18));

    await deposit(chef, pid, token, depositAmount);
    await mint(factory, chainId, _chef, _pid, mintAmount, to, op);
}
