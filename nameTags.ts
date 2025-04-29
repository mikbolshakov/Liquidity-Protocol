import * as Const from "./constants";

const x = {
    ...Const,
};

const addresable = Object.entries(x).filter(
    (e) => typeof e[1] === "string" && e[1].startsWith("0x")
);
const md = addresable.map((e) => e.reverse());

export const nameTags = Object.fromEntries(md);
