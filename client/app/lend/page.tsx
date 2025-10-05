"use client";

import { FormEvent, useCallback, useMemo, useState } from "react";
import { parseUnits, formatEther } from "viem";
import type { Address } from "viem";
import { useAccount } from "wagmi";
import {
  getTotalLiquidity,
  getUserBalanceLendToken,
  getUserLiquidity,
} from "@/utils/readContract";
import {
  useProvideLiquidity,
  useWithdrawLiquidity,
} from "@/utils/writeContract";

type UnitChoice = "wei" | "ether";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as Address;

const UNIT_OPTIONS: { label: string; value: UnitChoice }[] = [
  { label: "Ether", value: "ether" },
  { label: "Wei", value: "wei" },
];

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

export default function Lend() {
  const { address, isConnected } = useAccount();
  const userAddress = (address ?? ZERO_ADDRESS) as Address;

  const {
    liquidity,
    error: userLiquidityError,
    isPending: userLiquidityPending,
    refetch: refetchUserLiquidity,
  } = getUserLiquidity(userAddress);

  const {
    balance: lendWalletBalance,
    error: lendWalletError,
    isPending: lendWalletPending,
    refetch: refetchWalletBalance,
  } = getUserBalanceLendToken(userAddress);

  const {
    totalLiquidity,
    error: totalLiquidityError,
    isPending: totalLiquidityPending,
    refetch: refetchTotalLiquidity,
  } = getTotalLiquidity();

  const {
    provideLiquidity,
    error: provideError,
    isPending: providePending,
  } = useProvideLiquidity();

  const {
    withdrawLiquidity,
    error: withdrawError,
    isPending: withdrawPending,
  } = useWithdrawLiquidity();

  const [provideInput, setProvideInput] = useState("");
  const [provideUnit, setProvideUnit] = useState<UnitChoice>("ether");
  const [provideMessage, setProvideMessage] = useState<string | null>(null);

  const [withdrawInput, setWithdrawInput] = useState("");
  const [withdrawUnit, setWithdrawUnit] = useState<UnitChoice>("ether");
  const [withdrawMessage, setWithdrawMessage] = useState<string | null>(null);

  const formattedUserLiquidity = useMemo(
    () => formatTokenAmount(liquidity),
    [liquidity]
  );

  const formattedWalletBalance = useMemo(
    () => formatTokenAmount(lendWalletBalance),
    [lendWalletBalance]
  );

  const formattedTotalLiquidity = useMemo(
    () => formatTokenAmount(totalLiquidity),
    [totalLiquidity]
  );

  const userLiquidityInfoMessage = userLiquidityError
    ? userLiquidityError instanceof Error
      ? userLiquidityError.message
      : "Unable to load your supplied liquidity."
    : userLiquidityPending
    ? "Fetching supplied liquidity…"
    : null;

  const walletInfoMessage = lendWalletError
    ? lendWalletError instanceof Error
      ? lendWalletError.message
      : "Unable to load lending token balance."
    : lendWalletPending
    ? "Fetching lending wallet balance…"
    : null;

  const totalLiquidityInfoMessage = totalLiquidityError
    ? totalLiquidityError instanceof Error
      ? totalLiquidityError.message
      : "Unable to load protocol liquidity."
    : totalLiquidityPending
    ? "Fetching protocol liquidity…"
    : null;

  const handleProvideSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setProvideMessage(null);

      try {
        const amount = parseAmountInput(provideInput, provideUnit);
        const txHash = await provideLiquidity(amount);
        setProvideMessage(
          txHash
            ? `Liquidity provision submitted: ${shortenHash(txHash)}`
            : "Liquidity provision transaction submitted."
        );

        await Promise.all([
          refetchUserLiquidity(),
          refetchWalletBalance(),
          refetchTotalLiquidity(),
        ]);

        setProvideInput("");
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to provide liquidity.";
        setProvideMessage(message);
      }
    },
    [
      provideInput,
      provideUnit,
      provideLiquidity,
      refetchTotalLiquidity,
      refetchUserLiquidity,
      refetchWalletBalance,
    ]
  );

  const handleWithdrawSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setWithdrawMessage(null);

      try {
        const amount = parseAmountInput(withdrawInput, withdrawUnit);
        const txHash = await withdrawLiquidity(amount);
        setWithdrawMessage(
          txHash
            ? `Liquidity withdrawal submitted: ${shortenHash(txHash)}`
            : "Liquidity withdrawal transaction submitted."
        );

        await Promise.all([
          refetchUserLiquidity(),
          refetchWalletBalance(),
          refetchTotalLiquidity(),
        ]);

        setWithdrawInput("");
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to withdraw liquidity.";
        setWithdrawMessage(message);
      }
    },
    [
      refetchTotalLiquidity,
      refetchUserLiquidity,
      refetchWalletBalance,
      withdrawInput,
      withdrawLiquidity,
      withdrawUnit,
    ]
  );

  const provideDisabled =
    !isConnected || providePending || userLiquidityPending || lendWalletPending;
  const withdrawDisabled =
    !isConnected || withdrawPending || userLiquidityPending;

  return (
    <div className="container mx-auto flex max-w-4xl flex-col gap-6 p-6 text-black">
      <header className="space-y-2">
        <h1 className="text-4xl font-bold">Provide liquidity</h1>
        <p className="text-sm text-black/70">
          Supply lending tokens to earn yield and withdraw your position at any
          time.
        </p>
      </header>

      {!isConnected ? (
        <div className="rounded-xl border border-dashed border-black/20 bg-white/60 p-4 text-sm text-black/70">
          Connect your wallet to provide or withdraw liquidity. Balances default
          to zero until you connect.
        </div>
      ) : null}

      <article className="flex flex-col gap-6 rounded-2xl bg-white p-6 shadow-md">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold">Lend Your Tokens</h2>
          <p className="text-sm text-black/70">
            Transactions route through the zkLend lending pool. Amounts can be
            entered in ether or wei.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <form
            onSubmit={handleProvideSubmit}
            className="flex flex-col gap-4 rounded-xl border border-black/10 bg-black/[0.02] p-4"
          >
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium">Provide liquidity</span>
              <span className="text-xs text-black/60">
                Transfer lending tokens into the pool to receive LP exposure.
              </span>
            </div>
            <label className="text-xs font-semibold uppercase tracking-wide text-black/60">
              Amount
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={provideInput}
              onChange={(event) => setProvideInput(event.target.value)}
              className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm shadow-sm focus:border-black/40 focus:outline-none focus:ring-2 focus:ring-black/20"
              placeholder="0.0"
            />
            <div className="flex items-center gap-3">
              <label className="text-xs font-semibold uppercase tracking-wide text-black/60">
                Unit
              </label>
              <select
                value={provideUnit}
                onChange={(event) =>
                  setProvideUnit(event.target.value as UnitChoice)
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
              disabled={provideDisabled}
              className="inline-flex w-full items-center justify-center rounded-full bg-black px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(0,0,0,0.24)] transition-opacity disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
            >
              {providePending ? "Processing…" : "Provide liquidity"}
            </button>
            {provideMessage ? (
              <p className="text-xs text-black/70">{provideMessage}</p>
            ) : null}
            {provideError ? (
              <p className="text-xs text-red-500">
                {provideError instanceof Error
                  ? provideError.message
                  : String(provideError)}
              </p>
            ) : null}
          </form>

          <form
            onSubmit={handleWithdrawSubmit}
            className="flex flex-col gap-4 rounded-xl border border-black/10 bg-black/[0.02] p-4"
          >
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium">Withdraw liquidity</span>
              <span className="text-xs text-black/60">
                Redeem your LP position back into lending tokens.
              </span>
            </div>
            <label className="text-xs font-semibold uppercase tracking-wide text-black/60">
              Amount
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={withdrawInput}
              onChange={(event) => setWithdrawInput(event.target.value)}
              className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm shadow-sm focus:border-black/40 focus:outline-none focus:ring-2 focus:ring-black/20"
              placeholder="0.0"
            />
            <div className="flex items-center gap-3">
              <label className="text-xs font-semibold uppercase tracking-wide text-black/60">
                Unit
              </label>
              <select
                value={withdrawUnit}
                onChange={(event) =>
                  setWithdrawUnit(event.target.value as UnitChoice)
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
              disabled={withdrawDisabled}
              className="inline-flex w-full items-center justify-center rounded-full bg-black px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(0,0,0,0.24)] transition-opacity disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
            >
              {withdrawPending ? "Processing…" : "Withdraw liquidity"}
            </button>
            {withdrawMessage ? (
              <p className="text-xs text-black/70">{withdrawMessage}</p>
            ) : null}
            {withdrawError ? (
              <p className="text-xs text-red-500">
                {withdrawError instanceof Error
                  ? withdrawError.message
                  : String(withdrawError)}
              </p>
            ) : null}
          </form>
        </div>

        <div className="grid gap-4 rounded-xl border border-black/10 bg-black/[0.02] p-4 sm:grid-cols-2">
          <div className="rounded-lg border border-dotted border-black/30 bg-white/70 px-4 py-3 text-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-black/60">
              Your supplied liquidity
            </p>
            <p className="text-lg font-semibold text-black">
              {formattedUserLiquidity}
            </p>
            {userLiquidityInfoMessage ? (
              <p className="mt-2 text-[11px] text-red-500">
                {userLiquidityInfoMessage}
              </p>
            ) : null}
          </div>
          <div className="rounded-lg border border-dotted border-black/30 bg-white/70 px-4 py-3 text-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-black/60">
              Wallet balance
            </p>
            <p className="text-lg font-semibold text-black">
              {formattedWalletBalance}
            </p>
            {walletInfoMessage ? (
              <p className="mt-2 text-[11px] text-red-500">
                {walletInfoMessage}
              </p>
            ) : null}
          </div>
          <div className="rounded-lg border border-dotted border-black/30 bg-white/70 px-4 py-3 text-sm sm:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-black/60">
              Pool liquidity (global)
            </p>
            <p className="text-lg font-semibold text-black">
              {formattedTotalLiquidity}
            </p>
            {totalLiquidityInfoMessage ? (
              <p className="mt-2 text-[11px] text-red-500">
                {totalLiquidityInfoMessage}
              </p>
            ) : null}
          </div>
        </div>
      </article>
    </div>
  );
}
