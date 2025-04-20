// app/dashboard/page.tsx
"use client";

import { useLensAccount } from "@/contexts/LensAccountContext"; // Import context hook
import { useAccount } from "wagmi";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Dashboard() {
  const { lensAccountAddress, ownerAddress } = useLensAccount();
  const { isConnected } = useAccount();
  const router = useRouter();

  // Basic protection: Redirect if not connected or context is missing
  useEffect(() => {
    if (!isConnected || !lensAccountAddress || !ownerAddress) {
      console.log("Redirecting to home: not connected or missing context");
      router.replace("/"); // Use replace to prevent back navigation to dashboard
    }
  }, [isConnected, lensAccountAddress, ownerAddress, router]);

  // Render placeholder content if authorized
  if (!isConnected || !lensAccountAddress || !ownerAddress) {
    // Render minimal content or null while redirecting
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center p-6 md:p-24">
      <div className="w-full max-w-4xl p-8 bg-white rounded-xl shadow-lg">
        <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
        <p className="mb-2">
          Connected Owner:{" "}
          <span className="font-mono text-sm">{ownerAddress}</span>
        </p>
        <p className="mb-6">
          Managing Lens Account:{" "}
          <span className="font-mono text-sm">{lensAccountAddress}</span>
        </p>

        {/* Placeholder for Stage 3 content (Balance Display) */}
        <div className="p-4 border rounded-md bg-gray-50">
          <p className="text-gray-600">
            Account balance and WalletConnect UI will appear here.
          </p>
        </div>

        {/* Placeholder for Stage 4 content (WC Connect) */}
        <div className="mt-6 p-4 border rounded-md bg-gray-50">
          <p className="text-gray-600">
            WalletConnect pairing section will appear here.
          </p>
        </div>

        {/* Placeholder for Stage 5 content (WC Requests) */}
        <div className="mt-6 p-4 border rounded-md bg-gray-50">
          <p className="text-gray-600">
            WalletConnect request display will appear here.
          </p>
        </div>
      </div>
    </main>
  );
}
