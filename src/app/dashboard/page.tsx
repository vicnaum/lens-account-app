// src/app/dashboard/page.tsx
"use client";

import { useLensAccount } from "@/contexts/LensAccountContext";
import { useAccount, useDisconnect } from "wagmi";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AccountDisplay } from "@/components/AccountDisplay";
import { WcConnect } from "@/components/WcConnect";
import { WcRequestDisplay } from "@/components/WcRequestDisplay"; // <<<--- IMPORTED

export default function Dashboard() {
  const { lensAccountAddress, ownerAddress, clearAccount } = useLensAccount();
  const { isConnected } = useAccount();
  const { disconnect: disconnectOwnerWallet } = useDisconnect();
  const router = useRouter();

  useEffect(() => {
    if (!isConnected || !lensAccountAddress || !ownerAddress) {
      console.log("Redirecting to home: not connected or missing context");
      if (!lensAccountAddress || !ownerAddress) {
        clearAccount();
      }
      router.replace("/");
    }
  }, [isConnected, lensAccountAddress, ownerAddress, router, clearAccount]);

  const handleLogout = () => {
    disconnectOwnerWallet();
    clearAccount();
    console.log("Logout initiated");
  };

  if (!isConnected || !lensAccountAddress || !ownerAddress) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p>Loading or redirecting...</p>
      </div>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center p-6 md:p-24">
      <div className="w-full max-w-4xl p-8 bg-white rounded-xl shadow-lg relative">
        <button
          onClick={handleLogout}
          className="absolute top-4 right-4 px-4 py-2 bg-red-500 text-white text-sm font-medium rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
        >
          {" "}
          Logout Owner{" "}
        </button>
        <h1 className="text-2xl font-bold mb-4 text-center">Dashboard</h1>
        <div className="space-y-6">
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
            <p className="text-sm font-medium text-gray-700">Connected Owner Wallet:</p>
            <p className="text-xs text-gray-600 break-words font-mono">{ownerAddress}</p>
          </div>
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm font-medium text-blue-800">Managing Lens Account:</p>
            <p className="text-xs text-blue-700 break-words font-mono">{lensAccountAddress}</p>
          </div>
          <AccountDisplay />
          <WcConnect />
          {/* --- Render the Request Display Component --- */}
          <WcRequestDisplay /> {/* <<<--- ADDED */}
          {/* ------------------------------------------- */}
        </div>
      </div>
    </main>
  );
}
