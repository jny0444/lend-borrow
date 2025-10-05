"use client";

import { FormEvent, useCallback, useMemo, useState } from "react";
import { parseUnits, formatEther } from "viem";
import type { Abi, Address } from "viem";
import { useAccount, useReadContracts } from "wagmi";
import {
  getUserCollateral,
  getUserLoanCount,
  wagmiContractConfig,
} from "@/utils/readContract";
import { useTakeLoan } from "@/utils/writeContract";

type UnitChoice = "wei" | "ether";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as Address;

const UNIT_OPTIONS: { label: string; value: UnitChoice }[] = [
  { label: "Ether", value: "ether" },
  { label: "Wei", value: "wei" },
];

const COLLATERAL_FACTOR_PERCENT = BigInt(90);
const ONE_HUNDRED_PERCENT = BigInt(100);
const SECONDS_PER_DAY_BIGINT = BigInt(86_400);

type LoanContractConfig = {
  address: Address;
  abi: Abi;
  functionName: "getUserLoan";
  args: readonly [Address, bigint];
};

type LoanContractReadResult =
  | {
      status: "success";
      result: readonly [bigint, bigint, bigint, boolean];
    }
  | {
      status: "failure";
      result?: undefined;
    };

type LoanEntry = {
  loanId: bigint;
  startTime: bigint;
  amount: bigint;
  collateral: bigint;
  isActive: boolean;
};

const formatTokenAmount = (value: unknown) => {
  if (typeof value !== "bigint") {
    return "--";
  }

  const formatted = formatEther(value);
  const [whole, fraction] = formatted.split(".");
  const trimmedFraction = fraction ? fraction.slice(0, 4) : "0000";
  return `${whole}.${trimmedFraction}`;
};

const shortenHash = (hash: string) => `${hash.slice(0, 6)}…${hash.slice(-4)}`;

const parseAmountInput = (input: string, unit: UnitChoice) => {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error("Enter an amount before submitting.");
  }

  const decimals = unit === "ether" ? 18 : 0;
  return parseUnits(trimmed, decimals);
};

