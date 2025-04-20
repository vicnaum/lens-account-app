// app/providers.tsx
"use client"; // Mark this as a Client Component

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { ConnectKitProvider } from "connectkit"; // Import ConnectKitProvider
import { config } from "@/lib/wagmi"; // Adjust path if needed
import React, { useState } from "react";

type Props = {
  children: React.ReactNode;
  // If using SSR with cookie storage in wagmi.ts, you'll add `initialState` here later
  // initialState: State | undefined,
};

export function Providers({ children /*, initialState*/ }: Props) {
  // Use useState to ensure QueryClient is only created once
  const [queryClient] = useState(() => new QueryClient());

  return (
    // Pass config to WagmiProvider
    // If using SSR hydration, pass initialState={initialState}
    <WagmiProvider config={config} /*initialState={initialState}*/>
      <QueryClientProvider client={queryClient}>
        {/* Wrap with ConnectKitProvider */}
        <ConnectKitProvider>{children}</ConnectKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
