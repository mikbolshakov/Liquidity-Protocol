//SPDX-License-Identifier: BSL 1.1

pragma solidity 0.8.15;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/ILender.sol";
import "./PausableAccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/IPausable.sol";

contract EntangleLending is PausableAccessControl {
    using SafeERC20 for IERC20;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN");
    bytes32 public constant BORROWER_ROLE = keccak256("BORROWER");

    constructor() {
        _setRoleAdmin(ADMIN_ROLE, ADMIN_ROLE);
        _setRoleAdmin(BORROWER_ROLE, ADMIN_ROLE);
        _setRoleAdmin(PAUSER_ROLE, ADMIN_ROLE);
        _setupRole(ADMIN_ROLE, msg.sender);
    }

    struct Loan {
        uint256 amount;
        IERC20 token;
        ILender lender;
    }

    mapping(address => bool) public lenders;
    mapping(uint256 => Loan) public loans;

    event GetLoan(uint256 loanId, uint256 opId);
    event RepayLoan(uint256 loanId, uint256 opId);

    uint256 private nextLoanId = 0; //?

    function getLoan(uint256 loanId) public view returns (Loan memory) {
        return loans[loanId];
    }

    function borrow(
        uint256 amount,
        IERC20 token,
        ILender lender,
        address receiver,
        uint256 opId
    ) external onlyRole(BORROWER_ROLE) whenNotPaused {
        require(lenders[address(lender)], "Lender is not authorized");
        loans[nextLoanId] = Loan({amount: amount, token: token, lender: lender});
        lender.borrow(token, amount, receiver);
        IPausable(address(lender)).pause();
        emit GetLoan(nextLoanId, opId);
        nextLoanId++;
    }

    function repay(uint256 loanId, uint256 opId) external onlyRole(BORROWER_ROLE) whenNotPaused {
        Loan storage loan = loans[loanId];
        loan.token.safeTransferFrom(msg.sender, address(loan.lender), loan.amount);
        IPausable(address(loan.lender)).unpause();
        emit RepayLoan(loanId, opId);
        delete loans[loanId];
    }

    function authorizeLender(address lender) external onlyRole(ADMIN_ROLE) whenNotPaused {
        require(lender != address(0), "Invalid lender");
        lenders[lender] = true;
    }

    function disableLender(address lender) external onlyRole(ADMIN_ROLE) whenNotPaused {
        require(lenders[lender], "Already disabled");
        lenders[lender] = false;
    }
}
