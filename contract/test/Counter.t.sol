// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/Counter.sol";

contract CounterTest is Test {
    Counter public counter;

    function setUp() public {
        counter = new Counter();
    }

    function test_Inc() public {
        counter.inc();
        assertEq(counter.count(), 1);
    }

    function test_RevertWhenDecBelowZero() public {
        vm.expectRevert(stdError.arithmeticError);
        counter.dec();
    }

    function test_Dec() public {
        counter.inc();
        counter.inc();
        counter.dec();
        assertEq(counter.count(), 1);
    }
}