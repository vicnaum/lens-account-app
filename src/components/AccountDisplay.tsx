// components/AccountDisplay.tsx
"use client";

import React from "react";
import { useReadContract, useBalance } from "wagmi";
import { formatUnits, type BaseError, type Address } from "viem";
import { useLensAccount } from "@/contexts/LensAccountContext";
import { ERC20_ABI, WGHO_TOKEN_ADDRESS, BONSAI_TOKEN_ADDRESS, LENS_CHAIN_ID, lensChain } from "@/lib/constants";

// Placeholder button component
const ActionButton = ({ label, onClick }: { label: string; onClick: () => void }) => (
  <button
    onClick={onClick}
    className="ml-2 px-2 py-1 text-xs bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200 transition-colors disabled:opacity-50"
  >
    {label}
  </button>
);

export function AccountDisplay() {
  const { lensAccountAddress } = useLensAccount();

  // Native GHO Balance Fetching
  const {
    data: nativeBalanceData,
    error: nativeBalanceError,
    isLoading: isLoadingNativeBalance,
  } = useBalance({
    address: lensAccountAddress as Address | undefined,
    chainId: LENS_CHAIN_ID,
    query: {
      enabled: !!lensAccountAddress,
      refetchInterval: 5000,
      refetchOnWindowFocus: true,
    },
  });

  // WGHO (ERC20) Balance Fetching
  const {
    data: wghoBalanceData,
    error: wghoBalanceError,
    isLoading: isLoadingWghoBalance,
  } = useReadContract({
    address: WGHO_TOKEN_ADDRESS as Address,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [lensAccountAddress!],
    chainId: LENS_CHAIN_ID,
    query: {
      enabled: !!lensAccountAddress,
      refetchInterval: 5000,
      refetchOnWindowFocus: true,
    },
  });

  // BONSAI Balance Fetching
  const {
    data: bonsaiBalanceData,
    error: bonsaiBalanceError,
    isLoading: isLoadingBonsaiBalance,
  } = useReadContract({
    address: BONSAI_TOKEN_ADDRESS as Address,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [lensAccountAddress!],
    chainId: LENS_CHAIN_ID,
    query: {
      enabled: !!lensAccountAddress,
      refetchInterval: 5000,
      refetchOnWindowFocus: true,
    },
  });

  // Format balances
  const formattedNativeBalance =
    nativeBalanceData?.value !== undefined
      ? parseFloat(formatUnits(nativeBalanceData.value, lensChain.nativeCurrency.decimals)).toFixed(4)
      : "0.0000";
  const formattedWghoBalance = typeof wghoBalanceData === "bigint" ? parseFloat(formatUnits(wghoBalanceData, 18)).toFixed(4) : "0.0000";
  const formattedBonsaiBalance = typeof bonsaiBalanceData === "bigint" ? parseFloat(formatUnits(bonsaiBalanceData, 18)).toFixed(4) : "0.0000";

  const isLoading = isLoadingNativeBalance || isLoadingWghoBalance || isLoadingBonsaiBalance;

  const handleActionClick = (action: string, token: string) => {
    console.log(`Placeholder: Clicked ${action} for ${token}`);
    alert(`${action} functionality for ${token} not yet implemented.`);
  };

  return (
    <div className="space-y-4">
      {isLoading && <p className="text-gray-500 text-sm">Loading balances...</p>}

      {/* Native GHO Row */}
      <div className="flex items-center justify-between border-b pb-2">
        <div>
          <p className="text-gray-800">
            <span className="font-medium">Native GHO:</span> <span className="font-mono text-lg">{formattedNativeBalance}</span>{" "}
            {lensChain.nativeCurrency.symbol}
          </p>
          {nativeBalanceError && !isLoadingNativeBalance && <p className="text-red-600 text-xs mt-1">Error loading balance</p>}
        </div>
        <div className="flex gap-2">
          <ActionButton label="Wrap" onClick={() => handleActionClick("Wrap", "GHO")} />
          <ActionButton label="Send" onClick={() => handleActionClick("Send", "GHO")} />
        </div>
      </div>

      {/* WGHO Row */}
      <div className="flex items-center justify-between border-b pb-2">
        <div>
          <p className="text-gray-800">
            <span className="font-medium">WGHO Token:</span> <span className="font-mono text-lg">{formattedWghoBalance}</span> GHO
          </p>
          {wghoBalanceError && !isLoadingWghoBalance && <p className="text-red-600 text-xs mt-1">Error loading balance</p>}
        </div>
        <div className="flex gap-2">
          <ActionButton label="Unwrap" onClick={() => handleActionClick("Unwrap", "WGHO")} />
          <ActionButton label="Approve" onClick={() => handleActionClick("Approve", "WGHO")} />
          <ActionButton label="Send" onClick={() => handleActionClick("Send", "WGHO")} />
        </div>
      </div>

      {/* BONSAI Row */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-800">
            <span className="font-medium">BONSAI Token:</span> <span className="font-mono text-lg">{formattedBonsaiBalance}</span> BONSAI
          </p>
          {bonsaiBalanceError && !isLoadingBonsaiBalance && <p className="text-red-600 text-xs mt-1">Error loading balance</p>}
        </div>
        <div className="flex gap-2">
          <ActionButton label="Approve" onClick={() => handleActionClick("Approve", "BONSAI")} />
          <ActionButton label="Send" onClick={() => handleActionClick("Send", "BONSAI")} />
        </div>
      </div>

      {!lensAccountAddress && !isLoading && <p className="text-gray-500 text-sm mt-2">Cannot fetch balances without Lens Account address.</p>}
    </div>
  );
}
