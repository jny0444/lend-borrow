// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {MockToken} from "../src/MockToken.sol";
import {LPToken} from "../src/LPToken.sol";
import {ZKLend} from "../src/ZKLend.sol";

contract ZKLendScript is Script {
    function run() external {
        vm.startBroadcast();

        MockToken collateralToken = new MockToken("Collateral Token", "COL");
        MockToken lendToken = new MockToken("Lend Token", "LEND");
        LPToken lpToken = new LPToken();

        ZKLend zkLend = new ZKLend(address(collateralToken), address(lendToken), address(lpToken));

        vm.stopBroadcast();

        console.log("CollateralToken deployed at:", address(collateralToken));
        console.log("LendToken deployed at:", address(lendToken));
        console.log("LPToken deployed at:", address(lpToken));
        console.log("ZKLend deployed at:", address(zkLend));
    }
}
