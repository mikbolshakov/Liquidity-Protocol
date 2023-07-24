// SPDX-License-Identifier: BSL 1.1
pragma solidity ^0.8.15;

interface IGauge {
    function deposit(uint amount, uint tokenId) external;

    function getReward(address account, address[] memory tokens) external;

    function withdraw(uint amount) external;

    function balanceOf(address user) external view returns (uint);

    function rewards(uint index) external view returns (address);

    function rewardsListLength() external view returns (uint);

    function earned(address token, address user) external view returns (uint);
}
