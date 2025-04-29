//SPDX-License-Identifier: BSL 1.1

pragma solidity ^0.8.15;

contract TestnetChecker {
    function check() public view returns (string memory) {
        return "This is Entangle testnet";
    }
}
