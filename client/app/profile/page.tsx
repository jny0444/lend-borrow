"use client";

import { useMemo } from "react";
import { useAccount } from "wagmi";
import { formatEther } from "viem";
import type { Address } from "viem";
import {
  getUserBalanceCollateralToken,
  getUserBalanceLendToken,
} from "@/utils/readContract";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as Address;

const formatTokenAmount = (value: unknown) => {
  if (typeof value !== "bigint") {
    return "--";
  }

  const formatted = formatEther(value);
  const [whole, fraction] = formatted.split(".");
  const trimmedFraction = fraction ? fraction.slice(0, 4) : "0000";

  return `${whole}.${trimmedFraction}`;
};

export default function Profile() {
  const { address, isConnected } = useAccount();
  const userAddress = (address ?? ZERO_ADDRESS) as Address;

  const {
    balance: collateralBalance,
    error: collateralError,
    isPending: collateralPending,
  } = getUserBalanceCollateralToken(userAddress);

  const {
    balance: lendBalance,
    error: lendError,
    isPending: lendPending,
  } = getUserBalanceLendToken(userAddress);

  const formattedCollateral = useMemo(
    () => formatTokenAmount(collateralBalance),
    [collateralBalance]
  );

  const formattedLend = useMemo(
    () => formatTokenAmount(lendBalance),
    [lendBalance]
  );

  const collateralStatus = collateralError
    ? collateralError instanceof Error
      ? collateralError.message
      : "Unable to load collateral balance."
    : collateralPending
    ? "Fetching collateral balance…"
    : null;

  const lendStatus = lendError
    ? lendError instanceof Error
      ? lendError.message
      : "Unable to load lending balance."
    : lendPending
    ? "Fetching lending balance…"
    : null;

  return (
    <div className="container mx-auto flex max-w-4xl flex-col gap-6 p-6">
      <header className="space-y-2 text-black">
        <h1 className="text-4xl font-bold">Profile</h1>
        <p className="text-sm text-black/70">
          View your zkLend wallet balances and lending positions.
        </p>
      </header>

      {!isConnected ? (
        <div className="rounded-xl border border-dashed border-black/20 bg-white/60 p-4 text-sm text-black/70">
          Connect your wallet to view live balances. Displayed values default to
          zero when no wallet is connected.
        </div>
      ) : null}

      <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <article className="flex h-full flex-col gap-4 rounded-2xl bg-white p-6 text-black shadow-md">
          <div>
            <h2 className="text-xl font-semibold">Collateral tokens</h2>
            <p className="text-sm text-black/60">
              Test collateral token balance in your connected wallet.
            </p>
          </div>
          <p className="text-3xl font-bold">{formattedCollateral}</p>
          <dl className="text-xs text-black/60">
            <dt className="sr-only">Token symbol</dt>
            <dd>Symbol: COLL</dd>
            <dt className="sr-only">Decimals</dt>
            <dd>Decimals: 18</dd>
          </dl>
          {collateralStatus ? (
            <p className="text-xs text-red-500">{collateralStatus}</p>
          ) : null}
        </article>

        <article className="flex h-full flex-col gap-4 rounded-2xl bg-white p-6 text-black shadow-md">
          <div>
            <h2 className="text-xl font-semibold">Lend tokens</h2>
            <p className="text-sm text-black/60">
              Lending-side token balance used for providing liquidity.
            </p>
          </div>
          <p className="text-3xl font-bold">{formattedLend}</p>
          <dl className="text-xs text-black/60">
            <dt className="sr-only">Token symbol</dt>
            <dd>Symbol: LEND</dd>
            <dt className="sr-only">Decimals</dt>
            <dd>Decimals: 18</dd>
          </dl>
          {lendStatus ? (
            <p className="text-xs text-red-500">{lendStatus}</p>
          ) : null}
        </article>
      </section>
    </div>
  );
}
