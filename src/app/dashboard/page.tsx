// src/app/dashboard/page.tsx
"use client";

import { useLensAccount } from "@/contexts/LensAccountContext";
import { useAccount, useDisconnect } from "wagmi";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AccountDisplay } from "@/components/AccountDisplay";
import { WcConnect } from "@/components/WcConnect";
import { WcRequestDisplay } from "@/components/WcRequestDisplay";
import { LOCAL_STORAGE_KEYS } from "@/lib/constants";
import { AccountIdentityPanel } from "@/components/dashboard/AccountIdentityPanel";
import { OwnerPanel } from "@/components/dashboard/OwnerPanel";

export default function Dashboard() {
  const { lensAccountAddress, ownerAddress, clearAccount } = useLensAccount();
  const { isConnected } = useAccount();
  const { disconnect: disconnectOwnerWallet } = useDisconnect();
  const router = useRouter();
  const [lensUsername, setLensUsername] = useState<string | null>(null);

  useEffect(() => {
    try {
      const storedUsername = localStorage.getItem(LOCAL_STORAGE_KEYS.LENS_USERNAME);
      setLensUsername(storedUsername);
    } catch (error) {
      console.error("Failed to read username from localStorage:", error);
    }
  }, []);

  useEffect(() => {
    if (!isConnected || !lensAccountAddress || !ownerAddress) {
      clearAccount();
      router.push("/");
    }
  }, [isConnected, lensAccountAddress, ownerAddress, router, clearAccount]);

  const handleLogout = () => {
    disconnectOwnerWallet();
    clearAccount();
    router.push("/");
  };

  if (!isConnected || !lensAccountAddress || !ownerAddress) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading or redirecting...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 p-4 md:p-8">
      {/* Header Area */}
      <div className="max-w-7xl mx-auto mb-6 flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">Lens Account Dashboard</h1>
        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 shadow-sm"
        >
          Logout
        </button>
      </div>

      {/* Main Grid for Panels */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Panel 1: Account Identity */}
        <div className="col-span-1 md:col-span-2 bg-white p-6 rounded-lg shadow">
          <AccountIdentityPanel username={lensUsername} address={lensAccountAddress} />
        </div>

        {/* Panel 2: Owner Info */}
        <div className="col-span-1 bg-white p-6 rounded-lg shadow">
          <OwnerPanel ownerAddress={ownerAddress} />
        </div>

        {/* Panel 3: Balances */}
        <div className="col-span-1 bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4 text-gray-700">Account Balances</h2>
          <AccountDisplay />
        </div>

        {/* Panel 4: WalletConnect Connect */}
        <div className="col-span-1 md:col-span-2 bg-white p-6 rounded-lg shadow">
          <WcConnect />
        </div>

        {/* Panel 5: WalletConnect Requests */}
        <div className="col-span-1 md:col-span-2 bg-white p-6 rounded-lg shadow">
          <WcRequestDisplay />
        </div>
      </div>
    </main>
  );
}
