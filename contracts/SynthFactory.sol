// SPDX-License-Identifier: BSL 1.1
pragma solidity ^0.8.15;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "./EntangleSynth.sol";

contract SynthFactory is Initializable, AccessControlUpgradeable, UUPSUpgradeable, OwnableUpgradeable {
    function initialize() public initializer {
        __Ownable_init();
        __UUPSUpgradeable_init();

        _setRoleAdmin(MINTER, ADMIN);
        _setRoleAdmin(SPOTTER, ADMIN);
        _grantRole(ADMIN, msg.sender);
        _grantRole(MINTER, msg.sender);
        _grantRole(SPOTTER, msg.sender);
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function _authorizeUpgrade(address) internal override onlyOwner {}

    bytes32 public constant ADMIN = keccak256("ADMIN");
    bytes32 public constant MINTER = keccak256("MINTER");
    bytes32 public constant SPOTTER = keccak256("SPOTTER");

    struct SynthInfo {
        EntangleSynth synth;
        uint256 price;
        uint256 totalSupplyAllChains;
        bool isActive;
    }

    address public opToken;
    uint8 public opTokenDecimals; // Cache the opToken decimals to save gas

    mapping(uint128 => SynthInfo) public synths;

    uint8 public constant synthDecimals = 18;

    event Mint(uint128 sid, uint256 amount, address to, uint256 opId);
    event Burn(uint128 sid, uint256 amount, address from, uint256 opId);

    function setOpToken(address _opToken) public onlyRole(ADMIN) {
        opToken = _opToken;
        opTokenDecimals = ERC20(_opToken).decimals();
    }

    function deploySynth(uint128 sid, string calldata name) public onlyRole(ADMIN) returns (address) {
        require(!synths[sid].isActive, "Synth already delpoyed");

        EntangleSynth synth = new EntangleSynth(sid, name);
        synths[sid].isActive = true;
        synths[sid].synth = synth;

        return address(synth);
    }

    modifier validSynth(uint128 sid) {
        require(synths[sid].isActive, "SID is not active");
        _;
    }

    function setPrice(uint128 sid, uint256 price, uint256 totalSupply) public validSynth(sid) onlyRole(SPOTTER) {
        synths[sid].price = price;
        synths[sid].totalSupplyAllChains = totalSupply;
    }

    function mint(uint128 sid, uint256 amount, address to, uint256 opId) public validSynth(sid) onlyRole(MINTER) {
        synths[sid].synth.mint(to, amount);
        emit Mint(sid, amount, to, opId);
    }

    function burn(uint128 sid, uint256 amount, address to, uint256 opId) public validSynth(sid) onlyRole(MINTER) {
        synths[sid].synth.burn(to, amount);
        emit Burn(sid, amount, to, opId);
    }

    function convertOpToSynth(uint128 sid, uint256 opAmount) public view validSynth(sid) returns (uint256) {
        uint256 price = synths[sid].price;
        return ((opAmount * (10 ** synthDecimals)) / price) * (10 ** (synthDecimals - opTokenDecimals));
    }

    function convertSynthToOp(uint128 sid, uint256 synthAmount) public view validSynth(sid) returns (uint256) {
        uint256 price = synths[sid].price;
        return ((synthAmount * price) / (10 ** synthDecimals)) / (10 ** (synthDecimals - opTokenDecimals));
    }

    function getSynth(uint128 sid) public view validSynth(sid) returns (EntangleSynth) {
        return synths[sid].synth;
    }
}
