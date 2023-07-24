// SPDX-License-Identifier: BSL 1.1
pragma solidity ^0.8.15;

import "./ISpiritVeloRouter.sol";

interface IQuoteLiquiditySpiritVeloRouter is ISpiritVeloRouter {
    function quoteRemoveLiquidity(
        address tokenA,
        address tokenB,
        bool stable,
        uint256 liquidity
    ) external view returns (uint256 amountA, uint256 amountB);
}
