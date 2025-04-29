// SPDX-License-Identifier: SEE LICENSE IN LICENSE
// This file is needed to generate real binding to WETH contract
pragma solidity >=0.8.15;

import "@uniswap/v2-periphery/contracts/interfaces/IWETH.sol";
import "@openzeppelin/contracts/interfaces/IERC20.sol";

interface WETH is IERC20, IWETH {
    // Resolve the conflict between IWETH and IERC20 defenitions
    function transfer(address to, uint256 amount) external override(IERC20, IWETH) returns (bool);
}
