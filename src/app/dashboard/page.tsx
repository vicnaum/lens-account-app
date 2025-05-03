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
import { ArrowRightStartOnRectangleIcon } from "@heroicons/react/24/outline"; // For logout icon

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
    // Clear localStorage on explicit logout
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEYS.LENS_ACCOUNT_ADDRESS);
      localStorage.removeItem(LOCAL_STORAGE_KEYS.EXPECTED_OWNER_ADDRESS);
      localStorage.removeItem(LOCAL_STORAGE_KEYS.LENS_USERNAME);
      console.log("Cleared localStorage on logout.");
    } catch (error) {
      console.error("Failed to clear localStorage on logout:", error);
    }
    router.push("/");
  };

  if (!isConnected || !lensAccountAddress || !ownerAddress) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Loading or redirecting...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6 md:p-10">
      {/* Header Area */}
      <div className="max-w-7xl mx-auto mb-8 flex justify-between items-center">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 tracking-tight">Lens Account Dashboard</h1>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 shadow-sm transition-colors"
        >
          <ArrowRightStartOnRectangleIcon className="w-4 h-4 text-gray-500" />
          Logout
        </button>
      </div>

      {/* Main Grid for Panels */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Panel 1: Account Identity */}
        <div className="col-span-1 md:col-span-2 bg-white p-8 rounded-xl shadow-md">
          <AccountIdentityPanel username={lensUsername} address={lensAccountAddress} />
        </div>

        {/* Panel 2: Owner Info */}
        <div className="col-span-1 bg-white p-8 rounded-xl shadow-md">
          <OwnerPanel ownerAddress={ownerAddress} />
        </div>

        {/* Panel 3: Balances */}
        <div className="col-span-1 bg-white p-8 rounded-xl shadow-md">
          <h2 className="text-xl font-semibold mb-6 text-gray-800">Account Balances</h2>
          <AccountDisplay />
        </div>

        {/* Panel 4: WalletConnect Connect */}
        <div className="col-span-1 md:col-span-2 bg-white p-8 rounded-xl shadow-md">
          <WcConnect />
        </div>

        {/* Panel 5: WalletConnect Requests */}
        <div className="col-span-1 md:col-span-2 bg-white p-0 rounded-xl shadow-md overflow-hidden">
          {" "}
          {/* Use padding within component */}
          <WcRequestDisplay />
        </div>
      </div>
    </main>
  );
}
