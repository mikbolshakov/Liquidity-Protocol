// SPDX-License-Identifier: BSL 1.1
pragma solidity 0.8.15;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "./interfaces/IPausable.sol";

contract Pauser is AccessControl {
    IPausable[] public contracts;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    constructor(IPausable[] memory _contracts) {
        contracts = _contracts;
        _setRoleAdmin(PAUSER_ROLE, ADMIN_ROLE);
        _setupRole(ADMIN_ROLE, msg.sender);
    }

    function pause() external onlyRole(PAUSER_ROLE) {
        IPausable[] memory _contracts = contracts;
        for (uint256 i = 0; i < _contracts.length; i++) {
            _contracts[i].pause();
        }
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        IPausable[] memory _contracts = contracts;
        for (uint256 i = 0; i < _contracts.length; i++) {
            _contracts[i].unpause();
        }
    }
}
