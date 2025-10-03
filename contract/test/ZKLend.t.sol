// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/ZKLend.sol";
import "../src/LPToken.sol";
import "../src/MockToken.sol";

contract ZKLendTest is Test {
    ZKLend public zkLend;
    LPToken public lpToken;
    MockToken public collateralToken;
    MockToken public lendToken;

    address public user1;
    address public user2;
    address public user3;

    function setUp() public {
        collateralToken = new MockToken("Mock Token 1", "MTK1");
        lendToken = new MockToken("Mock Token 2", "MTK2");
        lpToken = new LPToken();

        zkLend = new ZKLend(address(collateralToken), address(lendToken), address(lpToken));

        user1 = makeAddr("user1");
        user2 = makeAddr("user2");
        user3 = makeAddr("user3");

        collateralToken.mint(user1, 1000 ether);
        collateralToken.mint(user2, 1000 ether);
        collateralToken.mint(user3, 1000 ether);

        lendToken.mint(user1, 1000 ether);
        lendToken.mint(user2, 1000 ether);
        lendToken.mint(user3, 1000 ether);
    }

    function test_InitialBalance() public view {
        assertEq(collateralToken.balanceOf(user1), 1000 ether);
        assertEq(collateralToken.balanceOf(user2), 1000 ether);
        assertEq(collateralToken.balanceOf(user3), 1000 ether);

        assertEq(lendToken.balanceOf(user1), 1000 ether);
        assertEq(lendToken.balanceOf(user2), 1000 ether);
        assertEq(lendToken.balanceOf(user3), 1000 ether);
    }

    function depositCollateral() public {
        vm.startPrank(user1);
        collateralToken.approve(address(zkLend), 100 ether);
        zkLend.depositCollateral(100 ether);
        vm.stopPrank();
    }

    function withdrawCollateral() public {
        depositCollateral();

        vm.startPrank(user1);
        zkLend.withdrawCollateral(50 ether);
        vm.stopPrank();
    }

    function test_DepositCollateral() public {
        depositCollateral();

        assertEq(zkLend.getUserCollateral(user1), 100 ether);
        assertEq(collateralToken.balanceOf(user1), 900 ether);
        assertEq(collateralToken.balanceOf(address(zkLend)), 100 ether);
    }

    function test_WithdrawCollateral() public {
        withdrawCollateral();

        assertEq(zkLend.getUserCollateral(user1), 50 ether);
        assertEq(collateralToken.balanceOf(user1), 950 ether);
        assertEq(collateralToken.balanceOf(address(zkLend)), 50 ether);
    }

    function provideLiquidity() public {
        vm.startPrank(user2);
        lendToken.approve(address(zkLend), 200 ether);
        zkLend.provideLiquidity(200 ether);
        vm.stopPrank();
    }

    function withdrawLiquidity() public {
        provideLiquidity();

        vm.startPrank(user2);
        uint256 lpBalance = lpToken.balanceOf(user2);
        zkLend.withdrawLiquidity(lpBalance / 2);
        vm.stopPrank();
    }

    function test_ProvideLiquidity() public {
        provideLiquidity();

        assertEq(zkLend.getUserLiquidity(user2), 200 ether);
        assertEq(lendToken.balanceOf(user2), 800 ether);
        assertEq(lendToken.balanceOf(address(zkLend)), 200 ether);
    }

    function test_WithdrawLiquidity() public {
        withdrawLiquidity();

        assertEq(zkLend.getUserLiquidity(user2), 100 ether);
        assertEq(lendToken.balanceOf(user2), 900 ether);
        assertEq(lendToken.balanceOf(address(zkLend)), 100 ether);
    }

    function test_TakeLoan() public {
        depositCollateral();
        provideLiquidity();

        vm.startPrank(user1);
        zkLend.takeLoan(50 ether);
        vm.stopPrank();
    }

    function test_RepayLoan() public {
        depositCollateral();
        provideLiquidity();

        vm.startPrank(user1);
        zkLend.takeLoan(50 ether);

        uint256 futureTime = block.timestamp + 1 days;
        vm.warp(futureTime);

        uint256 loanId = zkLend.getUserLoanCount(user1);
        for (uint256 i = 0; i < loanId; i++) {
            (uint256 startTime, uint256 amount,,) = zkLend.getUserLoan(user1, i);
            uint256 toBePaid = amount + ((amount * zkLend.i_interestRate() * (block.timestamp - startTime)) / 100);
            lendToken.approve(address(zkLend), toBePaid);
            zkLend.repayLoan(i);
        }

        (,,, bool finalActive) = zkLend.getUserLoan(user1, 0);
        assertFalse(finalActive);
        assertEq(zkLend.getUserLoanCount(user1), 1);
        assertEq(zkLend.getTotalLiquidity(), 200 ether - 50 ether + 52.5 ether);
    }

    function test_RevertWhenTakeLoanExceedCollateralFactor() public {
        depositCollateral();
        provideLiquidity();

        vm.startPrank(user1);
        vm.expectRevert("Exceeds maximum loan amount based on collateral");
        zkLend.takeLoan(95 ether);
        vm.stopPrank();
    }

    function test_TakeMultipleLoans() public {
        depositCollateral();
        provideLiquidity();

        vm.startPrank(user1);
        zkLend.takeLoan(50 ether);
        zkLend.takeLoan(20 ether);
        vm.stopPrank();

        uint256 loanCount = zkLend.getUserLoanCount(user1);
        uint256 totalLoanAmount = 0;
        for (uint256 i = 0; i < loanCount; i++) {
            (, uint256 amount,, bool isActive) = zkLend.getUserLoan(user1, i);
            if (isActive == true) {
                totalLoanAmount += amount;
            }
        }

        assertEq(totalLoanAmount, 70 ether);
    }

    function test_RepayMultipleLoans() public {
        depositCollateral();
        provideLiquidity();

        vm.startPrank(user1);
        zkLend.takeLoan(50 ether);
        zkLend.takeLoan(20 ether);

        uint256 futureTime = block.timestamp + 1 days;
        vm.warp(futureTime);

        uint256 loanCount = zkLend.getUserLoanCount(user1);
        for (uint256 i = 0; i < loanCount; i++) {
            (uint256 startTime, uint256 amount,,) = zkLend.getUserLoan(user1, i);
            uint256 toBePaid =
                amount + ((amount * zkLend.getInterestRate() * (block.timestamp - startTime)) / (1 days * 100));
            lendToken.approve(address(zkLend), toBePaid);
            zkLend.repayLoan(i);
            (,,, bool finalActive) = zkLend.getUserLoan(user1, i);
            assertFalse(finalActive);
        }
        vm.stopPrank();

        assertEq(zkLend.getUserLoanCount(user1), 2); 
        assertEq(zkLend.getTotalLiquidity(), 200 ether - 70 ether + 73.5 ether); 
    }
}
