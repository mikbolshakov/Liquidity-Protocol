// SPDX-License-Identifier: BSL 1.1
pragma solidity ^0.8.15;

import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "./interfaces/IEntangleProtocolDEXWrapper.sol";
import "./interfaces/ISwapVelodromeRouter.sol";

contract VelodromeDexWapper is
    IEntangleDEXWrapper,
    Initializable,
    UUPSUpgradeable,
    AccessControlUpgradeable,
    OwnableUpgradeable
{
    using SafeERC20Upgradeable for IERC20Upgradeable;

    /// @notice Interface of Velodrome Router
    ISwapVelodromeRouter public router;
    /// @notice Interface of Velodrome Factory
    IVelodromeFactory public factory;
    /// @notice address of Wrapped ETH
    address public wNative;

    bytes32 public constant MASTER_WRAPPER = keccak256("MASTER_WRAPPER");

    function initialize(ISwapVelodromeRouter _router) public initializer {
        router = _router;
        factory = IVelodromeFactory(router.factory());
        wNative = router.weth();
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    /// @notice Swap tokens by path in given amount through a protocol. Can only be called by the MASTER_WRAPPER.
    /// @param swapPath Path to swap tokens.
    /// @param amount Amount of tokens to be swapped.
    /// @return receivedAmount Amount of tokens received after swap.
    /// @return lastTokenReceived Address of token received after swap.
    function swap(
        bytes calldata swapPath,
        uint256 amount
    ) external onlyRole(MASTER_WRAPPER) returns (uint256 receivedAmount, address lastTokenReceived) {
        address[] memory path = abi.decode(swapPath, (address[]));
        ISwapVelodromeRouter.route[] memory routes = _getSwapRoutes(path[0], path[1]);

        if (IERC20Upgradeable(path[0]).allowance(address(this), address(router)) < amount) {
            IERC20Upgradeable(path[0]).safeIncreaseAllowance(address(router), type(uint256).max);
        }

        uint256[] memory amounts = router.swapExactTokensForTokens(amount, 0, routes, _msgSender(), block.timestamp);
        receivedAmount = amounts[amounts.length - 1];
        lastTokenReceived = routes[routes.length - 1].to;
    }

    /// @notice View function to get amount of received tokens if make a swap.
    /// @param swapPath Path to swap tokens.
    /// @param amount Amount of tokens to be swapped.
    /// @return amountToReceive Amount of received tokens if make a swap.
    function previewSwap(bytes calldata swapPath, uint256 amount) external view returns (uint256 amountToReceive) {
        address[] memory path = abi.decode(swapPath, (address[]));
        ISwapVelodromeRouter.route[] memory routes = _getSwapRoutes(path[0], path[1]);

        uint256[] memory amounts = router.getAmountsOut(amount, routes);
        amountToReceive = amounts[amounts.length - 1];
    }

    /// @notice View function to get path to swap tokens.
    /// @param _tokenFrom Address of token from which will be swap.
    /// @param _tokenTo Address of token to which will be swap.
    /// @return routes Array of struts of tokens through which will be swap.
    function _getSwapRoutes(
        address _tokenFrom,
        address _tokenTo
    ) internal view returns (ISwapVelodromeRouter.route[] memory routes) {
        (address pair, bool stable) = _getBetterPair(_tokenFrom, _tokenTo);
        if (pair != address(0)) {
            routes = new ISwapVelodromeRouter.route[](1);
            routes[0] = ISwapVelodromeRouter.route({from: _tokenFrom, to: _tokenTo, stable: stable});
        } else {
            routes = new ISwapVelodromeRouter.route[](2);
            routes[0] = ISwapVelodromeRouter.route({from: _tokenFrom, to: wNative, stable: false});
            routes[1] = ISwapVelodromeRouter.route({from: wNative, to: _tokenTo, stable: false});
        }
    }

    /// @notice View function to get better pair to swap tokens.
    /// @param _tokenFrom Address of token from which will be swap.
    /// @param _tokenTo Address of token to which will be swap.
    /// @return pair Address of pair of tokens through which will be swap.
    /// @return stable Bool can be token transferred to the smart contract that manages the token.
    function _getBetterPair(address _tokenFrom, address _tokenTo) internal view returns (address pair, bool stable) {
        address stableLpPair = factory.getPair(_tokenFrom, _tokenTo, true);
        address notStableLpPair = factory.getPair(_tokenFrom, _tokenTo, false);
        if (stableLpPair == address(0)) return (notStableLpPair, false);
        if (notStableLpPair == address(0)) return (stableLpPair, true);
        (uint256 amount0Stable, , ) = IVelodromePair(stableLpPair).getReserves();
        (uint256 amount0NotStable, , ) = IVelodromePair(notStableLpPair).getReserves();
        if (amount0Stable > amount0NotStable) return (stableLpPair, true);
        else return (notStableLpPair, false);
    }
}
