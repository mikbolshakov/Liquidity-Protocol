This project demonstrates a basic Hardhat use case. It comes with a sample contract, a test for that contract, and a script that deploys that contract.

## Running:

```shell
# To run, you need the hardhat.config.ts file
yarn # install the pacakages
yarn compile # compile the contracts
yarn test # run the tests, make sure dotenv is not empty
```

## Running and writing tests

-   Get dotenv
-   Run `yarn test`

If you want to write a test with a specific network in mind
do the following

```javascript
import { setFork } from "hardhat";
describe("Foo", function () {
    before(async () => {
        // If you want to set the network for the scope of this test file
        await setFork("short name (eth, bsc, avax, etc)");
        // after this promise resolves ethers.provider will be forking the network, so you just go on as normal
    });
});
```

> Note: Try to avoid switching networks in the test multiple times, since it will destroy all the EVM state modification that you're did
>
> So as the rule of thumb do the `setFork` BEFORE you deploy your contracts
