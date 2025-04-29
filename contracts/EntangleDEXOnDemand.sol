// SPDX-License-Identifier: BSL 1.1
pragma solidity 0.8.15;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./EntangleSynthFactory.sol";
import "./EntangleSynth.sol";
import "./SynthChefs/BaseSynthChef.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract EntangleDEXOnDemand is AccessControl {
    using SafeERC20 for IERC20Metadata;
    using SafeERC20 for IERC20;
    using SafeERC20 for EntangleSynth;

    EntangleSynthFactory public factory; //synth factory
    BaseSynthChef public chef; //chef

    bytes32 public constant OWNER_ROLE = keccak256("OWNER");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN");

    /**
     * @dev Sets the values for `synth`, `pid`,`factory`,`opToken`,`rate` and `chef`.
     */
    constructor(EntangleSynthFactory _factory, BaseSynthChef _chef) {
        factory = _factory;
        chef = _chef;

        _setRoleAdmin(ADMIN_ROLE, OWNER_ROLE);
        _setupRole(OWNER_ROLE, msg.sender);
    }

    /**
     * @notice Trade function to buy synth token.
     * @param _amount The amount of the source token being traded.
     */
    function buy(uint256 _pid, uint256 _amount) external {
        EntangleSynth synth = factory.deprecated_synths(block.chainid, address(chef), _pid);
        IERC20 opToken = IERC20(address(synth.opToken()));
        uint256 amountSynth = synth.convertOpAmountToSynthAmount(_amount);

        opToken.safeTransferFrom(msg.sender, address(this), _amount);
        if (opToken.allowance(address(this), address(chef)) < _amount) {
            opToken.safeIncreaseAllowance(address(chef), type(uint256).max);
        }
        chef.deposit(_pid, address(opToken), _amount, 0);
        factory.mint(block.chainid, address(chef), _pid, amountSynth, msg.sender, 0);
    }

    /**
     * @notice Trade function to sell synth token.
     * @param _amount The amount of the synth token being traded.
     */
    function sell(uint256 _pid, uint256 _amount) external {
        EntangleSynth synth = factory.deprecated_synths(block.chainid, address(chef), _pid);
        uint256 opAmount = synth.convertSynthAmountToOpAmount(_amount);
        factory.burn(block.chainid, address(chef), _pid, _amount, msg.sender, 0);
        chef.withdraw(_pid, address(synth.opToken()), opAmount, msg.sender, 0);
    }
}
