// SPDX-License-Identifier: BSL 1.1
pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IMasterChef {
    struct UserInfo {
        uint256 amount; // How many LP tokens the user has provided.
        uint256 rewardDebt; // Reward debt. See explanation below.
    }

    function CAKE() external returns (IERC20);

    function lpToken(uint256 pid) external view returns (address);

    function userInfo(uint256 pid, address user) external view returns (IMasterChef.UserInfo memory);

    function deposit(uint256 _pid, uint256 _amount) external;

    function withdraw(uint256 pid, uint256 amount) external;

    function pendingCake(uint256 _pid, address _user) external view returns (uint256);
}
