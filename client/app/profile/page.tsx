"use client";

import Image from "next/image";
import { FormEvent, useCallback, useMemo, useState } from "react";
import { parseUnits, formatEther } from "viem";
import type { Abi, Address } from "viem";
import { useAccount, useReadContracts } from "wagmi";
import {
  getUserCollateral,
  getUserBalanceCollateralToken,
  getUserBalanceLendToken,
  getUserLoanCount,
  getUserLoan,
  wagmiContractConfig,
} from "@/utils/readContract";
import { useAddCollateral, useRepayLoan } from "@/utils/writeContract";

type UnitChoice = "wei" | "ether";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as Address;

const UNIT_OPTIONS: { label: string; value: UnitChoice }[] = [
  { label: "Ether", value: "ether" },
  { label: "Wei", value: "wei" },
];

const COLLATERAL_FACTOR_PERCENT = BigInt(90);
const ONE_HUNDRED_PERCENT = BigInt(100);
const INTEREST_RATE_PERCENT = BigInt(5);
const SECONDS_PER_DAY_BIGINT = BigInt(86_400);

type LoanEntry = {
  loanId: bigint;
  startTime: bigint;
  amount: bigint;
  collateral: bigint;
  isActive: boolean;
};

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

export default function Profile() {
  const { address, isConnected } = useAccount();
  const userAddress = (address ?? ZERO_ADDRESS) as Address;

  const {
    balance: collateralDeposited,
    error: collateralDepositedError,
    isPending: collateralDepositedPending,
    refetch: refetchCollateralDeposited,
  } = getUserCollateral(userAddress);

  const {
    balance: collateralWalletBalance,
    error: collateralWalletError,
    isPending: collateralWalletPending,
  } = getUserBalanceCollateralToken(userAddress);

  const {
    balance: lendWalletBalance,
    error: lendWalletError,
    isPending: lendWalletPending,
  } = getUserBalanceLendToken(userAddress);

  const {
    depositCollateral,
    error: collateralTxError,
    isPending: collateralTxPending,
  } = useAddCollateral();

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
    repayLoan,
    error: repayLoanError,
    isPending: repayLoanPending,
  } = useRepayLoan();

  const [collateralInput, setCollateralInput] = useState("");
  const [collateralUnit, setCollateralUnit] = useState<UnitChoice>("ether");
  const [collateralMessage, setCollateralMessage] = useState<string | null>(
    null
  );
  const [selectedLoanId, setSelectedLoanId] = useState<bigint | null>(null);
  const [loanActionMessage, setLoanActionMessage] = useState<string | null>(
    null
  );

  const formattedCollateralDeposited = useMemo(
    () => formatTokenAmount(collateralDeposited),
    [collateralDeposited]
  );

  const formattedCollateralWallet = useMemo(
    () => formatTokenAmount(collateralWalletBalance),
    [collateralWalletBalance]
  );

  const formattedLendWallet = useMemo(
    () => formatTokenAmount(lendWalletBalance),
    [lendWalletBalance]
  );

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

  const orderedLoans = useMemo(() => {
    if (loans.length === 0) {
      return [] as LoanEntry[];
    }

    return [...loans].sort((a, b) => Number(b.loanId - a.loanId));
  }, [loans]);

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

  const selectedLoan = useMemo(() => {
    if (selectedLoanId === null) {
      return null;
    }
    return activeLoans.find((loan) => loan.loanId === selectedLoanId) ?? null;
  }, [activeLoans, selectedLoanId]);

  const estimatedSelectedLoanRepayment = useMemo(() => {
    if (!selectedLoan) {
      return null;
    }

    const nowSeconds = BigInt(Math.floor(Date.now() / 1000));
    if (nowSeconds <= selectedLoan.startTime) {
      return selectedLoan.amount;
    }

    const elapsedSeconds = nowSeconds - selectedLoan.startTime;
    const daysElapsed =
      elapsedSeconds > BigInt(0)
        ? elapsedSeconds / SECONDS_PER_DAY_BIGINT
        : BigInt(0);
    const interest =
      (selectedLoan.amount * INTEREST_RATE_PERCENT * daysElapsed) /
      ONE_HUNDRED_PERCENT;

    return selectedLoan.amount + interest;
  }, [selectedLoan]);

  const selectedLoanDaysElapsed = useMemo(() => {
    if (!selectedLoan) {
      return null;
    }

    const nowSeconds = BigInt(Math.floor(Date.now() / 1000));
    if (nowSeconds <= selectedLoan.startTime) {
      return 0;
    }

    const elapsedSeconds = nowSeconds - selectedLoan.startTime;
    return Number(elapsedSeconds / SECONDS_PER_DAY_BIGINT);
  }, [selectedLoan]);

  const collateralInfoMessage = collateralDepositedError
    ? collateralDepositedError instanceof Error
      ? collateralDepositedError.message
      : "Unable to load collateral deposits."
    : collateralDepositedPending
    ? "Fetching collateral deposits…"
    : null;

  const collateralWalletInfoMessage = collateralWalletError
    ? collateralWalletError instanceof Error
      ? collateralWalletError.message
      : "Unable to load collateral token balance."
    : collateralWalletPending
    ? "Fetching collateral wallet balance…"
    : null;

  const lendWalletInfoMessage = lendWalletError
    ? lendWalletError instanceof Error
      ? lendWalletError.message
      : "Unable to load lending token balance."
    : lendWalletPending
    ? "Fetching lending wallet balance…"
    : null;

  const handleCollateralSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setCollateralMessage(null);

      try {
        const amount = parseAmountInput(collateralInput, collateralUnit);
        const txHash = await depositCollateral(amount);
        setCollateralMessage(
          txHash
            ? `Collateral deposit transaction submitted: ${shortenHash(txHash)}`
            : "Collateral deposit transaction submitted."
        );
        await refetchCollateralDeposited();
        setCollateralInput("");
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to deposit collateral.";
        setCollateralMessage(message);
      }
    },
    [
      collateralInput,
      collateralUnit,
      depositCollateral,
      refetchCollateralDeposited,
    ]
  );

  const collateralSubmitDisabled =
    !isConnected || collateralTxPending || collateralDepositedPending;

  const openLoanDetails = useCallback((loanId: bigint) => {
    setSelectedLoanId(loanId);
    setLoanActionMessage(null);
  }, []);

  const closeLoanDetails = useCallback(() => {
    setSelectedLoanId(null);
  }, []);

  const handleRepayLoan = useCallback(
    async (loanId: bigint) => {
      setLoanActionMessage(null);

      try {
        const txHash = await repayLoan(loanId);
        setLoanActionMessage(
          txHash
            ? `Loan repayment transaction submitted: ${shortenHash(txHash)}`
            : "Loan repayment transaction submitted."
        );

        await Promise.all([
          refetchLoans(),
          refetchLoanCount(),
          refetchCollateralDeposited(),
        ]);

        setSelectedLoanId(null);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to repay loan.";
        setLoanActionMessage(message);
      }
    },
    [refetchCollateralDeposited, refetchLoanCount, refetchLoans, repayLoan]
  );

  return (
    <div className="container mx-auto flex max-w-4xl flex-col gap-6 p-6">
      <header className="space-y-2 text-black">
        <h1 className="text-4xl font-bold">Profile</h1>
        <p className="text-sm text-black/70">
          Manage your zkLend collateral and lending positions from a single
          place.
        </p>
      </header>

      {!isConnected ? (
        <div className="rounded-xl border border-dashed border-black/20 bg-white/60 p-4 text-sm text-black/70">
          Connect your wallet to deposit collateral and view your lending token
          balances. Field values default to zero until a wallet is connected.
        </div>
      ) : null}

      <section className="flex flex-col gap-6 rounded-2xl bg-white p-6 text-black shadow-md">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold">Loan health</h2>
          <p className="text-sm text-black/70">
            Monitor how much you&apos;ve borrowed against your collateral and
            manage active loans.
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

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-black/60">
              Loan positions
            </h3>
            {loanListLoading ? (
              <span className="text-xs text-black/50">Loading…</span>
            ) : null}
          </div>
          {loanListErrorMessage ? (
            <p className="text-xs text-red-500">{loanListErrorMessage}</p>
          ) : null}
          {loanActionMessage ? (
            <p className="text-xs text-black/70">{loanActionMessage}</p>
          ) : null}
          <div className="rounded-xl border border-black/10 bg-white/80 px-3 py-2 shadow-sm">
            <div className="flex flex-col gap-2">
              {loanListLoading ? (
                <div className="h-20" />
              ) : orderedLoans.length === 0 ? (
                <div className="h-20" />
              ) : (
                orderedLoans.map((loan) => (
                  <LoanListItem
                    key={loan.loanId.toString()}
                    userAddress={userAddress}
                    loan={loan}
                    onOpen={openLoanDetails}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      <article className="flex flex-col gap-6 rounded-2xl bg-white p-6 text-black shadow-md">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold">Collateral overview</h2>
          <p className="text-sm text-black/70">
            Specify amounts in ether or wei. Submitted transactions are routed
            through the zkLend smart contracts.
          </p>
        </div>

        <form
          onSubmit={handleCollateralSubmit}
          className="flex flex-col gap-4 rounded-xl border border-black/10 bg-black/[0.02] p-4"
        >
          <div className="flex flex-col gap-2">
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium">Deposit collateral</span>
              <span className="text-xs text-black/60">
                Provide borrower collateral to secure loans.
              </span>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-4">
              <div className="flex flex-1 flex-col gap-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-black/60">
                  Amount
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={collateralInput}
                  onChange={(event) => setCollateralInput(event.target.value)}
                  className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm shadow-sm focus:border-black/40 focus:outline-none focus:ring-2 focus:ring-black/20"
                  placeholder="0.0"
                />
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                  <label className="text-xs font-semibold uppercase tracking-wide text-black/60">
                    Unit
                  </label>
                  <select
                    value={collateralUnit}
                    onChange={(event) =>
                      setCollateralUnit(event.target.value as UnitChoice)
                    }
                    className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm shadow-sm focus:border-black/40 focus:outline-none focus:ring-2 focus:ring-black/20 sm:w-40"
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
                  disabled={collateralSubmitDisabled}
                  className="mt-1 inline-flex w-full items-center justify-center rounded-full bg-black px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(0,0,0,0.24)] transition-opacity disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
                >
                  {collateralTxPending ? "Processing…" : "Deposit collateral"}
                </button>
              </div>

              <div className="rounded-lg border border-dotted border-black/30 bg-white/70 px-4 py-3 text-sm sm:w-56">
                <p className="text-xs font-semibold uppercase tracking-wide text-black/60">
                  Deposited collateral
                </p>
                <p className="text-lg font-semibold text-black">
                  {formattedCollateralDeposited}
                </p>
                <p className="mt-2 text-xs text-black/60">
                  Wallet balance:{" "}
                  <span className="font-semibold text-black">
                    {formattedCollateralWallet}
                  </span>
                </p>
                {collateralInfoMessage ? (
                  <p className="mt-1 text-[11px] text-red-500">
                    {collateralInfoMessage}
                  </p>
                ) : null}
                {collateralWalletInfoMessage ? (
                  <p className="mt-1 text-[11px] text-red-500">
                    {collateralWalletInfoMessage}
                  </p>
                ) : null}
              </div>
            </div>
            {collateralMessage ? (
              <p className="text-xs text-black/70">{collateralMessage}</p>
            ) : null}
            {collateralTxError ? (
              <p className="text-xs text-red-500">
                {collateralTxError instanceof Error
                  ? collateralTxError.message
                  : String(collateralTxError)}
              </p>
            ) : null}
          </div>
        </form>

        <div className="flex flex-col gap-4 rounded-xl border border-black/10 bg-black/[0.02] p-4">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium">Lending balance</span>
            <span className="text-xs text-black/60">
              Track your lending token holdings. Liquidity provisioning will
              come back in a future update.
            </span>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
            <div className="rounded-lg border border-dotted border-black/30 bg-white/70 px-4 py-3 text-sm sm:w-56">
              <div className="flex items-center gap-3">
                <Image
                  src="/lend.png"
                  alt="Lend token"
                  width={40}
                  height={40}
                  className="h-10 w-10 rounded-full border border-black/10 bg-white object-contain"
                />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-black/60">
                    Wallet balance
                  </p>
                  <p className="text-lg font-semibold text-black">
                    {formattedLendWallet}
                  </p>
                </div>
              </div>
              {lendWalletInfoMessage ? (
                <p className="mt-3 text-[11px] text-red-500">
                  {lendWalletInfoMessage}
                </p>
              ) : null}
            </div>
            <div className="rounded-lg border border-black/10 bg-white px-4 py-3 text-xs text-black/70 sm:flex-1">
              <p>
                You can still monitor your lending wallet balance here while we
                work on a refreshed liquidity experience.
              </p>
            </div>
          </div>
        </div>
      </article>

      {selectedLoan ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6"
          onClick={closeLoanDetails}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white p-6 text-black shadow-lg"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold">Loan details</h3>
                <p className="text-xs text-black/60">
                  Loan #{selectedLoan.loanId.toString()}
                </p>
              </div>
              <button
                type="button"
                onClick={closeLoanDetails}
                className="rounded-full border border-black/10 px-3 py-1 text-xs font-semibold text-black/60 transition hover:border-black/40 hover:text-black"
              >
                Close
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-black/10 bg-black/[0.02] p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-black/60">
                  Principal borrowed
                </p>
                <p className="text-lg font-semibold text-black">
                  {formatTokenAmount(selectedLoan.amount)}
                </p>
              </div>
              <div className="rounded-lg border border-black/10 bg-black/[0.02] p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-black/60">
                  Collateral snapshot
                </p>
                <p className="text-lg font-semibold text-black">
                  {formatTokenAmount(selectedLoan.collateral)}
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-2 text-sm text-black/70">
              <p>
                Started on:{" "}
                {new Date(
                  Number(selectedLoan.startTime) * 1000
                ).toLocaleString()}
              </p>
              <p>Days active: {selectedLoanDaysElapsed ?? "--"}</p>
              <p>
                Estimated repayment today:{" "}
                <span className="font-semibold text-black">
                  {formatTokenAmount(estimatedSelectedLoanRepayment ?? null)}
                </span>
              </p>
              <p className="text-[11px] text-black/50">
                Repayments accrue simple interest at 5% per day. Actual on-chain
                totals depend on the block timestamp.
              </p>
            </div>

            {repayLoanError ? (
              <p className="mt-3 text-xs text-red-500">
                {repayLoanError instanceof Error
                  ? repayLoanError.message
                  : String(repayLoanError)}
              </p>
            ) : null}

            <div className="mt-6 flex flex-col-reverse items-stretch gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeLoanDetails}
                className="inline-flex items-center justify-center rounded-full border border-black/20 px-4 py-2 text-sm font-semibold text-black transition hover:border-black/40 hover:text-black"
                disabled={repayLoanPending}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleRepayLoan(selectedLoan.loanId)}
                className="inline-flex items-center justify-center rounded-full bg-black px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(0,0,0,0.24)] transition-opacity disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
                disabled={repayLoanPending}
              >
                {repayLoanPending ? "Submitting…" : "Repay loan"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

type LoanListItemProps = {
  userAddress: Address;
  loan: LoanEntry;
  onOpen: (loanId: bigint) => void;
};

function LoanListItem({ userAddress, loan, onOpen }: LoanListItemProps) {
  const {
    loan: fetchedLoan,
    error,
    isPending,
  } = getUserLoan(userAddress, loan.loanId);

  const fallback = [
    loan.startTime,
    loan.amount,
    loan.collateral,
    loan.isActive,
  ] as const;
  const loanTuple = fetchedLoan as
    | readonly [bigint, bigint, bigint, boolean]
    | undefined;
  const [startTime, amount, collateral, isActive] = loanTuple ?? fallback;

  const statusLabel = isActive ? "Active" : "Closed";
  const statusClass = isActive ? "text-emerald-600" : "text-black/40";

  const body = (
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-1">
        <p className="text-sm font-semibold text-black">
          Loan #{loan.loanId.toString()}
        </p>
        <p className="text-xs text-black/60">
          Borrowed {formatTokenAmount(amount)} against{" "}
          {formatTokenAmount(collateral)} collateral
        </p>
        <p className="text-[11px] text-black/50">
          Opened on {new Date(Number(startTime) * 1000).toLocaleDateString()}
        </p>
        {error ? (
          <p className="text-[11px] text-red-500">
            {error instanceof Error ? error.message : "Unable to load loan."}
          </p>
        ) : null}
      </div>
      <span
        className={`text-[11px] font-semibold uppercase tracking-wide ${statusClass}`}
      >
        {isPending ? "Loading…" : statusLabel}
      </span>
    </div>
  );

  if (isActive) {
    return (
      <button
        type="button"
        onClick={() => onOpen(loan.loanId)}
        className="rounded-lg border border-black/10 bg-white px-4 py-3 text-left transition hover:border-black/40 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isPending}
      >
        {body}
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-dashed border-black/10 bg-white px-4 py-3">
      {body}
    </div>
  );
}