export default function Borrow() {
  const { address, isConnected } = useAccount();
  const userAddress = (address ?? ZERO_ADDRESS) as Address;

  const {
    balance: collateralDeposited,
    error: collateralError,
    isPending: collateralPending,
    refetch: refetchCollateral,
  } = getUserCollateral(userAddress);

  const {
    loanCount,
    error: loanCountError,
    isPending: loanCountPending,
    refetch: refetchLoanCount,
  } = getUserLoanCount(userAddress);

  const loanCountNumber = useMemo(() => {
    if (typeof loanCount !== "bigint") {
      return 0;
    }
    const asNumber = Number(loanCount);
    if (!Number.isFinite(asNumber)) {
      return 0;
    }
    return asNumber;
  }, [loanCount]);

  const loanContractConfigs = useMemo<LoanContractConfig[]>(() => {
    if (!isConnected || loanCountNumber <= 0) {
      return [];
    }

    return Array.from({ length: loanCountNumber }, (_, index) => ({
      address: wagmiContractConfig.address,
      abi: wagmiContractConfig.abi as Abi,
      functionName: "getUserLoan",
      args: [userAddress, BigInt(index)] as const,
    })) as LoanContractConfig[];
  }, [isConnected, loanCountNumber, userAddress]);

  const {
    data: loanContractData,
    error: loansError,
    isPending: loansPending,
    refetch: refetchLoans,
  } = useReadContracts({
    allowFailure: true,
    contracts: loanContractConfigs as unknown as readonly LoanContractConfig[],
    query: {
      enabled: isConnected && loanCountNumber > 0,
    },
  });

  const {
    takeLoan,
    error: takeLoanError,
    isPending: takeLoanPending,
  } = useTakeLoan();

  const [loanInput, setLoanInput] = useState("");
  const [loanUnit, setLoanUnit] = useState<UnitChoice>("ether");
  const [loanMessage, setLoanMessage] = useState<string | null>(null);

  const loans = useMemo<LoanEntry[]>(() => {
    if (!loanContractData || loanContractData.length === 0) {
      return [];
    }

    return loanContractData.flatMap((item, index) => {
      const entry = item as LoanContractReadResult | undefined;
      if (!entry || entry.status !== "success" || !entry.result) {
        return [] as LoanEntry[];
      }

      const [startTime, amount, collateral, isActive] = entry.result;

      return [
        {
          loanId: BigInt(index),
          startTime,
          amount,
          collateral,
          isActive,
        },
      ];
    });
  }, [loanContractData]);

  const activeLoans = useMemo(
    () => loans.filter((loan) => loan.isActive),
    [loans]
  );

  const totalActiveBorrowed = useMemo(() => {
    return activeLoans.reduce((sum, loan) => sum + loan.amount, BigInt(0));
  }, [activeLoans]);

  const maxBorrowCapacity = useMemo(() => {
    if (typeof collateralDeposited !== "bigint") {
      return null;
    }

    return (
      (collateralDeposited * COLLATERAL_FACTOR_PERCENT) / ONE_HUNDRED_PERCENT
    );
  }, [collateralDeposited]);

  const availableBorrowCapacity = useMemo(() => {
    if (maxBorrowCapacity === null) {
      return null;
    }

    const remaining = maxBorrowCapacity - totalActiveBorrowed;
    if (remaining <= BigInt(0)) {
      return BigInt(0);
    }
    return remaining;
  }, [maxBorrowCapacity, totalActiveBorrowed]);

  const borrowUtilizationPercent = useMemo(() => {
    if (
      maxBorrowCapacity === null ||
      maxBorrowCapacity === undefined ||
      maxBorrowCapacity <= BigInt(0)
    ) {
      return 0;
    }

    const scaled = (totalActiveBorrowed * BigInt(10000)) / maxBorrowCapacity;
    return Number(scaled) / 100;
  }, [maxBorrowCapacity, totalActiveBorrowed]);

  const progressPercent = Math.min(100, Math.max(0, borrowUtilizationPercent));

  const loanListLoading = loanCountPending || loansPending;

  const loanListErrorMessage = useMemo(() => {
    if (loanCountError) {
      return loanCountError instanceof Error
        ? loanCountError.message
        : "Unable to load loan information.";
    }

    if (loansError) {
      return loansError instanceof Error
        ? loansError.message
        : "Unable to load loans.";
    }

    return null;
  }, [loanCountError, loansError]);

  const handleBorrowSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setLoanMessage(null);

      try {
        const amount = parseAmountInput(loanInput, loanUnit);
        if (amount <= BigInt(0)) {
          throw new Error("Loan amount must be greater than zero.");
        }

        if (maxBorrowCapacity === null) {
          throw new Error("Deposit collateral before borrowing.");
        }

        const remaining = availableBorrowCapacity ?? BigInt(0);
        if (remaining <= BigInt(0)) {
          throw new Error("No borrowing capacity remaining.");
        }

        if (amount > remaining) {
          throw new Error(
            `Requested amount exceeds your remaining limit of ${formatTokenAmount(
              remaining
            )}.`
          );
        }

        const txHash = await takeLoan(amount);
        setLoanMessage(
          txHash
            ? `Loan transaction submitted: ${shortenHash(txHash)}`
            : "Loan transaction submitted."
        );

        await Promise.all([
          refetchCollateral(),
          refetchLoanCount(),
          refetchLoans(),
        ]);

        setLoanInput("");
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to take loan.";
        setLoanMessage(message);
      }
    },
    [
      availableBorrowCapacity,
      loanInput,
      loanUnit,
      maxBorrowCapacity,
      refetchCollateral,
      refetchLoanCount,
      refetchLoans,
      takeLoan,
    ]
  );

  const borrowDisabled = !isConnected || takeLoanPending;

  return (
    <div className="container mx-auto flex max-w-4xl flex-col gap-6 p-6 text-black">
      <header className="space-y-2">
        <h1 className="text-4xl font-bold">Borrow</h1>
        <p className="text-sm text-black/70">
          Borrow lending tokens against your deposited collateral. You can draw
          up to 90% of the collateral value.
        </p>
      </header>

      {!isConnected ? (
        <div className="rounded-xl border border-dashed border-black/20 bg-white/60 p-4 text-sm text-black/70">
          Connect your wallet to request a loan. Balances default to zero until
          you connect.
        </div>
      ) : null}

      <article className="flex flex-col gap-6 rounded-2xl bg-white p-6 shadow-md">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold">Loan management</h2>
          <p className="text-sm text-black/70">
            Loan requests execute on the zkLend lending pool. Amounts can be
            entered in ether or wei and are capped at 90% of your collateral.
          </p>
        </div>

        <div className="rounded-xl border border-black/10 bg-black/[0.02] p-4">
          <div className="flex items-center justify-between text-sm font-semibold">
            <span>Borrowing capacity used</span>
            <span>{progressPercent.toFixed(1)}%</span>
          </div>
          <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-black/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-black via-black to-black"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="mt-3 flex flex-col gap-1 text-xs text-black/70 sm:flex-row sm:items-center sm:justify-between">
            <span>
              Borrowed {formatTokenAmount(totalActiveBorrowed)} /{" "}
              {formatTokenAmount(maxBorrowCapacity ?? null)} (limit at 90% of
              collateral)
            </span>
            {availableBorrowCapacity !== null ? (
              <span className="font-semibold text-black">
                Available: {formatTokenAmount(availableBorrowCapacity)}
              </span>
            ) : null}
          </div>
        </div>

        <form
          onSubmit={handleBorrowSubmit}
          className="flex flex-col gap-4 rounded-xl border border-black/10 bg-black/[0.02] p-4"
        >
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium">Take a loan</span>
            <span className="text-xs text-black/60">
              Enter the amount of lending tokens you want to borrow. You can
              borrow up to 90% of your deposited collateral.
            </span>
          </div>
          <label className="text-xs font-semibold uppercase tracking-wide text-black/60">
            Amount
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={loanInput}
            onChange={(event) => setLoanInput(event.target.value)}
            className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm shadow-sm focus:border-black/40 focus:outline-none focus:ring-2 focus:ring-black/20"
            placeholder="0.0"
          />
          <div className="flex items-center gap-3">
            <label className="text-xs font-semibold uppercase tracking-wide text-black/60">
              Unit
            </label>
            <select
              value={loanUnit}
              onChange={(event) =>
                setLoanUnit(event.target.value as UnitChoice)
              }
              className="w-32 rounded-lg border border-black/10 bg-white px-3 py-2 text-sm shadow-sm focus:border-black/40 focus:outline-none focus:ring-2 focus:ring-black/20"
            >
              {UNIT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={borrowDisabled}
            className="inline-flex w-full items-center justify-center rounded-full bg-black px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(0,0,0,0.24)] transition-opacity disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
          >
            {takeLoanPending ? "Processing…" : "Submit loan request"}
          </button>
          {loanMessage ? (
            <p className="text-xs text-black/70">{loanMessage}</p>
          ) : null}
          {takeLoanError ? (
            <p className="text-xs text-red-500">
              {takeLoanError instanceof Error
                ? takeLoanError.message
                : String(takeLoanError)}
            </p>
          ) : null}
          {collateralError ? (
            <p className="text-xs text-red-500">
              {collateralError instanceof Error
                ? collateralError.message
                : String(collateralError)}
            </p>
          ) : null}
        </form>

        <div className="grid gap-4 rounded-xl border border-black/10 bg-black/[0.02] p-4 sm:grid-cols-2">
          <div className="rounded-lg border border-dotted border-black/30 bg-white/70 px-4 py-3 text-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-black/60">
              Deposited collateral
            </p>
            <p className="text-lg font-semibold text-black">
              {formatTokenAmount(collateralDeposited)}
            </p>
            {collateralPending ? (
              <p className="mt-2 text-[11px] text-black/50">
                Fetching collateral balance…
              </p>
            ) : null}
          </div>
          <div className="rounded-lg border border-dotted border-black/30 bg-white/70 px-4 py-3 text-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-black/60">
              Remaining borrow capacity
            </p>
            <p className="text-lg font-semibold text-black">
              {formatTokenAmount(availableBorrowCapacity ?? null)}
            </p>
            {loanListErrorMessage ? (
              <p className="mt-2 text-[11px] text-red-500">
                {loanListErrorMessage}
              </p>
            ) : null}
          </div>
          <div className="rounded-lg border border-dotted border-black/30 bg-white/70 px-4 py-3 text-sm sm:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-black/60">
              Active loans
            </p>
            {loanListLoading ? (
              <p className="text-xs text-black/60">Loading loans…</p>
            ) : activeLoans.length === 0 ? (
              <p className="text-xs text-black/60">
                You have no active loans. You can borrow up to 90% of your
                collateral.
              </p>
            ) : (
              <div className="mt-2 space-y-2">
                {activeLoans.map((loan) => (
                  <div
                    key={loan.loanId.toString()}
                    className="rounded-lg border border-black/10 bg-white px-4 py-3 text-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-black">
                        Loan #{loan.loanId.toString()}
                      </span>
                      <span className="text-[11px] uppercase tracking-wide text-emerald-600">
                        Active
                      </span>
                    </div>
                    <p className="text-xs text-black/60">
                      Borrowed {formatTokenAmount(loan.amount)} against{" "}
                      {formatTokenAmount(loan.collateral)} collateral
                    </p>
                    <p className="text-[11px] text-black/50">
                      Started on{" "}
                      {new Date(Number(loan.startTime) * 1000).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </article>
    </div>
  );
}
