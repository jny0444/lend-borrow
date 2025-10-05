"use client";

import { useCallback } from "react";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import type { Address } from "viem";
import { abi as zklendAbi } from "@/abi/ZKLend.json";
import { abi as mockTokenAbi } from "@/abi/MockToken.json";
import { abi as lpTokenAbi } from "@/abi/LPToken.json";

const normalizeToBigInt = (value: bigint | number | string) => {
  if (typeof value === "bigint") {
    return value;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error("Amount must be a finite number.");
    }
    return BigInt(Math.trunc(value));
  }

  const trimmed = value.trim();
  if (trimmed === "") {
    throw new Error("Amount is required.");
  }

  return BigInt(trimmed);
};

const ZERO = BigInt(0);
const ensurePositiveAmount = (amount: bigint, label: string) => {
  if (amount <= ZERO) {
    throw new Error(`${label} must be greater than zero.`);
  }
  return amount;
};

const SECONDS_PER_DAY = BigInt(86_400);
const INTEREST_RATE_PERCENT = BigInt(5);
const ONE_HUNDRED = BigInt(100);

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

export function useApproveCollateral() {
  const {
    data: hash,
    error,
    isPending,
    writeContractAsync,
  } = useWriteContract();

  const approveCollateral = useCallback(
    async (value: bigint | number | string) => {
      const amount = ensurePositiveAmount(
        normalizeToBigInt(value),
        "Approval amount"
      );

      return await writeContractAsync({
        ...collateralConfig,
        functionName: "approve",
        args: [zklendConfig.address, amount] as const,
      });
    },
    [writeContractAsync]
  );

  return {
    approveCollateral,
    hash,
    error,
    isPending,
  } as const;
}

export function useMintCollateralToken() {
  const { address } = useAccount();
  const { approveCollateral } = useApproveCollateral();
  const {
    data: hash,
    error,
    isPending,
    writeContractAsync,
  } = useWriteContract();

  const mintCollateralToken = useCallback(
    async (value: bigint | number | string) => {
      const amount = ensurePositiveAmount(
        normalizeToBigInt(value),
        "Mint amount"
      );

      if (!address) {
        throw new Error("Connect your wallet before minting tokens.");
      }

      await approveCollateral(amount);

      return await writeContractAsync({
        ...collateralConfig,
        functionName: "mint",
        args: [address as Address, amount] as const,
      });
    },
    [address, approveCollateral, writeContractAsync]
  );

  return {
    mintCollateralToken,
    hash,
    error,
    isPending,
  } as const;
}

export function useApproveLend() {
  const {
    data: hash,
    error,
    isPending,
    writeContractAsync,
  } = useWriteContract();

  const approveLend = useCallback(
    async (value: bigint | number | string) => {
      const amount = ensurePositiveAmount(
        normalizeToBigInt(value),
        "Approval amount"
      );

      return await writeContractAsync({
        ...lendTokenConfig,
        functionName: "approve",
        args: [zklendConfig.address, amount] as const,
      });
    },
    [writeContractAsync]
  );

  return {
    approveLend,
    hash,
    error,
    isPending,
  } as const;
}

export function useMintLendToken() {
  const { address } = useAccount();
  const { approveLend } = useApproveLend();
  const {
    data: hash,
    error,
    isPending,
    writeContractAsync,
  } = useWriteContract();

  const mintLendToken = useCallback(
    async (value: bigint | number | string) => {
      const amount = ensurePositiveAmount(
        normalizeToBigInt(value),
        "Mint amount"
      );

      if (!address) {
        throw new Error("Connect your wallet before minting tokens.");
      }

      await approveLend(amount);

      return await writeContractAsync({
        ...lendTokenConfig,
        functionName: "mint",
        args: [address as Address, amount] as const,
      });
    },
    [address, approveLend, writeContractAsync]
  );

  return {
    mintLendToken,
    hash,
    error,
    isPending,
  } as const;
}

export function useAddCollateral() {
  const { approveCollateral } = useApproveCollateral();
  const {
    data: hash,
    error,
    isPending,
    writeContractAsync,
  } = useWriteContract();

  const depositCollateral = useCallback(
    async (value: bigint | number | string) => {
      const amount = ensurePositiveAmount(
        normalizeToBigInt(value),
        "Deposit amount"
      );

      await approveCollateral(amount);

      return await writeContractAsync({
        ...zklendConfig,
        functionName: "depositCollateral",
        args: [amount] as const,
      });
    },
    [approveCollateral, writeContractAsync]
  );

  return {
    depositCollateral,
    hash,
    error,
    isPending,
  } as const;
}

