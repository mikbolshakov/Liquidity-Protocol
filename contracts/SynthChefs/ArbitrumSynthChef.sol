// SPDX-License-Identifier: BSL 1.1
pragma solidity 0.8.15;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./BaseSynthChef.sol";

interface IStargate {
    function deposit(uint256 _pid, uint256 _amount) external;

    function emergencyWithdraw(uint256 _pid) external;

    function withdraw(uint256 _pid, uint256 _amount) external;

    function userInfo(uint256 _pid, address _user) external view returns (UserInfo memory);

    struct UserInfo {
        uint256 amount;
        uint256 rewardDebt;
    }
}

interface IStargateRouter {
    function addLiquidity(uint _pid, uint256 _amountLD, address _to) external;

    function instantRedeemLocal(
        uint16 _srcPoolId,
        uint256 _amountLP,
        address _to
    ) external returns (uint256 amountSD);
}

interface IStargatePool {
    function balanceOf(address _user) external view returns (uint256);
}

contract ArbitrumSynthChef is BaseSynthChef {
    using SafeERC20 for IERC20;

    IStargateRouter public stargateRouter;

    Pool[] public poolsArray;

    struct Pool {
        IERC20 LPToken;
        IStargate stargate;
        IERC20 token;
        uint256 stargateLPStakingPoolID;
        uint256 stargateRouterPoolID;
    }

    constructor(
        IStargateRouter _stargateRouter,
        address _DEXWrapper,
        address _stablecoin,
        address[] memory _rewardTokens,
        uint256 _fee,
        address _feeCollector
    ) BaseSynthChef(_DEXWrapper, _stablecoin, _rewardTokens, _fee, _feeCollector) {
        stargateRouter = _stargateRouter;
    }

    receive() external payable {}

    function _depositToFarm(uint256 _pid, uint256 _amount) internal override {
        Pool memory pool = poolsArray[_pid];
        if (pool.LPToken.allowance(address(this), address(pool.stargate)) < _amount) {
            pool.LPToken.safeIncreaseAllowance(address(pool.stargate), type(uint256).max);
        }
        pool.stargate.deposit(pool.stargateLPStakingPoolID, _amount);
    }

    function _withdrawFromFarm(uint256 _pid, uint256 _amount) internal override {
        Pool memory pool = poolsArray[_pid];
        pool.stargate.withdraw(pool.stargateLPStakingPoolID, _amount);
    }

    function _convertTokensToProvideLiquidity(
        uint256 _amount,
        address _tokenFrom,
        uint256 _pid
    ) internal returns (address token, uint256 amount) {
        Pool memory pool = poolsArray[_pid];
        token = address(pool.token);
        amount = _convertTokens(_tokenFrom, token, _amount);
    }

    function _addLiquidity(
        uint256 _pid,
        address _tokenFrom,
        uint256 _amount
    ) internal override returns (uint256 amountLPs) {
        (address token, uint256 amount) = _convertTokensToProvideLiquidity(
            _amount,
            _tokenFrom,
            _pid
        );
        Pool memory pool = poolsArray[_pid];

        if (IERC20(token).allowance(address(this), address(stargateRouter)) < amount) {
            IERC20(token).safeIncreaseAllowance(address(stargateRouter), type(uint256).max);
        }
        uint256 liquidityAmount = pool.LPToken.balanceOf(address(this));
        stargateRouter.addLiquidity(pool.stargateRouterPoolID, amount, address(this));
        amountLPs = pool.LPToken.balanceOf(address(this)) - liquidityAmount;
        return amountLPs;
    }

    function _harvest(uint256 _pid) internal override {
        _depositToFarm(_pid, 0);
    }

    function _removeLiquidity(
        uint256 _pid,
        uint256 _amount
    ) internal override returns (TokenAmount[] memory tokenAmounts) {
        tokenAmounts = new TokenAmount[](1);
        Pool memory pool = poolsArray[_pid];
        address token = address(pool.token);

        if (pool.LPToken.allowance(address(this), address(stargateRouter)) < _amount) {
            pool.LPToken.safeIncreaseAllowance(address(stargateRouter), type(uint256).max);
        }
        uint256 amount = stargateRouter.instantRedeemLocal(
            uint16(pool.stargateRouterPoolID),
            _amount,
            address(this)
        );
        tokenAmounts[0] = TokenAmount({amount: amount, token: token});
    }

    function _getTokensInLP(
        uint256 _pid
    ) internal view override returns (TokenAmount[] memory tokenAmounts) {
        tokenAmounts = new TokenAmount[](1);
        Pool memory pool = poolsArray[_pid];
        address token = address(pool.token);
        uint256 amount = pool.stargate.userInfo(pool.stargateLPStakingPoolID, address(this)).amount;
        tokenAmounts[0] = TokenAmount({amount: amount, token: token});
    }

    function getLPAmountOnFarm(uint256 _pid) public view override returns (uint256 amount) {
        Pool memory pool = poolsArray[_pid];
        amount = pool.stargate.userInfo(pool.stargateLPStakingPoolID, address(this)).amount;
    }

    function addPool(
        IERC20 LPToken,
        IStargate stargate,
        IERC20 token,
        uint256 stargateLPStakingPoolID,
        uint256 stargateRouterPoolID
    ) external onlyRole(ADMIN_ROLE) whenNotPaused {
        poolsArray.push(
            Pool(LPToken, stargate, token, stargateLPStakingPoolID, stargateRouterPoolID)
        );
    }
}
