// SPDX-License-Identifier: BSL 1.1
pragma solidity 0.8.15;

interface Convex {
    function deposit(uint256 _pid, uint256 _amount, bool _stake) external returns (bool);
}
