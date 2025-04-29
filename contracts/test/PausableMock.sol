// SPDX-License-Identifier: BSL 1.1
pragma solidity 0.8.15;

import "../PausableAccessControl.sol";

contract PausableMock is PausableAccessControl {
    function addPauser(address _account) external {
        _grantRole(PAUSER_ROLE, _account);
    }
}
