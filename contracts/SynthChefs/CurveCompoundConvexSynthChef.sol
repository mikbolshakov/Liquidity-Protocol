// SPDX-License-Identifier: BSL 1.1
pragma solidity ^0.8.15;

import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "../interfaces/SynthChefs/CurveCompoundConvex/ICurveCompoundPool.sol";
import "../interfaces/SynthChefs/CurveCompoundConvex/IConvex.sol";
import "../interfaces/SynthChefs/CurveCompoundConvex/IConvexReward.sol";
import "../interfaces/SynthChefs/IProtocolSynthChef.sol";

contract CurveCompoundConvexSynthChef is
    IProtocolSynthChef,
    Initializable,
    UUPSUpgradeable,
    AccessControlUpgradeable,
    OwnableUpgradeable
{
    using SafeERC20Upgradeable for IERC20Upgradeable;

    /// @notice Interface of Convex Farm
    Convex public convex;

    /// @notice Entangle MasterChef address
    // MasterSynthChef public masterChef

    bytes32 public constant ADMIN = keccak256("ADMIN");
    bytes32 public constant MASTER = keccak256("MASTER");

    /// @notice struct of Curve pool
    struct Pool {
        address lp;
        uint256 convexID;
        address[2] uTokens;
        CurveCompoundPool curvePool;
        ConvexReward convexreward;
    }

    /// @notice Mapping from entangle internal pool Id to Curve pool
    mapping(uint32 => Pool) pools;

    function initialize(Convex _convex) public initializer {
        convex = _convex;
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    /// @notice Add a new pool. Can only be called by the ADMIN.
    /// @param poolId Entangle internal poolId.
    /// @param poolInfo Information required to communicate with Curve.
    function addPool(uint32 poolId, bytes calldata poolInfo) external onlyRole(ADMIN) {
        pools[poolId] = abi.decode(poolInfo, (Pool));
    }

    /// @notice Provide liquidity to pool and stake LP tokens. Can only be called by the MASTER.
    /// @param poolId Entangle internal poolId.
    /// @param amounts Amounts of each token in pair. amounts[0] for uTokens[0], amounts[1] for uTokens[1].
    function deposit(uint32 poolId, uint256[] memory amounts) external onlyRole(MASTER) {
        Pool memory pool = pools[poolId];
        if (
            IERC20Upgradeable(pool.uTokens[0]).allowance(address(this), address(pool.curvePool)) <
            amounts[0]
        ) {
            IERC20Upgradeable(pool.uTokens[0]).safeIncreaseAllowance(
                address(pool.curvePool),
                type(uint256).max
            );
        }

        if (
            IERC20Upgradeable(pool.uTokens[1]).allowance(address(this), address(pool.curvePool)) <
            amounts[1]
        ) {
            IERC20Upgradeable(pool.uTokens[1]).safeIncreaseAllowance(
                address(pool.curvePool),
                type(uint256).max
            );
        }

        uint256 balanceBefore = IERC20Upgradeable(pool.lp).balanceOf(address(this));

        pool.curvePool.add_liquidity([amounts[0], amounts[1]], 0);

        uint256 amountLPs = IERC20Upgradeable(pool.lp).balanceOf(address(this)) - balanceBefore;
        if (IERC20Upgradeable(pool.lp).allowance(address(this), address(convex)) < amountLPs) {
            IERC20Upgradeable(pool.lp).safeIncreaseAllowance(address(convex), type(uint256).max);
        }
        convex.deposit(pool.convexID, amountLPs, true);
    }

    /// @notice Withdraw LP tokens from farm and remove liquidity. Transfer all to entangle MasterChef. Can only be called by the MASTER.
    /// @param poolId Entangle internal poolId.
    /// @param lpAmountToWithdraw Amount of LP tokens to witdraw.
    function withdraw(
        uint32 poolId,
        uint256 lpAmountToWithdraw
    ) external onlyRole(MASTER) returns (uint256[] memory amounts) {
        Pool memory pool = pools[poolId];
        amounts = new uint256[](2);

        pool.convexreward.withdrawAndUnwrap(lpAmountToWithdraw, false);

        if (
            IERC20Upgradeable(pool.lp).allowance(address(this), address(pool.curvePool)) <
            lpAmountToWithdraw
        ) {
            IERC20Upgradeable(pool.lp).safeIncreaseAllowance(
                address(pool.curvePool),
                type(uint256).max
            );
        }

        uint256 uToken0AmountBefore = IERC20Upgradeable(pool.uTokens[0]).balanceOf(address(this));
        uint256 uToken1AmountBefore = IERC20Upgradeable(pool.uTokens[1]).balanceOf(address(this));

        pool.curvePool.remove_liquidity(lpAmountToWithdraw, [uint256(0), uint256(0)]);

        uint256 uToken0Amount = IERC20Upgradeable(pool.uTokens[0]).balanceOf(address(this)) -
            uToken0AmountBefore;
        uint256 uToken1Amount = IERC20Upgradeable(pool.uTokens[1]).balanceOf(address(this)) -
            uToken1AmountBefore;

        // IERC20Upgradeable(pool.uTokens[0]).safeTransfer(masterChef, uToken0Amount);
        // IERC20Upgradeable(pool.uTokens[1]).safeTransfer(masterChef, uToken1Amount);

        amounts[0] = uToken0Amount;
        amounts[1] = uToken1Amount;
    }

    /// @notice Deposit LP tokens to farm. Can only be called by the MASTER.
    /// @param poolId Entangle internal poolId.
    /// @param lpAmount Amount of LP tokens to deposit.
    function depositLP(uint32 poolId, uint256 lpAmount) external onlyRole(MASTER) {
        Pool memory pool = pools[poolId];
        if (IERC20Upgradeable(pool.lp).allowance(address(this), address(convex)) < lpAmount) {
            IERC20Upgradeable(pool.lp).safeIncreaseAllowance(address(convex), type(uint256).max);
        }
        convex.deposit(pool.convexID, lpAmount, true);
    }

    /// @notice Withdraw LP tokens from farm and transfer it to entangle MasterChef. Can only be called by the MASTER.
    /// @param poolId Entangle internal poolId.
    /// @param lpAmount Amount of LP tokens to withdraw.
    function withdrawLP(uint32 poolId, uint256 lpAmount) external onlyRole(MASTER) {
        Pool memory pool = pools[poolId];

        pool.convexreward.withdrawAndUnwrap(lpAmount, false);

        // IERC20Upgradeable(pool.lp).safeTransfer(masterChef, lpAmount);
    }

    /// @notice Grab bounty from farm and transfer it to entangle MasterChef. Can only be called by the MASTER.
    /// @param poolId Entangle internal poolId.
    function harvest(
        uint32 poolId
    ) external onlyRole(MASTER) returns (address[] memory rewardTokens, uint256[] memory amounts) {
        Pool memory pool = pools[poolId];
        amounts = new uint256[](1);
        rewardTokens = new address[](1);

        rewardTokens[0] = pool.convexreward.rewardToken();
        amounts[0] = pool.convexreward.rewards(address(this));

        pool.convexreward.getReward();

        // IERC20Upgradeable(rewardTokens[0]).safeTransfer(masterChef, amounts[0]);
    }

    /// @notice View function to get balance of LP tokens on farm.
    /// @param poolId Entangle internal poolId.
    /// @return amount Balance of LP tokens of this contract.
    function getTotalLpBalance(uint32 poolId) external view returns (uint256 amount) {
        Pool memory pool = pools[poolId];
        amount = pool.convexreward.balanceOf(address(this));
    }

    /// @notice View function to get pool tokens addresses.
    /// @param poolId Entangle internal poolId
    /// @return tokens Array of pool token addresses.
    function getPoolTokens(uint32 poolId) external view returns (address[] memory tokens) {
        Pool memory pool = pools[poolId];
        tokens = new address[](2);

        tokens[0] = pool.curvePool.underlying_coins(0);
        tokens[1] = pool.curvePool.underlying_coins(1);
    }

    /// @notice View function to calculate amounts of pool tokens if we swap it.
    /// @param poolId Entangle internal poolId.
    /// @param lpAmount Amount of LP.
    /// @return amounts Array of pool tokens amounts.
    function lpTokensToPoolTokens(
        uint32 poolId,
        uint256 lpAmount
    ) external view returns (uint256[] memory amounts) {
        Pool memory pool = pools[poolId];
        amounts = new uint256[](2);

        amounts[0] = pool.curvePool.calc_withdraw_one_coin(lpAmount / 2, 0);
        amounts[1] = pool.curvePool.calc_withdraw_one_coin(lpAmount / 2, 1);
    }

    function getAPY(uint32 poolId) external view {}
}
