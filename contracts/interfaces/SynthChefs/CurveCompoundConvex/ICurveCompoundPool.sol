// SPDX-License-Identifier: BSL 1.1
pragma solidity ^0.8.15;

interface CurveCompoundPool {
    function add_liquidity(uint256[2] memory uamounts, uint256 min_mint_amount) external;

    function remove_liquidity(uint256 _amount, uint256[2] memory min_uamounts) external;

    function calc_withdraw_one_coin(uint256 _token_amount, int128 i) external view returns (uint256);

    function underlying_coins(int128 arg0) external view returns (address);
}
