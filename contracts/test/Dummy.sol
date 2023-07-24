// SPDX-License-Identifier: BSL 1.1
pragma solidity ^0.8.15;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract Dummy is ERC20 {
    uint8 __decimals;

    constructor(uint8 _decimals) ERC20("Dummy", "DMM") {
        __decimals = _decimals;
    }

    function decimals() public view override returns (uint8) {
        return __decimals;
    }
}
