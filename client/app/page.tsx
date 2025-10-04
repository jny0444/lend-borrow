"use client";

import { FormEvent, useState } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { formatEther } from "viem";
import type { Address } from "viem";
import {
  getTotalLiquidity,
  getUserCollateral,
  getUserLiquidity,
  getUserLoanCount,
} from "@/utils/readContract";
import { mintCollateralToken as useMintCollateralToken } from "@/utils/writeContract";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as Address;

function formatTokenAmount(value: unknown, symbol = "ETH") {
  if (typeof value !== "bigint") {
    return "--";
  }

  const formatted = formatEther(value);
  const [whole, fraction] = formatted.split(".");
  const trimmedFraction = fraction
    ? fraction.slice(0, 4).replace(/0+$/, "")
    : "";
  const display = trimmedFraction ? `${whole}.${trimmedFraction}` : whole;

  return `${display} ${symbol}`.trim();
}

function formatCount(value: unknown) {
  return typeof value === "bigint" ? value.toString() : "--";
}

function formatError(error: unknown) {
  if (!error) return undefined;
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return "Unexpected error";
  }
}

export default function Home() {
  const { address, isConnected } = useAccount();
  const userAddress = (address ?? ZERO_ADDRESS) as Address;
  const [mintAmount, setMintAmount] = useState("0");
  const [mintFeedback, setMintFeedback] = useState<string | null>(null);
  const [mintFormError, setMintFormError] = useState<string | null>(null);

  const {
    mintCollateralToken: executeMintCollateral,
    hash: mintHash,
    error: mintError,
    isPending: mintPending,
  } = useMintCollateralToken();

  const {
    balance,
    error: collateralError,
    isPending: collateralPending,
  } = getUserCollateral(userAddress);
  const {
    liquidity,
    error: liquidityError,
    isPending: liquidityPending,
  } = getUserLiquidity(userAddress);
  const {
    loanCount,
    error: loanCountError,
    isPending: loanCountPending,
  } = getUserLoanCount(userAddress);
  const {
    totalLiquidity,
    error: totalLiquidityError,
    isPending: totalLiquidityPending,
  } = getTotalLiquidity();

  const shortAddress = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : "Not connected";

  const summaryCards = [
    {
      label: "Your Collateral",
      value: formatTokenAmount(balance),
      pending: collateralPending,
      error: formatError(collateralError),
    },
    {
      label: "Your Liquidity",
      value: formatTokenAmount(liquidity),
      pending: liquidityPending,
      error: formatError(liquidityError),
    },
    {
      label: "Your Loan Count",
      value: formatCount(loanCount),
      pending: loanCountPending,
      error: formatError(loanCountError),
    },
  ];

  const protocolCards = [
    {
      label: "Total Liquidity",
      value: formatTokenAmount(totalLiquidity),
      pending: totalLiquidityPending,
      error: formatError(totalLiquidityError),
    },
  ];

  async function handleMintSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMintFormError(null);
    setMintFeedback(null);

    if (!isConnected) {
      setMintFormError("Connect your wallet before minting tokens.");
      return;
    }

    try {
      const trimmed = mintAmount.trim();
      if (!trimmed) {
        throw new Error("Enter an amount to mint.");
      }
      const parsed = BigInt(trimmed);
      if (parsed <= BigInt(0)) {
        throw new Error("Amount must be greater than zero.");
      }

      await executeMintCollateral(parsed);
      setMintFeedback(
        `Minted ${parsed.toString()} token${parsed === BigInt(1) ? "" : "s"}.`,
      );
      setMintAmount("0");
    } catch (caught) {
      if (caught instanceof Error) {
        setMintFormError(caught.message);
      } else {
        setMintFormError("Unable to process mint request.");
      }
    }
  }

  return (
    <main className="flex min-h-screen flex-col gap-10 p-6">
      <header className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold text-slate-900">
            ZK Lend Dashboard
          </h1>
          <p className="text-sm text-slate-600">
            {isConnected
              ? `Connected as ${shortAddress}`
              : "Connect your wallet to view personalized protocol data."}
          </p>
        </div>
        <ConnectButton />
      </header>

      <section className="space-y-4">
        <h2 className="text-xl font-medium text-slate-800">Your Account</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {summaryCards.map(({ label, value, pending, error }) => (
            <article
              key={label}
              className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
            >
              <p className="text-sm text-slate-500">{label}</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {!isConnected ? "--" : pending ? "Loading…" : value}
              </p>
              {error && isConnected ? (
                <p className="mt-2 text-xs text-red-500">{error}</p>
              ) : null}
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-medium text-slate-800">
          Protocol Overview
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          {protocolCards.map(({ label, value, pending, error }) => (
            <article
              key={label}
              className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
            >
              <p className="text-sm text-slate-500">{label}</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {pending ? "Loading…" : value}
              </p>
              {error ? (
                <p className="mt-2 text-xs text-red-500">{error}</p>
              ) : null}
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-medium text-slate-800">Mint Collateral Tokens</h2>
        <form
          onSubmit={handleMintSubmit}
          className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
        >
          <div>
            <label
              htmlFor="mint-amount"
              className="block text-sm font-medium text-slate-600"
            >
              Amount to Mint (whole tokens)
            </label>
            <input
              id="mint-amount"
              name="mint-amount"
              type="number"
              min="0"
              step="1"
              inputMode="numeric"
              value={mintAmount}
              onChange={(event) => setMintAmount(event.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring"
              placeholder="e.g. 100"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
            <button
              type="submit"
              disabled={mintPending || !isConnected}
              className="rounded-md bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {mintPending ? "Minting…" : "Mint Tokens"}
            </button>
            <span>
              {isConnected
                ? `Connected account: ${shortAddress}`
                : "Connect your wallet to mint."}
            </span>
          </div>

          {mintFormError ? (
            <p className="text-sm text-red-500">{mintFormError}</p>
          ) : null}

          {mintFeedback ? (
            <p className="text-sm text-green-600">{mintFeedback}</p>
          ) : null}

          {mintError ? (
            <p className="text-xs text-red-500">
              {formatError(mintError) ?? "Transaction failed."}
            </p>
          ) : null}

          {mintHash ? (
            <p className="break-all text-xs text-slate-500">
              Transaction hash: {mintHash}
            </p>
          ) : null}
        </form>
      </section>
    </main>
  );
}
