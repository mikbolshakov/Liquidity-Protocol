// SPDX-License-Identifier: BSL 1.1
pragma solidity 0.8.19;

interface IStargatePool {
    function balanceOf(address _user) external view returns (uint256);

    function amountLPtoLD(uint256 _amountLP) external view returns (uint256);
}
