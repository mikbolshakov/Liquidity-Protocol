import { ContractTransaction } from "ethers";
import { ethers, upgrades } from "hardhat";
import deploySynthChef from "./deploySynthChef";
import deployWrapper from "./deployWrapper";

export default async function deployContracts(BRIDGE_ADDR: string, isTestnet: boolean) {
    console.log("Start deploying protocol contracts");

    const FEE_COLLECTOR = "0x493b11ee518590515b307f852650cb16483573c6";

    let [owner] = await ethers.getSigners();

    const PauserFactory = await ethers.getContractFactory("Pauser");
    const IDEXFactory = await ethers.getContractFactory("DEX");
    const PoolFactory = await ethers.getContractFactory("Pool");
    const RouterFactory = await ethers.getContractFactory("Router");
    const LendingFactory = await ethers.getContractFactory("Lending");
    const DEXonDemandFactory = await ethers.getContractFactory("DEXOnDemand");
    const SynthFactoryFactory = await ethers.getContractFactory("SynthFactory");

    /*
       DEPLOY WRAPPER
    */
    let wrapperAddress = await deployWrapper();

    /*
        DEPLOY CHEF
    */
    let { stableAddress, chefAddress, pids } = await deploySynthChef(wrapperAddress, FEE_COLLECTOR);
    let chef = await ethers.getContractAt("BaseSynthChef", chefAddress, owner);

    /*
        DEPLOY SYNTH FACTORY
    */
    let factory = await upgrades.deployProxy(SynthFactoryFactory);
    await factory.deployed();

    /*
        DEPLOY DEX on DEMAND
    */
    let DEXonDemand = await DEXonDemandFactory.deploy(factory.address, chef.address);
    await DEXonDemand.deployed();

    /*
        DEPLOY LANDING
    */
    let lending = await LendingFactory.deploy();
    await lending.deployed();

    /*
        DEPLOY POOL
    */
    let pool = await PoolFactory.deploy();
    await pool.deployed();

    /*
       DEPLOY  DEX
    */
    let idex = await IDEXFactory.deploy(FEE_COLLECTOR);
    await idex.deployed();

    /*
        DEPLOY ROUTER
    */
    let router = await RouterFactory.deploy(
        pool.address,
        idex.address,
        chef.address,
        factory.address,
        lending.address,
        BRIDGE_ADDR,
        2500,
        4,
        2
    );
    await router.deployed();

    /*
        DEPLOY PAUSER
    */
    let pauser = await PauserFactory.deploy([
        chef.address,
        factory.address,
        DEXonDemand.address,
        pool.address,
        idex.address,
        router.address,
        lending.address,
    ]);
    await pauser.deployed();

    /*
        GRANT ROLES
    */

    if (isTestnet) {
        let bridge = await ethers.getContractAt("TestBridge", BRIDGE_ADDR, owner);
        await bridge.grantRole(bridge.ADMIN_ROLE(), router.address).then((e) => e.wait());
    }
    const ownerAddress = await owner.getAddress();

    const wait = (tx: ContractTransaction) => tx.wait();
    const waitMap = (e: Promise<ContractTransaction>) => e.then(wait);

    const promises = [
        () => chef.grantRole(chef.ADMIN_ROLE(), DEXonDemand.address),
        () => chef.grantRole(chef.ADMIN_ROLE(), router.address),
        () => chef.grantRole(chef.BORROWER_ROLE(), lending.address),
        () => chef.grantRole(chef.PAUSER_ROLE(), pauser.address),
        () => DEXonDemand.grantRole(DEXonDemand.ADMIN_ROLE(), ownerAddress),
        () => factory.grantRole(factory.MINT_ROLE(), ownerAddress),
        () => factory.grantRole(factory.MINT_ROLE(), DEXonDemand.address),
        () => factory.grantRole(factory.PAUSER_ROLE(), pauser.address),
        () => idex.grantRole(idex.ADMIN(), ownerAddress),
        () => idex.grantRole(idex.BORROWER_ROLE(), lending.address),
        () => idex.grantRole(idex.BUYER(), router.address),
        () => idex.grantRole(idex.PAUSER_ROLE(), pauser.address),
        () => idex.grantRole(idex.PAUSER_ROLE(), pauser.address),
        () => idex.grantRole(idex.REBALANCER(), router.address),
        () => lending.authorizeLender(chef.address),
        () => lending.authorizeLender(idex.address),
        () => lending.grantRole(lending.BORROWER_ROLE(), router.address),
        () => lending.grantRole(lending.PAUSER_ROLE(), pauser.address),
        () => pool.grantRole(pool.DEPOSITER_ROLE(), ownerAddress),
        () => pool.grantRole(pool.DEPOSITER_ROLE(), router.address),
        () => pool.grantRole(pool.PAUSER_ROLE(), pauser.address),
        () => router.grantRole(router.ADMIN(), ownerAddress),
        () => router.grantRole(router.PAUSER_ROLE(), pauser.address),
    ];

    //FIXME: Dafuk???
    promises.slice(1).reduce((acc: Promise<ContractTransaction>, cv: () => Promise<ContractTransaction>) => {
        return acc.then((e) => e.wait().then(cv));
    }, promises[0]());

    console.log("Wrapper:", wrapperAddress);
    console.log("Synth chef:", chef.address);
    console.log("Factory:", factory.address);
    console.log("DEX on demand:", DEXonDemand.address);
    console.log("Router:", router.address);
    console.log("DEX:", idex.address);
    console.log("Pool:", pool.address);
    console.log("Lending:", lending.address);

    return {
        wrapper: wrapperAddress,
        chef: chef.address,
        factory: factory.address,
        DEXonDemand: DEXonDemand.address,
        router: router.address,
        idex: idex.address,
        pool: pool.address,
        lending: lending.address,
        opToken: stableAddress,
        bridge: BRIDGE_ADDR,
        pauser: pauser.address,
    };
}
