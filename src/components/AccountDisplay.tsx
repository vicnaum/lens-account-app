// components/AccountDisplay.tsx
"use client";

import React from "react";
import { useReadContract, useBalance } from "wagmi"; // Import useBalance
import { formatUnits, type BaseError, type Address } from "viem";
import { useLensAccount } from "@/contexts/LensAccountContext";
import {
  ERC20_ABI,
  WGHO_TOKEN_ADDRESS,
  LENS_CHAIN_ID,
  lensChain, // Import the chain definition
} from "@/lib/constants";

export function AccountDisplay() {
  const { lensAccountAddress } = useLensAccount();

  // Fetch native GHO balance
  const {
    data: nativeBalanceData,
    error: nativeBalanceError,
    isLoading: isLoadingNativeBalance,
  } = useBalance({
    address: lensAccountAddress as Address | undefined, // useBalance needs Address | undefined
    chainId: LENS_CHAIN_ID,
    query: {
      enabled: !!lensAccountAddress,
      // Enable watching for updates (refetches on new blocks)
      refetchInterval: 5000, // Optional: Adjust polling interval if needed
      refetchOnWindowFocus: true,
    },
  });

  // Fetch WGHO (ERC20) balance
  const {
    data: wghoBalanceData,
    error: wghoBalanceError,
    isLoading: isLoadingWghoBalance,
  } = useReadContract({
    address: WGHO_TOKEN_ADDRESS as Address, // Add type assertion if needed or ensure it's typed correctly in constants
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [lensAccountAddress!],
    chainId: LENS_CHAIN_ID,
    query: {
      enabled: !!lensAccountAddress,
      // Enable watching for updates (refetches on new blocks)
      refetchInterval: 5000, // Optional: Adjust polling interval if needed
      refetchOnWindowFocus: true,
    },
  });

  // Format balances safely
  const formattedNativeBalance =
    nativeBalanceData?.value !== undefined
      ? parseFloat(formatUnits(nativeBalanceData.value, lensChain.nativeCurrency.decimals)).toFixed(4)
      : "0.0000";

  const formattedWghoBalance =
    typeof wghoBalanceData === "bigint"
      ? parseFloat(formatUnits(wghoBalanceData, 18)).toFixed(4) // Assuming WGHO also has 18 decimals
      : "0.0000";

  const isLoading = isLoadingNativeBalance || isLoadingWghoBalance;

  return (
    <div className="p-4 border rounded-md bg-gray-50">
      <h2 className="text-lg font-semibold mb-3 text-gray-700">Account Balances</h2>
      {isLoading && <p className="text-gray-500 text-sm">Loading balances...</p>}

      {/* Native GHO Balance */}
      <div className="mb-2">
        {nativeBalanceError && !isLoadingNativeBalance && (
          <p className="text-red-600 text-sm">
            Error loading GHO balance: {(nativeBalanceError as BaseError).shortMessage || nativeBalanceError.message}
          </p>
        )}
        {!nativeBalanceError && !isLoadingNativeBalance && lensAccountAddress && (
          <p className="text-gray-800">
            <span className="font-medium">Native GHO:</span> <span className="font-mono text-lg">{formattedNativeBalance}</span>{" "}
            {lensChain.nativeCurrency.symbol}
          </p>
        )}
      </div>

      {/* WGHO Balance */}
      <div>
        {wghoBalanceError && !isLoadingWghoBalance && (
          <p className="text-red-600 text-sm">
            Error loading WGHO balance: {(wghoBalanceError as BaseError).shortMessage || wghoBalanceError.message}
          </p>
        )}
        {!wghoBalanceError && !isLoadingWghoBalance && lensAccountAddress && (
          <p className="text-gray-800">
            <span className="font-medium">WGHO Token:</span> <span className="font-mono text-lg">{formattedWghoBalance}</span> GHO
          </p>
        )}
      </div>

      {!lensAccountAddress && !isLoading && <p className="text-gray-500 text-sm mt-2">Cannot fetch balances without Lens Account address.</p>}
    </div>
  );
}
