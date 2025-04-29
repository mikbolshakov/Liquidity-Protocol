// SPDX-License-Identifier: BSL 1.1
pragma solidity 0.8.19;

import "./IFactory.sol";

interface IStargateRouter {
    function addLiquidity(uint _pid, uint256 _amountLD, address _to) external;

    function instantRedeemLocal(
        uint16 _srcPoolId,
        uint256 _amountLP,
        address _to
    ) external returns (uint256 amountSD);

    function factory() external view returns (IStargateFactory);
}
