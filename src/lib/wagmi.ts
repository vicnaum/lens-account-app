// lib/wagmi.ts
import { http, createConfig } from "wagmi";
import { getDefaultConfig } from "connectkit"; // Correct import
import { lensChain } from "./constants";

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

if (!projectId) {
  throw new Error("NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not set in .env.local");
}

export const config = createConfig(
  // Use ConnectKit's getDefaultConfig
  getDefaultConfig({
    // Correct function name
    // Required API Keys
    walletConnectProjectId: projectId,

    // Required App Info
    appName: "Lens Account Interface",
    appDescription: "Interact with your Lens Account",
    appUrl: typeof window !== "undefined" ? window.location.origin : "https://example.com",
    appIcon: "/favicon.ico",

    // Chains to support
    chains: [lensChain],

    // Transports (ensure http is configured for your chain)
    transports: {
      [lensChain.id]: http(lensChain.rpcUrls.default.http[0]),
    },

    // ssr: true, // Keep commented unless SSR hydration with cookies is needed
  }),
);

// Optional: Register config for global type inference
// declare module 'wagmi' {
//   interface Register {
//     config: typeof config
//   }
// }
