import { Address } from "viem";
import { useReadContract } from "wagmi";
import { abi } from "@/abi/ZKLend.json";

export const wagmiContractConfig = {
  address: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`,
  abi: abi,
};

export function getUserCollateral(user: Address) {
  const {
    data: balance,
    error,
    isPending,
  } = useReadContract({
    ...wagmiContractConfig,
    functionName: "getUserCollateral",
    args: [user],
  });

  return { balance, error, isPending };
}

export function getUserLiquidity(user: Address) {
  const {
    data: liquidity,
    error,
    isPending,
  } = useReadContract({
    ...wagmiContractConfig,
    functionName: "getUserLiquidity",
    args: [user],
  });

  return { liquidity, error, isPending };
}

export function getUserLoanCount(user: Address) {
  const {
    data: loanCount,
    error,
    isPending,
  } = useReadContract({
    ...wagmiContractConfig,
    functionName: "getUserLoanCount",
    args: [user],
  });

  return { loanCount, error, isPending };
}

export function getUserLoan(user: Address, loanId: bigint) {
  const {
    data: loan,
    error,
    isPending,
  } = useReadContract({
    ...wagmiContractConfig,
    functionName: "getUserLoan",
    args: [user, loanId],
  });

  return { loan, error, isPending };
}

export function getTotalLiquidity() {
  const {
    data: totalLiquidity,
    error,
    isPending,
  } = useReadContract({
    ...wagmiContractConfig,
    functionName: "getTotalLiquidity",
  });

  return { totalLiquidity, error, isPending };
}
