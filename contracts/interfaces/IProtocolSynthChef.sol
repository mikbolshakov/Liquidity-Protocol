// SPDX-License-Identifier: BSL 1.1
pragma solidity 0.8.15;

interface IProtocolSynthChef {
    function addPool(uint32 poolId, bytes calldata poolInfo) external; // onlyRole(ADMIN)

    function deposit(uint32 poolId, uint256[] memory amounts) external; // onlyRole(MASTER)

    function withdraw(
        uint32 poolId,
        uint256 lpAmountToWithdraw
    ) external returns (uint256[] memory amounts); // onlyRole(MASTER)

    function depositLps(uint32 poolId, uint256 lpAmount) external; // onlyRole(MASTER)

    function withdrawLPs(uint32 poolId, uint256 lpAmount) external; // onlyRole(MASTER)

    function harvest(
        uint32 poolId
    ) external returns (address[] memory rewardTokens, uint256[] memory amounts); // onlyRole(MASTER)

    function getTotalLpBalance(uint32 poolId) external view returns (uint256 amount);

    function getPoolTokens(uint32 poolId) external view returns (address[] memory tokens);

    function lpTokensToPoolTokens(
        uint32 poolId,
        uint256 lpAmount
    ) external view returns (uint256[] memory amounts);

    function getAPY(uint32 poolId) external;
}
