// SPDX-License-Identifier: BSL 1.1
pragma solidity 0.8.19;

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "../interfaces/SynthChefs/PancakeSwap/IMasterChef.sol";
import "../interfaces/SynthChefs/PancakeSwap/IPair.sol";
import "../interfaces/SynthChefs/PancakeSwap/IRouter.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract PancakeSwapSynthChef is Initializable, UUPSUpgradeable, AccessControlUpgradeable, OwnableUpgradeable {
    using SafeERC20Upgradeable for IERC20Upgradeable;

    /// @notice Interface of PancakeSwap MasterChef
    IMasterChef public chef;
    /// @notice Interface of PancakeSwap Router
    IRouter public router;

    bytes32 public constant ADMIN = keccak256("ADMIN");
    bytes32 public constant MASTER = keccak256("MASTER");

    /// @notice Mapping from entangle internal pool Id to Pancake pool Id
    mapping(uint32 poolId => uint256 protoPid) pools;

    function initialize(IMasterChef _chef, IRouter _router) public initializer {
        chef = _chef;
        router = _router;
        //!TODO Grant master and admin roles
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}

    /// @notice Add a new pool. Can only be called by the ADMIN.
    /// @param poolId Entangle internal poolId
    /// @param poolInfo Information required to communicate with Pancake.
    function addPool(uint32 poolId, bytes calldata poolInfo) external {
        uint256 protoPid = abi.decode(poolInfo, (uint256));
        pools[poolId] = protoPid;
    }

    /// @notice Provide liquidity to pool and stake LP tokens. Can only be called by the MASTER.
    /// @param poolId Entangle internal poolId
    /// @param amounts Amounts of each token in pair. amounts[0] for token0, amounts[1] for token1.
    function deposit(uint32 poolId, uint256[] memory amounts) external {
        uint256 pid = pools[poolId];
        address lpPair = chef.lpToken(pid);
        address token0 = IPair(lpPair).token0();
        address token1 = IPair(lpPair).token1();

        if (IERC20(token0).allowance(address(this), address(router)) == 0) {
            IERC20(token0).approve(address(router), type(uint256).max);
        }

        if (IERC20(token1).allowance(address(this), address(router)) == 0) {
            IERC20(token1).approve(address(router), type(uint256).max);
        }

        (, , uint256 amountLP) = router.addLiquidity(
            token0,
            token1,
            amounts[0],
            amounts[1],
            0,
            0,
            address(this),
            block.timestamp
        );

        if (IERC20(lpPair).allowance(address(this), address(chef)) < amountLP) {
            IERC20(lpPair).approve(address(chef), type(uint256).max);
        }
        chef.deposit(pid, amountLP);
    }

    /// @notice Withdraw LP tokens from farm and remove liquidity. Transfer all to entangle MasterChef. Can only be called by the MASTER.
    /// @param poolId Entangle internal poolId
    /// @param lpAmountToWithdraw Amount of LP tokens to witdraw
    function withdraw(uint32 poolId, uint256 lpAmountToWithdraw) external returns (uint256[] memory amounts) {
        uint256 pid = pools[poolId];
        address lpPair = chef.lpToken(pid);
        address token0 = IPair(lpPair).token0();
        address token1 = IPair(lpPair).token1();
        amounts = new uint256[](2);

        chef.withdraw(pid, lpAmountToWithdraw);

        if (IERC20(lpPair).allowance(address(this), address(router)) < lpAmountToWithdraw) {
            IERC20(lpPair).approve(address(router), type(uint256).max);
        }

        (amounts[0], amounts[1]) = router.removeLiquidity(
            token0,
            token1,
            lpAmountToWithdraw,
            1,
            1,
            address(this),
            block.timestamp
        );
        //!TODO Transfer to our MsterChef
    }

    /// @notice Deposit LP tokens to farm. Can only be called by the MASTER.
    /// @param poolId Entangle internal poolId
    /// @param lpAmount Amount of LP tokens to deposit
    function depositLP(uint32 poolId, uint256 lpAmount) external {
        uint256 pid = pools[poolId];
        address lpPair = chef.lpToken(pid);
        if (IERC20(lpPair).allowance(address(this), address(chef)) < lpAmount) {
            IERC20(lpPair).approve(address(chef), type(uint256).max);
        }
        chef.deposit(pid, lpAmount);
    }

    /// @notice Withdraw LP tokens from farm and transfer it to entangle MasterChef. Can only be called by the MASTER.
    /// @param poolId Entangle internal poolId
    /// @param lpAmount Amount of LP tokens to withdraw
    function withdrawLP(uint32 poolId, uint256 lpAmount) external {
        uint256 pid = pools[poolId];
        chef.withdraw(pid, lpAmount);
        //!TODO Transfer to our MsterChef
    }

    /// @notice Grab bounty from farm and transfer it to entangle MasterChef. Can only be called by the MASTER.
    /// @param poolId Entangle internal poolId
    function harvest(uint32 poolId) external returns (address[] memory rewardTokens, uint256[] memory amounts) {
        uint256 pid = pools[poolId];
        rewardTokens = new address[](1);
        amounts = new uint256[](1);

        rewardTokens[0] = address(chef.CAKE());
        amounts[0] = chef.userInfo(pid, address(this)).rewardDebt; //chef.pendingCake(pid, address(this));
        chef.deposit(pid, 0);
        //!TODO Transfer to our MsterChef
    }

    /// @notice View function to get balance of LP tokens.
    /// @param poolId Entangle internal poolId
    /// @return amount Balance of LP tokens of this contract
    function getTotalLpBalance(uint32 poolId) public view returns (uint256 amount) {
        uint256 pid = pools[poolId];
        amount = chef.userInfo(pid, address(this)).amount;
    }

    /// @notice View function to get pool tokens addresses.
    /// @param poolId Entangle internal poolId
    /// @return tokens array of pool token addresses.
    function getPoolTokens(uint32 poolId) external view returns (address[] memory tokens) {
        uint256 pid = pools[poolId];
        address lpPair = chef.lpToken(pid);
        tokens = new address[](2);
        tokens[0] = IPair(lpPair).token0();
        tokens[1] = IPair(lpPair).token1();
    }

    /// @notice View function to calculate amounts of pool tokens if we swap it.
    /// @param poolId Entangle internal poolId
    /// @param lpAmount amount of LP
    /// @return amounts array of pool tokens amounts.
    function lpTokensToPoolTokens(uint32 poolId, uint256 lpAmount) external view returns (uint256[] memory amounts) {
        uint256 pid = pools[poolId];
        address lpPair = chef.lpToken(pid);
        amounts = new uint256[](2);
        (uint256 reserve0, uint256 reserve1, ) = IPair(lpPair).getReserves();
        uint256 totalSupply = IPair(lpPair).totalSupply();
        amounts[0] = (lpAmount * reserve0) / totalSupply;
        amounts[1] = (lpAmount * reserve1) / totalSupply;
    }

    //!TODO APY implementation
    // function getAPY(uint32 poolId){}
}
