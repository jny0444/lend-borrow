"use client";

import { useCallback } from "react";
import { useAccount, useWriteContract } from "wagmi";
import { abi as zklendAbi } from "@/abi/ZKLend.json";
import { abi as mockTokenAbi } from "@/abi/MockToken.json";
import { abi as lpTokenAbi } from "@/abi/LPToken.json";
import { Address } from "viem";

export const zklendConfig = {
  address: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as Address,
  abi: zklendAbi,
};

export const collateralConfig = {
  address: process.env.NEXT_PUBLIC_COLLATERAL_TOKEN_ADDRESS as Address,
  abi: mockTokenAbi,
};

export const lendTokenConfig = {
  address: process.env.NEXT_PUBLIC_LEND_TOKEN_ADDRESS as Address,
  abi: mockTokenAbi,
};

export const lpTokenConfig = {
  address: process.env.NEXT_PUBLIC_LP_TOKEN_ADDRESS as Address,
  abi: lpTokenAbi,
};

export function mintCollateralToken() {
  const {
    data: hash,
    error,
    isPending,
    writeContractAsync,
  } = useWriteContract();

  const { address } = useAccount();

  const mintCollateralToken = useCallback(
    async (amount: bigint | number | string) => {
      const normalizedAmount =
        typeof amount === "bigint" ? amount : BigInt(amount);

      if (!address) {
        throw new Error("Connect your wallet before minting tokens.");
      }

      return writeContractAsync({
        ...collateralConfig,
        functionName: "mint",
        args: [address as Address, normalizedAmount] as const,
      });
    },
    [address, writeContractAsync]
  );

  return {
    mintCollateralToken,
    hash,
    error,
    isPending,
  };
}

export function approveCollateral() {
  const {
    data: hash,
    error,
    isPending,
    writeContractAsync,
  } = useWriteContract();

  const approveCollateral = useCallback(
    async (amount: bigint | number | string) => {
      const normalizedAmount =
        typeof amount === "bigint" ? amount : BigInt(amount);

      return writeContractAsync({
        ...collateralConfig,
        functionName: "approve",
        args: [zklendConfig.address, normalizedAmount] as const,
      });
    },
    [writeContractAsync]
  );

  return {
    approveCollateral,
    hash,
    error,
    isPending,
  };
}

export function addCollateral() {
  const {
    data: hash,
    error,
    isPending,
    writeContractAsync,
  } = useWriteContract();

  const depositCollateral = useCallback(
    async (amount: bigint | number | string) => {
      const normalizedAmount =
        typeof amount === "bigint" ? amount : BigInt(amount);

      return writeContractAsync({
        ...zklendConfig,
        functionName: "depositCollateral",
        args: [normalizedAmount] as const,
      });
    },
    [writeContractAsync]
  );

  return {
    depositCollateral,
    hash,
    error,
    isPending,
  };
}
