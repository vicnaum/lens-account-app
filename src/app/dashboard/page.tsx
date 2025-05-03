// src/app/dashboard/page.tsx
"use client";

import { useLensAccount } from "@/contexts/LensAccountContext";
import { useAccount, useDisconnect } from "wagmi";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AccountTokensDisplay } from "@/components/AccountTokensDisplay";
import { WcConnect } from "@/components/WcConnect";
import { WcRequestDisplay } from "@/components/WcRequestDisplay";
import { LOCAL_STORAGE_KEYS } from "@/lib/constants";
import { AccountIdentityPanel } from "@/components/dashboard/AccountIdentityPanel";
import { OwnerPanel } from "@/components/dashboard/OwnerPanel";
import { ArrowRightStartOnRectangleIcon } from "@heroicons/react/24/outline"; // For logout icon
import { useWalletConnect } from "@/contexts/WalletConnectProvider";

export default function Dashboard() {
  const { lensAccountAddress, ownerAddress, clearAccount } = useLensAccount();
  const { isConnected } = useAccount();
  const { disconnect: disconnectOwnerWallet } = useDisconnect();
  const router = useRouter();
  const [lensUsername, setLensUsername] = useState<string | null>(null);
  const { activeSessions } = useWalletConnect();

  const hasActiveSessions = Object.keys(activeSessions).length > 0;

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
    <main className="min-h-screen bg-gray-50 p-6 md:p-10 flex flex-col">
      {/* Header Area */}
      <div className="max-w-7xl mx-auto mb-8 flex justify-between items-center w-full">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 tracking-tight">Lens Account Dashboard</h1>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 shadow-sm transition-colors"
        >
          <ArrowRightStartOnRectangleIcon className="w-4 h-4 text-gray-500" />
          Logout
        </button>
      </div>

      {/* Main Grid for Panels */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
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
          <AccountTokensDisplay />
        </div>

        {/* Panel 4: WalletConnect Connect */}
        <div className="col-span-1 md:col-span-2 bg-white p-8 rounded-xl shadow-md">
          <WcConnect />
        </div>

        {/* Panel 5: WalletConnect Requests - Only show when sessions exist */}
        {hasActiveSessions && (
          <div className="col-span-1 md:col-span-2 bg-white p-0 rounded-xl shadow-md overflow-hidden">
            <WcRequestDisplay />
          </div>
        )}
      </div>

      {/* Footer with FKNG SOCIAL and GitHub links - Now part of the normal flow */}
      <div className="max-w-7xl w-full mx-auto mt-16 mb-8 flex flex-col items-center gap-8">
        {/* GitHub and future platform icons */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-gray-500">Contribute:</span>
          <a
            href="https://github.com/vicnaum/lens-account-app"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-gray-600 hover:text-emerald-600 transition-colors"
          >
            GitHub
          </a>
          {/* Space for additional platform icons */}
        </div>

        {/* FKNG SOCIAL branding */}
        <div className="flex flex-col items-center gap-1">
          <a
            href="https://fkng.social"
            target="_blank"
            rel="noopener noreferrer"
            className="block text-gray-500 hover:text-gray-600 transition-colors"
          >
            <img src="/FKNG.SOCIAL.svg" alt="FKNG.SOCIAL" className="h-5 w-auto" />
          </a>
          <p className="font-sans text-[11px] font-light text-gray-500">JOIN THE FKNG REVOLUTION</p>
        </div>
      </div>
    </main>
  );
}
