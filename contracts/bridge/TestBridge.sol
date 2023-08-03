// SPDX-License-Identifier: BSL 1.1
pragma solidity ^0.8.15;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract TestBridge is AccessControl {
    using SafeERC20 for IERC20;

    mapping(address => uint256) public tokenStorage;
    mapping(uint => address) public idsToToken;
    uint256 kappa;
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN");
    bytes32 public constant OWNER_ROLE = keccak256("OWNER");

    event Deposit(address token, uint256 amount);
    event Withdraw(address token, uint256 amount);

    // synapse bridge events
    event TokenRedeemAndSwap(
        address indexed to,
        uint256 chainId,
        IERC20 token,
        uint256 amount,
        uint8 tokenIndexFrom,
        uint8 tokenIndexTo,
        uint256 minDy,
        uint256 deadline
    );
    event TokenMintAndSwap(
        address indexed to,
        IERC20 token,
        uint256 amount,
        uint256 fee,
        uint8 tokenIndexFrom,
        uint8 tokenIndexTo,
        uint256 minDy,
        uint256 deadline,
        bool swapSuccess,
        bytes32 indexed kappa
    );

    constructor() public {
        _setRoleAdmin(ADMIN_ROLE, OWNER_ROLE);
        _grantRole(OWNER_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }

    function addTokenId(uint id, address token) external onlyRole(ADMIN_ROLE) {
        idsToToken[id] = address(token);
    }

    function deposit(IERC20 token, uint256 amount) external onlyRole(ADMIN_ROLE) {
        token.safeTransferFrom(msg.sender, address(this), amount);
        tokenStorage[address(token)] += amount;
        emit Deposit(address(token), amount);
    }

    function withdraw(IERC20 token, uint256 amount) external onlyRole(ADMIN_ROLE) {
        require(tokenStorage[address(token)] >= amount, "Not enought liquidity");
        token.safeTransferFrom(address(this), msg.sender, amount);
        tokenStorage[address(token)] -= amount;
        emit Withdraw(address(token), amount);
    }

    // synapse bridge function emu
    function swapAndRedeemAndSwap(
        address to,
        uint256 chainId,
        IERC20 token,
        uint8 tokenIndexFrom,
        uint8 tokenIndexTo,
        uint256 dx,
        uint256 minDy,
        uint256 deadline,
        uint8 swapTokenIndexFrom,
        uint8 swapTokenIndexTo,
        uint256 swapMinDy,
        uint256 swapDeadline
    ) external onlyRole(ADMIN_ROLE) {
        IERC20 opToken = IERC20(idsToToken[tokenIndexFrom]);
        opToken.safeTransferFrom(msg.sender, address(this), dx);
        tokenStorage[address(opToken)] += dx;

        emit TokenRedeemAndSwap(to, chainId, token, dx, tokenIndexFrom, swapTokenIndexTo, minDy, deadline);
    }

    function SwapTo(
        address payable to,
        IERC20 token,
        uint256 amount,
        uint256 fee,
        uint8 tokenIndexFrom,
        uint8 tokenIndexTo,
        uint256 minDy,
        uint256 deadline
    ) external onlyRole(ADMIN_ROLE) {
        require(idsToToken[tokenIndexTo] != address(0), "tokenIndexTo wasn't found");
        IERC20 tokenTo = IERC20(idsToToken[tokenIndexTo]);
        require(tokenStorage[address(tokenTo)] >= amount, "Not enought liquidity");
        tokenTo.safeTransfer(to, amount);
        tokenStorage[address(tokenTo)] -= amount;
        kappa += 1;

        emit TokenMintAndSwap(
            to,
            token,
            amount,
            fee,
            tokenIndexFrom,
            tokenIndexTo,
            minDy,
            deadline,
            true,
            bytes32(kappa)
        );
    }
}
