"use client";

import { DiscoveryForm } from "@/components/DiscoveryForm"; // Adjust path if needed
import { useState } from "react";

export default function Home() {
  // State type allows empty string
  const [lensAccountAddress, setLensAccountAddress] = useState<
    `0x${string}` | ""
  >("");

  const handleAccountFound = (address: `0x${string}` | "") => {
    console.log("Account Address Updated in Parent:", address);
    setLensAccountAddress(address);
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 md:p-24 bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      <div className="w-full max-w-lg p-8 space-y-6 bg-white rounded-xl shadow-lg">
        <h1 className="text-2xl font-bold text-center text-gray-800">
          Lens Account Interface
        </h1>
        <p className="text-center text-gray-600">
          Find your Lens Account by username or address.
        </p>

        {/* Pass the handler */}
        <DiscoveryForm onAccountAddressFound={handleAccountFound} />

        {/* Placeholder for Stage 2 - Connect Button will go here */}
        <div className="mt-6">
          {lensAccountAddress ? (
            <p className="text-center text-green-600">
              Account identified: {lensAccountAddress}
            </p>
          ) : (
            <p className="text-center text-gray-500">
              Enter username or address above.
            </p>
          )}
          {/* Connect Button will be added here in Stage 2 */}
        </div>
      </div>
    </main>
  );
}
