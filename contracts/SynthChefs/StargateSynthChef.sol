// SPDX-License-Identifier: BSL 1.1
pragma solidity 0.8.19;

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "../interfaces/SynthChefs/Stargate/IPool.sol";
import "../interfaces/SynthChefs/Stargate/IStargate.sol";
import "../interfaces/SynthChefs/Stargate/IRouter.sol";
import "../interfaces/SynthChefs/Stargate/IFactory.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract StargateSynthChef is Initializable, UUPSUpgradeable, AccessControlUpgradeable, OwnableUpgradeable {
    using SafeERC20Upgradeable for IERC20Upgradeable;

    /// @notice Interface of TraderJoe Router
    IStargateRouter public stargateRouter;

    /// @notice Entangle MasterChef address
    address public masterChefEnt;

    bytes32 public constant ADMIN = keccak256("ADMIN");
    bytes32 public constant MASTER = keccak256("MASTER");

    /// @notice struct of StargatePool
    struct Pool {
        IERC20Upgradeable LPToken;
        IStargate stargate;
        IERC20Upgradeable token;
        uint256 stargateLPStakingPoolID;
        uint256 stargateRouterPoolID;
    }

    /// @notice Mapping from entangle internal pool Id to TraderJoe pool Id
    mapping(uint32 => Pool) public pools;

    /// @notice 0 - Stargate Router, 1 - EntMasterChef, 2 - ADMIN, 3 - MASTER.
    function initialize(address[4] calldata initAddr) public initializer {
        stargateRouter = IStargateRouter(initAddr[0]);
        masterChefEnt = initAddr[1];
        _grantRole(ADMIN, initAddr[2]);
        _grantRole(MASTER, initAddr[3]);
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}

    /// @notice Add a new pool. Can only be called by the ADMIN.
    /// @param poolId Entangle internal poolId
    /// @param poolInfo Information required to communicate with Stargate.
    function addPool(uint32 poolId, bytes calldata poolInfo) external onlyRole(ADMIN) {
        pools[poolId] = abi.decode(poolInfo, (Pool));
    }

    /// @notice Provide liquidity to pool and stake LP tokens. Can only be called by the MASTER.
    /// @param poolId Entangle internal poolId
    /// @param amounts Amounts of each token in pair. amounts[0] for token0, amounts[1] for token1.
    function deposit(uint32 poolId, uint256[] memory amounts) external onlyRole(MASTER) {
        Pool memory pool = pools[poolId];

        if (pool.token.allowance(address(this), address(stargateRouter)) < amounts[0]) {
            pool.token.safeIncreaseAllowance(address(stargateRouter), type(uint256).max);
        }
        uint256 liquidityAmount = pool.LPToken.balanceOf(address(this));
        stargateRouter.addLiquidity(pool.stargateRouterPoolID, amounts[0], address(this));
        uint256 amountLPs = pool.LPToken.balanceOf(address(this)) - liquidityAmount;
        if (pool.LPToken.allowance(address(this), address(pool.stargate)) < amountLPs) {
            pool.LPToken.safeIncreaseAllowance(address(pool.stargate), type(uint256).max);
        }
        pool.stargate.deposit(pool.stargateLPStakingPoolID, amountLPs);
    }

    /// @notice Withdraw LP tokens from farm and remove liquidity. Transfer all to entangle MasterChef. Can only be called by the MASTER.
    /// @param poolId Entangle internal poolId
    /// @param lpAmountToWithdraw Amount of LP tokens to witdraw
    function withdraw(
        uint32 poolId,
        uint256 lpAmountToWithdraw
    ) external onlyRole(MASTER) returns (uint256[] memory amounts) {
        amounts = new uint256[](1);
        Pool memory pool = pools[poolId];
        pool.stargate.withdraw(pool.stargateLPStakingPoolID, lpAmountToWithdraw);
        if (pool.LPToken.allowance(address(this), address(stargateRouter)) < lpAmountToWithdraw) {
            pool.LPToken.safeIncreaseAllowance(address(stargateRouter), type(uint256).max);
        }
        uint256 amount = stargateRouter.instantRedeemLocal(
            uint16(pool.stargateRouterPoolID),
            lpAmountToWithdraw,
            address(this)
        );
        amounts[0] = amount;

        pool.token.safeTransfer(masterChefEnt, amounts[0]);
    }

    /// @notice Deposit LP tokens to farm. Can only be called by the MASTER.
    /// @param poolId Entangle internal poolId
    /// @param lpAmount Amount of LP tokens to deposit
    function depositLP(uint32 poolId, uint256 lpAmount) external onlyRole(MASTER) {
        Pool memory pool = pools[poolId];
        if (pool.LPToken.allowance(address(this), address(pool.stargate)) < lpAmount) {
            pool.LPToken.safeIncreaseAllowance(address(pool.stargate), type(uint256).max);
        }
        pool.stargate.deposit(pool.stargateLPStakingPoolID, lpAmount);
    }

    /// @notice Withdraw LP tokens from farm and transfer it to entangle MasterChef. Can only be called by the MASTER.
    /// @param poolId Entangle internal poolId
    /// @param lpAmount Amount of LP tokens to withdraw
    function withdrawLP(uint32 poolId, uint256 lpAmount) external onlyRole(MASTER) {
        Pool memory pool = pools[poolId];
        pool.stargate.withdraw(pool.stargateLPStakingPoolID, lpAmount);
        pool.LPToken.safeTransfer(masterChefEnt, lpAmount);
    }

    /// @notice Grab bounty from farm and transfer it to entangle MasterChef. Can only be called by the MASTER.
    /// @param poolId Entangle internal poolId
    function harvest(
        uint32 poolId
    ) external onlyRole(MASTER) returns (address[] memory rewardTokens, uint256[] memory amounts) {
        rewardTokens = new address[](1);
        amounts = new uint256[](1);
        Pool memory pool = pools[poolId];
        if (pool.LPToken.allowance(address(this), address(pool.stargate)) < 0) {
            pool.LPToken.safeIncreaseAllowance(address(pool.stargate), type(uint256).max);
        }
        rewardTokens[0] = address(pool.stargate.stargate());
        amounts[0] = pool.stargate.pendingStargate(pool.stargateLPStakingPoolID, address(this));
        pool.stargate.deposit(pool.stargateLPStakingPoolID, 0);
        IERC20Upgradeable(rewardTokens[0]).safeTransfer(masterChefEnt, amounts[0]);
    }

    /// @notice View function to get balance of LP tokens.
    /// @param poolId Entangle internal poolId
    /// @return amount Balance of LP tokens of this contract
    function getTotalLpBalance(uint32 poolId) public view returns (uint256 amount) {
        Pool memory pool = pools[poolId];
        amount = pool.stargate.userInfo(pool.stargateLPStakingPoolID, address(this)).amount;
    }

    /// @notice View function to get pool tokens addresses.
    /// @param poolId Entangle internal poolId
    /// @return tokens array of pool token addresses.
    function getPoolTokens(uint32 poolId) external view returns (address[] memory tokens) {
        Pool memory pool = pools[poolId];
        tokens = new address[](1);
        tokens[0] = address(pool.token);
    }

    /// @notice View function to calculate amounts of pool tokens if we swap it.
    /// @param poolId Entangle internal poolId
    /// @param lpAmount amount of LP
    /// @return amounts array of pool tokens amounts
    function lpTokensToPoolTokens(uint32 poolId, uint256 lpAmount) external view returns (uint256[] memory amounts) {
        Pool memory pool = pools[poolId];
        amounts = new uint256[](1);
        IStargateFactory factory = stargateRouter.factory();
        IStargatePool stgPool = factory.getPool(pool.stargateRouterPoolID);
        amounts[0] = stgPool.amountLPtoLD(lpAmount);
    }

    /// @notice View function to get address of lp tokens of specific pool.
    /// @param poolId Entangle internal poolId
    function lpTokenAddress(uint32 poolId) external view returns (address lpToken) {
        Pool memory pool = pools[poolId];
        lpToken = address(pool.LPToken);
    }

    //!TODO Check
    function getAPY(uint32 poolId) external {}
}
