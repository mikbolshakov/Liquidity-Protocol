// import { expect } from "chai";
// import chalk from "chalk";
// import { ethers } from "hardhat";
// import { scaffold } from "../scripts/scaffold";

// describe("Deploys Correctrly", function () {
//     let log = console.log;
//     beforeEach(() => {
//         console.log = (...args) => log(chalk.hsl(1, 1, 20).italic("\t", ...args));
//     });

//     afterEach(() => {
//         console.log = log;
//     });

//     let factory: string = "";
//     let addresses: Awaited<ReturnType<typeof scaffold>>;
//     it("Deploys all contracts", async () => {
//         addresses = await scaffold();
//         expect(addresses.factory).eq("0x1eB5C49630E08e95Ba7f139BcF4B9BA171C9a8C7");
//         factory = addresses.factory;
//     });

//     it("SynthsFactory Roles are correct", async () => {
//         const [owner] = await ethers.getSigners();
//         const address = await owner.getAddress();

//         const fact = await ethers.getContractAt("SynthFactory", factory);

//         const isAdmin = await fact.hasRole(fact.ADMIN_ROLE(), address);
//         expect(isAdmin).to.be.true;

//         const isMintOwner = await fact.hasRole(fact.MINT_ROLE(), address);
//         expect(isMintOwner).to.be.true;

//         const isMintDex = await fact.hasRole(fact.MINT_ROLE(), addresses.DEXonDemand);
//         expect(isMintDex).to.be.true;

//         const isPauser = await fact.hasRole(fact.PAUSER_ROLE(), addresses.pauser);
//         expect(isPauser).to.be.true;
//     });
// });
