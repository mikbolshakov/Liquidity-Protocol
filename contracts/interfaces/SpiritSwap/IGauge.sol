// SPDX-License-Identifier: BSL 1.1
pragma solidity 0.8.15;

interface IGauge {
    function deposit(uint256 amount) external;

    function withdraw(uint256 amount) external;

    function getReward() external;

    function balanceOf(address account) external view returns (uint256);

    function SPIRIT() external view returns (address);

    function rewards(address account) external view returns (uint256);
}
