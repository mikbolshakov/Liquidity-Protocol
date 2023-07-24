# Running and writing tests

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
