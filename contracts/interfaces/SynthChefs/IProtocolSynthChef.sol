// SPDX-License-Identifier: BSL 1.1
pragma solidity ^0.8.15;

interface IProtocolSynthChef {
    function addPool(uint32 poolId, bytes calldata poolInfo) external;

    function deposit(uint32 poolId, uint256[] memory amounts) external;

    function withdraw(uint32 poolId, uint256 lpAmountToWithdraw) external returns (uint256[] memory amounts);

    function depositLP(uint32 poolId, uint256 lpAmount) external;

    function withdrawLP(uint32 poolId, uint256 lpAmount) external;

    function harvest(uint32 poolId) external returns (address[] memory rewardTokens, uint256[] memory amounts);

    function getTotalLpBalance(uint32 poolId) external view returns (uint256 amount);

    function getPoolTokens(uint32 poolId) external view returns (address[] memory tokens);

    function lpTokensToPoolTokens(uint32 poolId, uint256 lpAmount) external view returns (uint256[] memory amounts);

    function getAPY(uint32 poolId) external view;
}
