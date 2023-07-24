// SPDX-License-Identifier: BSL 1.1
pragma solidity 0.8.19;

interface IPair {
    function token0() external view returns (address);

    function token1() external view returns (address);

    function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast);

    function totalSupply() external view returns (uint);
}
