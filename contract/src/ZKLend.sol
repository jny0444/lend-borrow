// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {LPToken} from "./LPToken.sol";

contract ZKLend {
    IERC20 public immutable i_collateralToken;
    IERC20 public immutable i_lendToken;
    LPToken public immutable i_lpToken;

    uint256 public immutable i_collateralFactor = 90;
    uint256 public immutable i_interestRate = 5;

    uint256 public s_totalLiquidity;

    struct Loan {
        uint256 startTime;
        uint256 amount;
        uint256 collateral;
        bool isActive;
    }

    mapping(address => uint256) public userCollateral;
    mapping(address => mapping(uint256 => Loan)) public userLoans;
    mapping(address => uint256) public userLoanCount;
    mapping(address => uint256) public userLiquidity;

    event ZKLend__CollateralDeposited(address indexed user, uint256 amount);
    event ZKLend__CollateralWithdrawn(address indexed user, uint256 amount);
    event ZKLend__LiquidityProvided(address indexed user, uint256 amount);
    event ZKLend__LiquidityWithdrawn(address indexed user, uint256 amount);
    event ZKLend__LoanTaken(address indexed user, uint256 amount, uint256 collateral);
    event ZKLend__LoanRepaid(address indexed user, uint256 amount);
    event ZKLend__ExceedCollateralFactor(address indexed user, uint256 requested, uint256 maxAllowed);

    constructor(address collateralToken, address lendToken, address lpToken) {
        i_collateralToken = IERC20(collateralToken);
        i_lendToken = IERC20(lendToken);
        i_lpToken = LPToken(lpToken);
    }

    function depositCollateral(uint256 amount) external {
        require(amount > 0, "Amount must be greater than 0");
        bool success = i_collateralToken.transferFrom(msg.sender, address(this), amount);
        require(success, "Transfer failed");
        userCollateral[msg.sender] += amount;

        emit ZKLend__CollateralDeposited(msg.sender, amount);
    }

    function withdrawCollateral(uint256 amount) external {
        require(amount > 0, "Amount must be greater than 0");
        require(userCollateral[msg.sender] >= amount, "Insufficient collateral");

        uint256 activeLoans = 0;
        for (uint256 i = 0; i < userLoanCount[msg.sender]; i++) {
            if (userLoans[msg.sender][i].isActive) {
                activeLoans += 1;
            }
        }
        require(activeLoans == 0, "Cannot withdraw with active loans");

        bool success = i_collateralToken.transfer(msg.sender, amount);
        require(success, "Transfer failed");
        userCollateral[msg.sender] -= amount;

        emit ZKLend__CollateralWithdrawn(msg.sender, amount);
    }

    function provideLiquidity(uint256 amount) external {
        require(amount > 0, "Amount must be greater than 0");

        bool success = i_lendToken.transferFrom(msg.sender, address(this), amount);
        require(success, "Transfer failed");

        uint256 totalSupply = i_lpToken.totalSupply();

        uint256 lpToMint;
        if (totalSupply == 0 || s_totalLiquidity == 0) {
            lpToMint = amount;
        } else {
            lpToMint = (amount * totalSupply) / s_totalLiquidity;
        }

        i_lpToken.mint(msg.sender, lpToMint);
        userLiquidity[msg.sender] += lpToMint;

        s_totalLiquidity += amount;

        emit ZKLend__LiquidityProvided(msg.sender, amount);
    }

    function withdrawLiquidity(uint256 lpAmount) external {
        require(lpAmount > 0, "Amount must be greater than 0");
        require(userLiquidity[msg.sender] >= lpAmount, "Insufficient liquidity");

        uint256 totalSupply = i_lpToken.totalSupply();
        require(totalSupply > 0, "No liquidity in pool");

        uint256 amountToReturn = (lpAmount * s_totalLiquidity) / totalSupply;

        i_lpToken.burn(msg.sender, lpAmount);

        bool success = i_lendToken.transfer(msg.sender, amountToReturn);
        require(success, "Transfer failed");

        userLiquidity[msg.sender] -= lpAmount;
        s_totalLiquidity -= amountToReturn;

        emit ZKLend__LiquidityWithdrawn(msg.sender, amountToReturn);
    }

    function takeLoan(uint256 amount) external {
        require(amount > 0, "Amount must be greater than 0");

        uint256 maxLoan = (userCollateral[msg.sender] * i_collateralFactor) / 100;
        require(amount <= maxLoan, "Exceeds maximum loan amount based on collateral");

        require(amount <= s_totalLiquidity, "Not enough liquidity in pool");

        bool success = i_lendToken.transfer(msg.sender, amount);
        require(success, "Transfer failed");

        userLoans[msg.sender][userLoanCount[msg.sender]] =
            Loan({startTime: block.timestamp, amount: amount, collateral: userCollateral[msg.sender], isActive: true});
        userLoanCount[msg.sender] += 1;

        s_totalLiquidity -= amount;

        emit ZKLend__LoanTaken(msg.sender, amount, userCollateral[msg.sender]);
    }

    function repayLoan(uint256 loanId) external {
        require(loanId < userLoanCount[msg.sender], "Invalid loan ID");

        Loan storage loan = userLoans[msg.sender][loanId];
        require(loan.isActive, "Loan already repaid");

        uint256 daysElapsed = (block.timestamp - loan.startTime) / 1 days;

        uint256 interest = (loan.amount * i_interestRate * daysElapsed) / 100;
        uint256 totalRepayment = loan.amount + interest;

        bool success = i_lendToken.transferFrom(msg.sender, address(this), totalRepayment);
        require(success, "Transfer failed");

        loan.isActive = false;

        s_totalLiquidity += totalRepayment;

        emit ZKLend__LoanRepaid(msg.sender, totalRepayment);
    }

    function getUserCollateral(address user) external view returns (uint256) {
        return userCollateral[user];
    }

    function getUserLiquidity(address user) external view returns (uint256) {
        return userLiquidity[user];
    }

    function getUserLoanCount(address user) external view returns (uint256) {
        return userLoanCount[user];
    }

    function getUserLoan(address user, uint256 loanId)
        external
        view
        returns (uint256 startTime, uint256 amount, uint256 collateral, bool isActive)
    {
        Loan storage loan = userLoans[user][loanId];
        return (loan.startTime, loan.amount, loan.collateral, loan.isActive);
    }

    function getTotalLiquidity() external view returns (uint256) {
        return s_totalLiquidity;
    }

    function getCollateralFactor() external pure returns (uint256) {
        return i_collateralFactor;
    }

    function getInterestRate() external pure returns (uint256) {
        return i_interestRate;
    }
}
