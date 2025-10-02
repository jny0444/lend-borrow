// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract ZKLend {
    IERC20 public immutable i_collateralToken;
    IERC20 public immutable i_lendToken;

    constructor(address collateralToken, address lendToken) {
        i_collateralToken = IERC20(collateralToken);
        i_lendToken = IERC20(lendToken);
    }
}