export function useWithdrawCollateral() {
  const {
    data: hash,
    error,
    isPending,
    writeContractAsync,
  } = useWriteContract();

  const withdrawCollateral = useCallback(
    async (value: bigint | number | string) => {
      const amount = ensurePositiveAmount(
        normalizeToBigInt(value),
        "Withdrawal amount"
      );

      return await writeContractAsync({
        ...zklendConfig,
        functionName: "withdrawCollateral",
        args: [amount] as const,
      });
    },
    [writeContractAsync]
  );

  return {
    withdrawCollateral,
    hash,
    error,
    isPending,
  } as const;
}

export function useProvideLiquidity() {
  const { approveLend } = useApproveLend();
  const {
    data: hash,
    error,
    isPending,
    writeContractAsync,
  } = useWriteContract();

  const provideLiquidity = useCallback(
    async (value: bigint | number | string) => {
      const amount = ensurePositiveAmount(
        normalizeToBigInt(value),
        "Liquidity amount"
      );

      await approveLend(amount);

      return await writeContractAsync({
        ...zklendConfig,
        functionName: "provideLiquidity",
        args: [amount] as const,
      });
    },
    [approveLend, writeContractAsync]
  );

  return {
    provideLiquidity,
    hash,
    error,
    isPending,
  } as const;
}

export function useWithdrawLiquidity() {
  const {
    data: hash,
    error,
    isPending,
    writeContractAsync,
  } = useWriteContract();

  const withdrawLiquidity = useCallback(
    async (value: bigint | number | string) => {
      const amount = ensurePositiveAmount(
        normalizeToBigInt(value),
        "Withdrawal amount"
      );

      return await writeContractAsync({
        ...zklendConfig,
        functionName: "withdrawLiquidity",
        args: [amount] as const,
      });
    },
    [writeContractAsync]
  );

  return {
    withdrawLiquidity,
    hash,
    error,
    isPending,
  } as const;
}

export function useTakeLoan() {
  const {
    data: hash,
    error,
    isPending,
    writeContractAsync,
  } = useWriteContract();

  const takeLoan = useCallback(
    async (value: bigint | number | string) => {
      const amount = ensurePositiveAmount(
        normalizeToBigInt(value),
        "Loan amount"
      );

      return await writeContractAsync({
        ...zklendConfig,
        functionName: "takeLoan",
        args: [amount] as const,
      });
    },
    [writeContractAsync]
  );

  return {
    takeLoan,
    hash,
    error,
    isPending,
  } as const;
}

export function useRepayLoan() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { approveLend } = useApproveLend();
  const {
    data: hash,
    error,
    isPending,
    writeContractAsync,
  } = useWriteContract();

  const repayLoan = useCallback(
    async (value: bigint | number | string) => {
      const loanId = normalizeToBigInt(value);
      if (loanId < ZERO) {
        throw new Error("Loan identifier cannot be negative.");
      }

      if (!address) {
        throw new Error("Connect your wallet before repaying a loan.");
      }

      if (!publicClient) {
        throw new Error("Unable to access public client for loan lookup.");
      }

      const loan = (await publicClient.readContract({
        address: zklendConfig.address,
        abi: zklendConfig.abi,
        functionName: "getUserLoan",
        args: [address as Address, loanId],
      })) as readonly [bigint, bigint, bigint, boolean];

      const [startTime, principal] = loan;
      if (principal <= ZERO) {
        throw new Error("Loan has no outstanding principal.");
      }

      const currentBlock = await publicClient.getBlock();
      const currentTimestamp = currentBlock.timestamp;
      const elapsedSeconds = currentTimestamp - startTime;
      const daysElapsed =
        elapsedSeconds > ZERO ? elapsedSeconds / SECONDS_PER_DAY : ZERO;
      const interest =
        (principal * INTEREST_RATE_PERCENT * daysElapsed) / ONE_HUNDRED;
      const repaymentAmount = principal + interest;

      await approveLend(repaymentAmount);

      return await writeContractAsync({
        ...zklendConfig,
        functionName: "repayLoan",
        args: [loanId] as const,
      });
    },
    [address, approveLend, publicClient, writeContractAsync]
  );

  return {
    repayLoan,
    hash,
    error,
    isPending,
  } as const;
}
