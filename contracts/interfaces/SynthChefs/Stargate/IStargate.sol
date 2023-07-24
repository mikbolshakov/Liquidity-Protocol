// SPDX-License-Identifier: BSL 1.1
pragma solidity 0.8.19;

import "./IStargateToken.sol";

interface IStargate {
    function deposit(uint256 _pid, uint256 _amount) external;

    function emergencyWithdraw(uint256 _pid) external;

    function withdraw(uint256 _pid, uint256 _amount) external;

    function userInfo(uint256 _pid, address _user) external view returns (UserInfo memory);

    function pendingStargate(uint256 _pid, address _user) external view returns (uint256);

    function stargate() external view returns (IStargateToken);

    struct UserInfo {
        uint256 amount;
        uint256 rewardDebt;
    }
}
