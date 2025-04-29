// SPDX-License-Identifier: BSL 1.1
pragma solidity 0.8.15;

import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

interface IETHDEXV1 {
    function buy(uint8 _pid, uint256 _amount) external returns (uint256 synthAmount);

    function sell(uint8 _pid, uint256 _amount) external returns (uint256 opTokenAmount);

    function synths(uint8) external view returns (Synth memory);
}

struct Synth {
    IERC20Metadata synth;
    uint8 synthDecimals;
    uint256 rate;
    uint8 rateDecimals;
    uint8 pid;
    bool isActive;
    bool crosschain;
}
