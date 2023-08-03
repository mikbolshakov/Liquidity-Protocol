// SPDX-License-Identifier: BSL 1.1
pragma solidity ^0.8.15;

import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router01.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "./interfaces/IProtocolDEXWrapper.sol";

contract DexWrapper is Initializable, UUPSUpgradeable, AccessControlUpgradeable, OwnableUpgradeable {
    using SafeERC20Upgradeable for IERC20Upgradeable;

    bytes32 public constant ADMIN = keccak256("ADMIN");
    bytes32 public constant SWAPPER = keccak256("SWAPPER");

    /// @notice struct of specific path
    struct SpecifiedSwapPath {
        bytes tokensPath;
        uint256 protoDexId;
    }

    /// @notice Mapping from encoded bytes of sequence of tokens to specific path
    mapping(bytes32 => SpecifiedSwapPath[]) public specifiedPoolSwapPath;
    /// @notice Mapping from internal id of protocol to address of protoDexWrapper
    mapping(uint256 => address) protoDexWrappers;
    /// @notice default ProtoDexId
    uint256 defaultProtoDexId;

    function initialize() public initializer {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    /// @notice Add ProtoDexWrapper to mapping. Can only be called by the ADMIN.
    /// @param protoDexId Internal id of protocol.
    /// @param protoDexWrapper Address of protoDexWrapper.
    function addProtoDexWrapper(uint256 protoDexId, address protoDexWrapper) external onlyRole(ADMIN) {
        protoDexWrappers[protoDexId] = protoDexWrapper;
    }

    /// @notice Get swap pool key and add specific swap path. Can only be called by the ADMIN.
    /// @param token1 Address of first token to get swap pool key.
    /// @param token2 Address of second token to get swap pool key.
    /// @param swapPath Specific path to swap tokens.
    function addSpecifiedSwapPath(
        address token1,
        address token2,
        SpecifiedSwapPath[] memory swapPath
    ) external onlyRole(ADMIN) {
        bytes32 swapPoolKey = getSwapPoolKey(token1, token2);
        specifiedPoolSwapPath[swapPoolKey] = swapPath;
    }

    /// @notice Set default ProtocolDexId. Can only be called by the ADMIN.
    /// @param id Id which will set by default.
    function setDefaultProtoDexId(uint256 id) external onlyRole(ADMIN) {
        defaultProtoDexId = id;
    }

    /// @notice Swap tokens by path in given amount through a definite protocol. Can only be called by the SWAPPER.
    /// @param tokenFrom Address of token from which will be swap.
    /// @param tokenTo Address of token to which will be swap.
    /// @param amount Amount of tokens to be swapped.
    /// @return receivedAmount Amount of tokens received after swap.
    function swapTokens(
        address tokenFrom,
        address tokenTo,
        uint256 amount
    ) external onlyRole(SWAPPER) returns (uint256 receivedAmount) {
        if (tokenFrom == tokenTo) {
            return amount;
        }

        uint256 tokenToBalanceBeforeSwap = IERC20Upgradeable(tokenTo).balanceOf(address(this));
        IERC20Upgradeable(tokenFrom).safeTransferFrom(_msgSender(), address(this), amount);

        bytes32 swapPoolKey = getSwapPoolKey(tokenFrom, tokenTo);
        SpecifiedSwapPath[] memory specifiedPaths = specifiedPoolSwapPath[swapPoolKey];
        if (specifiedPaths.length > 0) {
            uint256 lastReceivedAmount = amount;
            address lastTokenReceived = tokenFrom;
            for (uint256 i = 0; i < specifiedPaths.length; i++) {
                bytes memory path = specifiedPaths[i].tokensPath;
                uint256 dexId = specifiedPaths[i].protoDexId;
                address protoDexWrapper = protoDexWrappers[dexId];

                if (IERC20Upgradeable(lastTokenReceived).allowance(address(this), address(protoDexWrapper)) < amount) {
                    IERC20Upgradeable(lastTokenReceived).safeIncreaseAllowance(
                        address(protoDexWrapper),
                        type(uint256).max
                    );
                }

                IERC20Upgradeable(lastTokenReceived).safeTransfer(protoDexWrapper, lastReceivedAmount);
                (lastReceivedAmount, lastTokenReceived) = IDEXWrapper(protoDexWrapper).swap(
                    path,
                    lastReceivedAmount
                );
            }

            IERC20Upgradeable(tokenTo).safeTransfer(_msgSender(), lastReceivedAmount);
            return receivedAmount = lastReceivedAmount;
        } else {
            address protoDexWrapper = protoDexWrappers[defaultProtoDexId];

            address[] memory tokens = new address[](2);
            tokens[0] = tokenFrom;
            tokens[1] = tokenTo;

            bytes memory swapTokensPath = abi.encode(tokens);

            if (IERC20Upgradeable(tokens[0]).allowance(address(this), address(protoDexWrapper)) < amount) {
                IERC20Upgradeable(tokens[0]).safeIncreaseAllowance(address(protoDexWrapper), type(uint256).max);
            }

            IERC20Upgradeable(tokenFrom).safeTransfer(protoDexWrapper, amount);

            (receivedAmount, ) = IDEXWrapper(protoDexWrapper).swap(swapTokensPath, amount);
            uint256 tokenToAmountAfterSwap = IERC20Upgradeable(tokenTo).balanceOf(address(this)) -
                tokenToBalanceBeforeSwap;
            IERC20Upgradeable(tokenTo).safeTransfer(_msgSender(), tokenToAmountAfterSwap);
            return receivedAmount = tokenToAmountAfterSwap;
        }
    }

    /// @notice View function to get amount of received tokens if make a swap through a definite protocol.
    /// @param tokenFrom Address of token from which will be swap.
    /// @param tokenTo Address of token to which will be swap.
    /// @param amount Amount of tokens to be swapped.
    /// @return amountToReceive Amount of tokens received if make a swap.
    function previewSwap(
        address tokenFrom,
        address tokenTo,
        uint256 amount
    ) external view returns (uint256 amountToReceive) {
        if (tokenFrom == tokenTo) {
            return amount;
        }

        bytes32 swapPoolKey = getSwapPoolKey(tokenFrom, tokenTo);
        SpecifiedSwapPath[] memory specifiedPaths = specifiedPoolSwapPath[swapPoolKey];

        if (specifiedPaths.length > 0) {
            uint256 lastAmountToReceive = amount;

            for (uint256 i = 0; i < specifiedPaths.length; i++) {
                bytes memory path = specifiedPaths[i].tokensPath;
                uint256 dexId = specifiedPaths[i].protoDexId;
                address protoDexWrapper = protoDexWrappers[dexId];

                lastAmountToReceive = IDEXWrapper(protoDexWrapper).previewSwap(path, lastAmountToReceive);
            }
            return amountToReceive = lastAmountToReceive;
        } else {
            address protoDexWrapper = protoDexWrappers[defaultProtoDexId];
            address[] memory tokens = new address[](2);
            tokens[0] = tokenFrom;
            tokens[1] = tokenTo;

            bytes memory swapTokensPath = abi.encode(tokens);
            amountToReceive = IDEXWrapper(protoDexWrapper).previewSwap(swapTokensPath, amount);
        }
    }

    /// @notice Pure function to get encoded bytes of sequence of tokens.
    /// @param tokenA Address of first token to encode.
    /// @param tokenB Address of second token to encode.
    /// @return swapPoolKey Encoded bytes of sequence of tokens.
    function getSwapPoolKey(address tokenA, address tokenB) public pure returns (bytes32 swapPoolKey) {
        if (tokenA > tokenB) (tokenA, tokenB) = (tokenB, tokenA);
        swapPoolKey = keccak256(abi.encode(tokenA, tokenB));
    }
}
