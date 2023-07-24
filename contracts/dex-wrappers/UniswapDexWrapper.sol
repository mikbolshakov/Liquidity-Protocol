// SPDX-License-Identifier: BSL 1.1
pragma solidity ^0.8.15;

import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IWETH.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "./interfaces/IEntangleProtocolDEXWrapper.sol";

contract UniswapDexWrapper is
    IEntangleDEXWrapper,
    Initializable,
    UUPSUpgradeable,
    AccessControlUpgradeable,
    OwnableUpgradeable
{
    using SafeERC20Upgradeable for IERC20Upgradeable;

    /// @notice Interface of UniswapV2 Router02
    IUniswapV2Router02 public router;
    /// @notice Interface of UniswapV2 Factory
    IUniswapV2Factory public factory;
    /// @notice Interface of Wrapped ETH
    IWETH public wNative;

    bytes32 public constant MASTER_WRAPPER = keccak256("MASTER_WRAPPER");

    function initialize(address _router, IWETH _wNative) public initializer {
        router = IUniswapV2Router02(_router);
        factory = IUniswapV2Factory(router.factory());
        wNative = _wNative;
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
        address[] memory routes = _getSwapRoutes(path[0], path[1]);

        if (IERC20Upgradeable(path[0]).allowance(address(this), address(router)) < amount) {
            IERC20Upgradeable(path[0]).safeIncreaseAllowance(address(router), type(uint256).max);
        }

        uint256[] memory amounts = router.swapExactTokensForTokens(amount, 0, routes, _msgSender(), block.timestamp);
        receivedAmount = amounts[amounts.length - 1];
        lastTokenReceived = routes[routes.length - 1];
    }

    /// @notice View function to get amount of received tokens if make a swap.
    /// @param swapPath Path to swap tokens.
    /// @param amount Amount of tokens to be swapped.
    /// @return amountToReceive Amount of received tokens if make a swap.
    function previewSwap(bytes calldata swapPath, uint256 amount) external view returns (uint256 amountToReceive) {
        address[] memory path = abi.decode(swapPath, (address[]));
        address[] memory routes = _getSwapRoutes(path[0], path[1]);

        uint256[] memory amounts = router.getAmountsOut(amount, routes);
        amountToReceive = amounts[amounts.length - 1];
    }

    /// @notice View function to get path to swap tokens.
    /// @param _tokenFrom Address of token from which will be swap.
    /// @param _tokenTo Address of token to which will be swap.
    /// @return routes Array of addresses of tokens through which will be swap.
    function _getSwapRoutes(address _tokenFrom, address _tokenTo) internal view returns (address[] memory routes) {
        if (factory.getPair(_tokenFrom, _tokenTo) != address(0)) {
            routes = new address[](2);
            routes[0] = _tokenFrom;
            routes[1] = _tokenTo;
        } else {
            routes = new address[](3);
            routes[0] = _tokenFrom;
            routes[1] = address(wNative);
            routes[2] = _tokenTo;
        }
    }
}
