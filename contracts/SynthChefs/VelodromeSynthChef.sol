// SPDX-License-Identifier: BSL 1.1
pragma solidity ^0.8.15;

import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "../interfaces/SynthChefs/IProtocolSynthChef.sol";
import "../interfaces/SynthChefs/SpiritSwapVelodrome/IQuoteLiquiditySpiritVeloRouter.sol";
import "../interfaces/SynthChefs/SpiritSwapVelodrome/IGaugeVelodrome.sol";

contract VelodromeSynthChef is
    IProtocolSynthChef,
    Initializable,
    UUPSUpgradeable,
    AccessControlUpgradeable,
    OwnableUpgradeable
{
    using SafeERC20Upgradeable for IERC20Upgradeable;

    /// @notice Interface of Velodrome Router
    IQuoteLiquiditySpiritVeloRouter public router;

    /// @notice Entangle MasterChef address
    // MasterSynthChef public masterChef;

    bytes32 public constant ADMIN = keccak256("ADMIN");
    bytes32 public constant MASTER = keccak256("MASTER");

    /// @notice struct of Velodrome pool
    struct Pool {
        IERC20Upgradeable LPToken;
        IGauge gauge;
        IERC20Upgradeable[2] tokens;
        bool stable;
    }

    /// @notice Mapping from entangle internal pool Id to Velodrome pool
    mapping(uint32 => Pool) pools;

    function initialize(IQuoteLiquiditySpiritVeloRouter _router) public initializer {
        router = _router;
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    /// @notice Add a new pool. Can only be called by the ADMIN.
    /// @param poolId Entangle internal poolId.
    /// @param poolInfo Information required to communicate with Velodrome.
    function addPool(uint32 poolId, bytes calldata poolInfo) external onlyRole(ADMIN) {
        pools[poolId] = abi.decode(poolInfo, (Pool));
    }

    /// @notice Provide liquidity to pool and stake LP tokens. Can only be called by the MASTER.
    /// @param poolId Entangle internal poolId.
    /// @param amounts Amounts of each token in pair. amounts[0] for tokens[0], amounts[1] for tokens[1].
    function deposit(uint32 poolId, uint256[] memory amounts) external onlyRole(MASTER) {
        Pool memory pool = pools[poolId];

        if (
            IERC20Upgradeable(pool.tokens[0]).allowance(address(this), address(router)) < amounts[0]
        ) {
            IERC20Upgradeable(pool.tokens[0]).safeIncreaseAllowance(
                address(router),
                type(uint256).max
            );
        }

        if (
            IERC20Upgradeable(pool.tokens[1]).allowance(address(this), address(router)) < amounts[1]
        ) {
            IERC20Upgradeable(pool.tokens[1]).safeIncreaseAllowance(
                address(router),
                type(uint256).max
            );
        }

        (, , uint amountLPs) = router.addLiquidity(
            address(pool.tokens[0]),
            address(pool.tokens[1]),
            pool.stable,
            amounts[0],
            amounts[1],
            0,
            0,
            address(this),
            block.timestamp
        );

        if (pool.LPToken.allowance(address(this), address(pool.gauge)) < amountLPs) {
            pool.LPToken.safeIncreaseAllowance(address(pool.gauge), type(uint256).max);
        }
        pool.gauge.deposit(amountLPs, 0);
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

        pool.gauge.withdraw(lpAmountToWithdraw);

        if (pool.LPToken.allowance(address(this), address(router)) < lpAmountToWithdraw) {
            pool.LPToken.safeIncreaseAllowance(address(router), type(uint256).max);
        }

        (uint256 amount0, uint256 amount1) = router.removeLiquidity(
            address(pool.tokens[0]),
            address(pool.tokens[1]),
            pool.stable,
            lpAmountToWithdraw,
            0,
            0,
            address(this),
            block.timestamp
        );

        // IERC20Upgradeable(pool.tokens[0]).safeTransfer(masterChef, amount0);
        // IERC20Upgradeable(pool.tokens[1]).safeTransfer(masterChef, amount1);

        amounts[0] = amount0;
        amounts[1] = amount1;
    }

    /// @notice Deposit LP tokens to farm. Can only be called by the MASTER.
    /// @param poolId Entangle internal poolId.
    /// @param lpAmount Amount of LP tokens to deposit.
    function depositLP(uint32 poolId, uint256 lpAmount) external onlyRole(MASTER) {
        Pool memory pool = pools[poolId];
        if (
            IERC20Upgradeable(pool.LPToken).allowance(address(this), address(pool.gauge)) < lpAmount
        ) {
            IERC20Upgradeable(pool.LPToken).safeIncreaseAllowance(
                address(pool.gauge),
                type(uint256).max
            );
        }
        pool.gauge.deposit(lpAmount, 0);
    }

    /// @notice Withdraw LP tokens from farm and transfer it to entangle MasterChef. Can only be called by the MASTER.
    /// @param poolId Entangle internal poolId.
    /// @param lpAmount Amount of LP tokens to withdraw.
    function withdrawLP(uint32 poolId, uint256 lpAmount) external onlyRole(MASTER) {
        Pool memory pool = pools[poolId];

        pool.gauge.withdraw(lpAmount);

        // IERC20Upgradeable(pool.LPToken).safeTransfer(masterChef, lpAmount);
    }

    /// @notice Grab bounty from farm and transfer it to entangle MasterChef. Can only be called by the MASTER.
    /// @param poolId Entangle internal poolId.
    function harvest(
        uint32 poolId
    ) external onlyRole(MASTER) returns (address[] memory rewardTokens, uint256[] memory amounts) {
        Pool memory pool = pools[poolId];
        uint rewardTokensNumber = pool.gauge.rewardsListLength();
        amounts = new uint256[](rewardTokensNumber);
        rewardTokens = new address[](rewardTokensNumber);

        for (uint i = 0; i < rewardTokensNumber; i++) {
            rewardTokens[i] = pool.gauge.rewards(i);
            amounts[i] = pool.gauge.earned(rewardTokens[i], address(this));
        }

        pool.gauge.getReward(address(this), rewardTokens);

        // for(uint i = 0; i < rewardTokensNumber; i++) {
        //     if (amounts[i] > 0) {
        //         IERC20Upgradeable(rewardTokens[i]).safeTransfer(masterChef, amounts[i]);
        //     }
        // }
    }

    /// @notice View function to get balance of LP tokens on farm.
    /// @param poolId Entangle internal poolId.
    /// @return amount Balance of LP tokens of this contract.
    function getTotalLpBalance(uint32 poolId) public view returns (uint256 amount) {
        Pool memory pool = pools[poolId];
        amount = pool.gauge.balanceOf(address(this));
    }

    /// @notice View function to get pool tokens addresses.
    /// @param poolId Entangle internal poolId
    /// @return tokens Array of pool token addresses.
    function getPoolTokens(uint32 poolId) external view returns (address[] memory tokens) {
        Pool memory pool = pools[poolId];
        tokens = new address[](2);

        tokens[0] = address(pool.tokens[0]);
        tokens[1] = address(pool.tokens[1]);
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

        (uint256 amount0, uint256 amount1) = router.quoteRemoveLiquidity(
            address(pool.tokens[0]),
            address(pool.tokens[1]),
            pool.stable,
            lpAmount
        );

        amounts[0] = amount0;
        amounts[1] = amount1;
    }

    function getAPY(uint32 poolId) external view {}
}
