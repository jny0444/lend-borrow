import { Address } from "viem";
import { useReadContract } from "wagmi";
import { abi } from "@/abi/ZKLend.json";
import { collateralConfig } from "./writeContract";

export const wagmiContractConfig = {
  address: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`,
  abi: abi,
};

export function getUserBalanceCollateralToken(user: Address) {
  const {
    data: balance,
    error,
    isPending,
    refetch,
  } = useReadContract({
    ...collateralConfig,
    functionName: "balanceOf",
    args: [user],
  });

  return { balance, error, isPending, refetch };
}

export function getUserCollateral(user: Address) {
  const {
    data: balance,
    error,
    isPending,
    refetch,
  } = useReadContract({
    ...wagmiContractConfig,
    functionName: "getUserCollateral",
    args: [user],
  });

  return { balance, error, isPending, refetch };
}

export function getUserLiquidity(user: Address) {
  const {
    data: liquidity,
    error,
    isPending,
    refetch,
  } = useReadContract({
    ...wagmiContractConfig,
    functionName: "getUserLiquidity",
    args: [user],
  });

  return { liquidity, error, isPending, refetch };
}

export function getUserLoanCount(user: Address) {
  const {
    data: loanCount,
    error,
    isPending,
    refetch,
  } = useReadContract({
    ...wagmiContractConfig,
    functionName: "getUserLoanCount",
    args: [user],
  });

  return { loanCount, error, isPending, refetch };
}

export function getUserLoan(user: Address, loanId: bigint) {
  const {
    data: loan,
    error,
    isPending,
    refetch,
  } = useReadContract({
    ...wagmiContractConfig,
    functionName: "getUserLoan",
    args: [user, loanId],
  });

  return { loan, error, isPending, refetch };
}

export function getTotalLiquidity() {
  const {
    data: totalLiquidity,
    error,
    isPending,
    refetch,
  } = useReadContract({
    ...wagmiContractConfig,
    functionName: "getTotalLiquidity",
  });

  return { totalLiquidity, error, isPending, refetch };
}
