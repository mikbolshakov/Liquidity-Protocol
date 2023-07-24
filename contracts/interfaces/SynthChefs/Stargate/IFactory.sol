// SPDX-License-Identifier: BSL 1.1
pragma solidity 0.8.19;

import "./IPool.sol";

interface IStargateFactory {
    function getPool(uint256 _poolId) external view returns (IStargatePool);
}
