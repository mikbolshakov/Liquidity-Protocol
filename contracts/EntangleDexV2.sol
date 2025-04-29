//SPDX-License-Identifier: BSL 1.1
pragma solidity ^0.8.15;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "./libraries/SidLibrary.sol";
import "./EntangleSynth.sol";
import "./SynthFactory.sol";

contract EntangleDexV2 is Initializable, AccessControlUpgradeable {
    using SafeERC20 for IERC20;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    mapping(address => bool) allowedTokens;
    IERC20 opToken;

    address masterSynthChef;
    SynthFactory synthFactory;
    address dexWrapper;
    address balanceManager;

    address feeCollector;
    uint256 feeRate = 10; // around 0.1%
    uint256 feeRateDecimals = 10 ** 4; // 10000
    uint256[50] __gap;

    enum EventType {
        Buy,
        Sell
    }

    event EventC(EventType e, uint128 sid, uint256 opAmount, address);
    event BuySell(EventType e, uint128 sid, uint256 opAmount, uint256 synthAmount, address);

    function setAllowedToken(address token, bool enabled) public onlyRole(ADMIN_ROLE) {
        allowedTokens[token] = enabled;
    }

    function setBalanceManager(address _balanceManager) public onlyRole(ADMIN_ROLE) {
        balanceManager = _balanceManager;
    }

    function setFeeCollector(address _feeCollector) public onlyRole(ADMIN_ROLE) {
        feeCollector = _feeCollector;
    }

    function setFeeRate(uint256 _feeRate) public onlyRole(ADMIN_ROLE) {
        feeRate = _feeRate;
    }

    function setOpToken(address token) public onlyRole(ADMIN_ROLE) {
        opToken = IERC20(token);
    }

    function setAllowance(address token) public view {
        require(msg.sender == balanceManager, "Only balanceManager");
    }

    modifier isAllowedToken(address _token) {
        require(allowedTokens[_token], "Token not allowed");
        _;
    }

    function initialize() public initializer {}

    function buy(uint128 sid, address token, uint256 amount) public isAllowedToken(token) {
        IERC20 _token = IERC20(token);
        _token.safeTransferFrom(msg.sender, address(this), amount);

        uint256 opAmount = amount;
        uint256 fee = (opAmount * feeRate) / feeRateDecimals;
        opAmount = opAmount - fee;
        opToken.safeTransfer(feeCollector, fee);

        EntangleSynth synth = synthFactory.getSynth(sid);
        uint256 synthAmount = synthFactory.convertOpToSynth(sid, opAmount);

        if (__chainId() == SidLibrary.chainId(sid)) {
            synthFactory.mint(sid, synthAmount, msg.sender, 0);

            uint256 newPrice = 0;
            synthFactory.setPrice(sid, newPrice, synth.totalSupply());
        } else {
            if (synth.balanceOf(address(this)) < synthAmount) {
                emit EventC(EventType.Buy, sid, opAmount, msg.sender);
                return;
            }
            IERC20(synth).transfer(msg.sender, synthAmount);
        }

        emit BuySell(EventType.Buy, sid, opAmount, synthAmount, msg.sender);
    }

    function previewBuy(
        uint128 sid,
        address token,
        uint256 amount
    ) public view isAllowedToken(token) returns (uint256) {
        uint256 opAmount = amount;
        uint256 fee = (opAmount * feeRate) / feeRateDecimals;
        opAmount = amount - fee;

        uint256 synthAmount = synthFactory.convertOpToSynth(sid, opAmount);

        return synthAmount;
    }

    function sell(uint128 sid, uint256 synthAmount) public {
        EntangleSynth synth = synthFactory.getSynth(sid);
        uint256 opAmount = synthFactory.convertSynthToOp(sid, synthAmount);

        uint256 fee = (opAmount * feeRate) / feeRateDecimals;
        opAmount = opAmount - fee;

        if (__chainId() == SidLibrary.chainId(sid)) {
            synth.burn(msg.sender, synthAmount);

            //TODO: Withdraw master synth chef

            opToken.safeTransfer(msg.sender, opAmount);

            uint256 newPrice = 0; //FIXME:
            synthFactory.setPrice(sid, newPrice, synth.totalSupply());
        } else {
            IERC20(synth).safeTransferFrom(msg.sender, address(this), synthAmount);

            if (opToken.balanceOf(address(this)) < opAmount) {
                emit EventC(EventType.Sell, sid, synthAmount, msg.sender);
                return;
            }

            opToken.safeTransfer(msg.sender, synthAmount);
        }

        emit BuySell(EventType.Sell, sid, opAmount, synthAmount, msg.sender);
    }

    function previewSell(uint128 sid, uint256 synthAmount) public view returns (uint256) {
        uint256 opAmount = synthFactory.convertSynthToOp(sid, synthAmount);

        uint256 fee = (opAmount * feeRate) / feeRateDecimals;
        opAmount = opAmount - fee;

        return opAmount;
    }

    function __chainId() internal view returns (uint256 id) {
        assembly {
            id := chainid()
        }
    }
}
