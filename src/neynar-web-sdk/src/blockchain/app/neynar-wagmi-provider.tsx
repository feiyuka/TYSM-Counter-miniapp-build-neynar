import { ReactNode } from "react";
import {
  WagmiProvider as WagmiProviderInner,
  createConfig,
  type CreateConnectorFn,
  http,
  type Transport,
} from "wagmi";
import { farcasterMiniApp } from "@farcaster/miniapp-wagmi-connector";
import { baseAccount } from "wagmi/connectors";
import type { Chain } from "viem";
import {
  type SupportedChainName,
  farcasterSupportedChainsByName,
} from "../types";

type NeynarWagmiProviderProps = {
  children: ReactNode;
  chains?: [SupportedChainName, ...SupportedChainName[]];
  connectors?: Array<CreateConnectorFn>;
};

/**
 * Wagmi provider — dual compatible: Farcaster/Warpcast + Base App.
 *
 * Connectors:
 * - farcasterMiniApp(): wallet in Warpcast / Farcaster mini app context
 * - baseAccount(): Base App standard web wallet (Base App migration April 9, 2026)
 *
 * Per Base App migration docs:
 * - Use wagmi + viem for all wallet interactions
 * - baseAccount() is the correct connector for Base App
 * - farcasterMiniApp() kept for Warpcast backward compatibility
 */
export function NeynarWagmiProvider({
  children,
  chains: chainNames = ["base", "mainnet"],
  connectors = [
    farcasterMiniApp(),             // Warpcast / Farcaster mini app
    baseAccount({ appName: "TYSM Counter" }), // Base App standard web wallet
  ],
}: NeynarWagmiProviderProps) {
  const chains = chainNames.map(
    (chainName) => farcasterSupportedChainsByName[chainName].chain as Chain,
  ) as [Chain, ...Chain[]];

  const transports = chains.reduce(
    (acc, chain) => ({ ...acc, [chain.id]: http() }),
    {} as Record<number, Transport>,
  );

  const config = createConfig({ chains, transports, connectors, ssr: true });

  return <WagmiProviderInner config={config}>{children}</WagmiProviderInner>;
}
