// SPDX-License-Identifier: BSL 1.1
pragma solidity ^0.8.15;

import "../../interfaces/SynthChefs/SpiritSwapVelodrome/IQuoteLiquiditySpiritVeloRouter.sol";

interface ISwapVelodromeRouter is IQuoteLiquiditySpiritVeloRouter {
    struct route {
        address from;
        address to;
        bool stable;
    }

    function factory() external view returns (address);

    function weth() external view returns (address);

    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        route[] calldata routes,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);

    function getAmountsOut(uint amountIn, route[] memory routes) external view returns (uint[] memory amounts);
}

interface IVelodromeFactory {
    function getPair(address tokenA, address token, bool stable) external view returns (address);
}

interface IVelodromePair {
    function getReserves() external view returns (uint _reserve0, uint _reserve1, uint _blockTimestampLast);
}
