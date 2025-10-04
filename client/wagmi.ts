"use client";

import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { baseSepolia, Chain, mainnet } from "wagmi/chains";

const projectId = process.env.NEXT_PUBLIC_PROJECT_ID;

if (!projectId) {
  throw new Error("NEXT_PUBLIC_PROJECT_ID is not set.");
}

const anvil: Chain = {
  id: 31337,
  name: "Anvil",
  nativeCurrency: {
    decimals: 18,
    name: "Ether",
    symbol: "ETH",
  },
  rpcUrls: {
    default: { http: ["http://127.0.0.1:8545"] },
    public: { http: ["http://127.0.0.1:8545"] },
  },
  testnet: true,
};

export const config = getDefaultConfig({
  appName: "ZK Lend",
  projectId,
  chains: [mainnet, baseSepolia, anvil],
  // ssr: true,
});
