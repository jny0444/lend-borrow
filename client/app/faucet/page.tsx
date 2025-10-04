"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { parseUnits } from "viem";
import {
  useMintCollateralToken,
  useMintLendToken,
} from "@/utils/writeContract";
import FaucetCard from "@/components/FaucetCard";

const MAX_LOG_ENTRIES = 15;

export default function Faucet() {
  const {
    mintCollateralToken,
    hash: collateralHash,
    error: collateralError,
    isPending: collateralPending,
  } = useMintCollateralToken();

  const {
    mintLendToken,
    hash: lendHash,
    error: lendError,
    isPending: lendPending,
  } = useMintLendToken();

  const tokenAmount = useMemo(() => parseUnits("100", 18), []);

  const [collateralLogs, setCollateralLogs] = useState<string[]>([]);
  const [lendLogs, setLendLogs] = useState<string[]>([]);

  const collateralHashRef = useRef<string | null>(null);
  const collateralErrorRef = useRef<string | null>(null);
  const lendHashRef = useRef<string | null>(null);
  const lendErrorRef = useRef<string | null>(null);

  const appendCollateralLog = useCallback((message: string) => {
    setCollateralLogs((prev) => {
      const next = [...prev, message];
      return next.slice(-MAX_LOG_ENTRIES);
    });
  }, []);

  const appendLendLog = useCallback((message: string) => {
    setLendLogs((prev) => {
      const next = [...prev, message];
      return next.slice(-MAX_LOG_ENTRIES);
    });
  }, []);

  const handleCollateralMint = useCallback(async () => {
    appendCollateralLog("Initiating collateral mint for 100 tokens.");
    try {
      await mintCollateralToken(tokenAmount);
      appendCollateralLog("Collateral mint transaction broadcast.");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to mint collateral tokens.";
      appendCollateralLog(`Error: ${message}`);
      collateralErrorRef.current = message;
    }
  }, [appendCollateralLog, mintCollateralToken, tokenAmount]);

  const handleLendMint = useCallback(async () => {
    appendLendLog("Initiating lend mint for 100 tokens.");
    try {
      await mintLendToken(tokenAmount);
      appendLendLog("Lend mint transaction broadcast.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to mint lend tokens.";
      appendLendLog(`Error: ${message}`);
      lendErrorRef.current = message;
    }
  }, [appendLendLog, mintLendToken, tokenAmount]);

  useEffect(() => {
    if (collateralError) {
      const message =
        collateralError instanceof Error
          ? collateralError.message
          : "Failed to mint collateral tokens.";
      if (collateralErrorRef.current !== message) {
        collateralErrorRef.current = message;
        appendCollateralLog(`Error: ${message}`);
      }
    }
  }, [appendCollateralLog, collateralError]);

  useEffect(() => {
    if (collateralHash) {
      if (collateralHashRef.current !== collateralHash) {
        collateralHashRef.current = collateralHash;
        appendCollateralLog(`Transaction hash: ${collateralHash}`);
      }
    }
  }, [appendCollateralLog, collateralHash]);

  useEffect(() => {
    if (lendError) {
      const message =
        lendError instanceof Error
          ? lendError.message
          : "Failed to mint lending tokens.";
      if (lendErrorRef.current !== message) {
        lendErrorRef.current = message;
        appendLendLog(`Error: ${message}`);
      }
    }
  }, [appendLendLog, lendError]);

  useEffect(() => {
    if (lendHash) {
      if (lendHashRef.current !== lendHash) {
        lendHashRef.current = lendHash;
        appendLendLog(`Transaction hash: ${lendHash}`);
      }
    }
  }, [appendLendLog, lendHash]);

  return (
    <div className="container mx-auto flex max-w-4xl flex-col gap-8 p-6">
      <header className="space-y-2 text-black">
        <h1 className="text-4xl font-bold">Token faucet</h1>
        <p className="text-sm text-black">
          Claim test tokens for collateral and lending pools. Each faucet grants
          100 tokens per click.
        </p>
      </header>
      <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <FaucetCard
          title="Collateral token"
          description="Mint 100 collateral tokens to supply as borrower security."
          buttonLabel="100 Tokens"
          onClick={handleCollateralMint}
          pending={collateralPending}
          logs={collateralLogs}
          transactionHash={collateralHash ?? null}
          imageSrc="/collateral.png"
          imageAlt="Collateral token"
        />
        <FaucetCard
          title="Lend token"
          description="Mint 100 lending-side tokens to provide protocol liquidity."
          buttonLabel="100 Tokens"
          onClick={handleLendMint}
          pending={lendPending}
          logs={lendLogs}
          transactionHash={lendHash ?? null}
          imageSrc="/lend.png"
          imageAlt="Lend token"
        />
      </section>
    </div>
  );
}
