// app/dashboard/page.tsx
"use client";

import { useLensAccount } from "@/contexts/LensAccountContext";
import { useAccount, useDisconnect } from "wagmi"; // Import useDisconnect
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Dashboard() {
  const { lensAccountAddress, ownerAddress, clearAccount } = useLensAccount(); // Get clearAccount
  const { isConnected } = useAccount();
  const { disconnect } = useDisconnect(); // Get disconnect function
  const router = useRouter();

  // Protection effect
  useEffect(() => {
    if (!isConnected || !lensAccountAddress || !ownerAddress) {
      console.log("Redirecting to home: not connected or missing context");
      // Ensure context is cleared if redirecting for missing context state
      if (!lensAccountAddress || !ownerAddress) {
        clearAccount();
      }
      router.replace("/");
    }
  }, [isConnected, lensAccountAddress, ownerAddress, router, clearAccount]); // Added clearAccount to dependencies

  // Handler for the logout button
  const handleLogout = () => {
    disconnect(); // Disconnect wagmi session
    clearAccount(); // Clear our custom context
    // The useEffect above will handle the redirect once isConnected becomes false
    console.log("Logout initiated");
  };

  // Conditional rendering while checking auth state or redirecting
  if (!isConnected || !lensAccountAddress || !ownerAddress) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p>Loading or redirecting...</p>
      </div>
    );
  }

  // Main dashboard content
  return (
    <main className="flex min-h-screen flex-col items-center p-6 md:p-24">
      <div className="w-full max-w-4xl p-8 bg-white rounded-xl shadow-lg relative">
        {" "}
        {/* Added relative positioning */}
        {/* Logout Button Top Right */}
        <button
          onClick={handleLogout}
          className="absolute top-4 right-4 px-4 py-2 bg-red-500 text-white text-sm font-medium rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
        >
          Logout Owner
        </button>
        <h1 className="text-2xl font-bold mb-4 text-center">Dashboard</h1>
        <div className="space-y-4">
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
            <p className="text-sm font-medium text-gray-700">
              Connected Owner Wallet:
            </p>
            <p className="text-xs text-gray-600 break-words font-mono">
              {ownerAddress}
            </p>
          </div>
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm font-medium text-blue-800">
              Managing Lens Account:
            </p>
            <p className="text-xs text-blue-700 break-words font-mono">
              {lensAccountAddress}
            </p>
          </div>

          {/* Placeholder for Stage 3 content (Balance Display) */}
          <div className="p-4 border rounded-md bg-gray-50">
            <p className="text-gray-600">
              Account balance will appear here (Stage 3).
            </p>
          </div>

          {/* Placeholder for Stage 4 content (WC Connect) */}
          <div className="mt-6 p-4 border rounded-md bg-gray-50">
            <p className="text-gray-600">
              WalletConnect pairing section will appear here (Stage 4).
            </p>
          </div>

          {/* Placeholder for Stage 5 content (WC Requests) */}
          <div className="mt-6 p-4 border rounded-md bg-gray-50">
            <p className="text-gray-600">
              WalletConnect request display will appear here (Stage 5).
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
