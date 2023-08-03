// SPDX-License-Identifier: BSL 1.1
pragma solidity ^0.8.15;

interface IDEXWrapper {
    function swap(bytes calldata swapPath, uint256 amount) external returns (uint256, address);

    function previewSwap(bytes calldata swapPath, uint256 amount) external view returns (uint256);
}
