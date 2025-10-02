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

    function test_InitialBalance() public {
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
        // vm.startPrank(user1);
        // collateralToken.approve(address(zkLend), 100 ether);
        // zkLend.depositCollateral(100 ether);

        // vm.stopPrank();
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
}
