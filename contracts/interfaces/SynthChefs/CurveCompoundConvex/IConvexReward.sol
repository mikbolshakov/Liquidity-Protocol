// SPDX-License-Identifier: BSL 1.1
pragma solidity ^0.8.15;

interface ConvexReward {
    function withdrawAndUnwrap(uint256 amount, bool claim) external returns (bool);

    function getReward() external returns (bool);

    function balanceOf(address account) external view returns (uint256);

    function rewardToken() external view returns (address);

    function rewards(address account) external view returns (uint256);
}
