"use client";

import { RainbowKitProvider, lightTheme } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { config } from "@/wagmi";

const queryClient = new QueryClient();

const baseTheme = lightTheme({
  accentColor: "var(--prussian-blue)",
  accentColorForeground: "var(--color-white)",
  borderRadius: "medium",
});

const rainbowKitTheme = {
  ...baseTheme,
};

export function Provider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider modalSize="compact" theme={rainbowKitTheme}>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
