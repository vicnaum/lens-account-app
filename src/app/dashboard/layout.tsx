// src/app/dashboard/layout.tsx
"use client"; // Context providers require client components

import { WalletConnectProvider } from "@/contexts/WalletConnectProvider";

// This layout wraps the content of `/dashboard/page.tsx` and any other
// potential pages under the /dashboard route (e.g., /dashboard/settings).
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // We assume LensAccountProvider is already wrapping the RootLayout
  // in src/app/layout.tsx via src/app/providers.tsx.
  // Therefore, we only need to add the WalletConnectProvider here.
  return <WalletConnectProvider>{children}</WalletConnectProvider>;
}
