// components/AccountDisplay.tsx
"use client";

import React from "react";
import { useReadContract } from "wagmi";
import { formatUnits, type BaseError } from "viem";
import { useLensAccount } from "@/contexts/LensAccountContext";
import { ERC20_ABI, WGHO_TOKEN_ADDRESS, LENS_CHAIN_ID } from "@/lib/constants";

export function AccountDisplay() {
  const { lensAccountAddress } = useLensAccount();

  const {
    data: balanceData,
    error: balanceError,
    isLoading: isLoadingBalance,
  } = useReadContract({
    address: WGHO_TOKEN_ADDRESS,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [lensAccountAddress!], // Pass lens account address as argument
    chainId: LENS_CHAIN_ID,
    query: {
      enabled: !!lensAccountAddress, // Only run query if lensAccountAddress exists
      // Optional: Refetch balance periodically or on window focus
      // refetchInterval: 10000, // Refetch every 10 seconds
      // refetchOnWindowFocus: true,
    },
  });

  const formattedBalance =
    typeof balanceData === "bigint"
      ? parseFloat(formatUnits(balanceData, 18)).toFixed(4) // Format with 18 decimals, show 4 decimal places
      : "0.0000";

  return (
    <div className="p-4 border rounded-md bg-gray-50">
      <h2 className="text-lg font-semibold mb-2 text-gray-700">
        Account Balance
      </h2>
      {isLoadingBalance && <p className="text-gray-500">Loading balance...</p>}
      {balanceError && (
        <p className="text-red-600">
          Error loading balance:{" "}
          {(balanceError as BaseError).shortMessage || balanceError.message}
        </p>
      )}
      {!isLoadingBalance && !balanceError && lensAccountAddress && (
        <p className="text-gray-800">
          <span className="font-medium">WGHO Balance:</span>{" "}
          <span className="font-mono text-lg">{formattedBalance}</span> GHO
        </p>
      )}
      {!lensAccountAddress && (
        <p className="text-gray-500">
          Cannot fetch balance without Lens Account address.
        </p>
      )}
    </div>
  );
}
