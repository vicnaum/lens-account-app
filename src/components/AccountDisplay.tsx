// components/AccountDisplay.tsx
"use client";

import React, { useState } from "react";
import { useReadContract, useBalance } from "wagmi";
import { formatUnits, type Address } from "viem";
import { useLensAccount } from "@/contexts/LensAccountContext";
import { ERC20_ABI, WGHO_TOKEN_ADDRESS, BONSAI_TOKEN_ADDRESS, LENS_CHAIN_ID, lensChain } from "@/lib/constants";
import { SendModal } from "@/components/modals/SendModal";
import { ApproveModal } from "@/components/modals/ApproveModal";
import { WrapModal } from "@/components/modals/WrapModal";
import { UnwrapModal } from "@/components/modals/UnwrapModal";

interface ActionButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

function ActionButton({ label, onClick, disabled = false }: ActionButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="ml-2 px-2 py-1 text-xs bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200 transition-colors disabled:opacity-50"
    >
      {label}
    </button>
  );
}

// Define Modal State Type
type ModalType = "send" | "approve" | "wrap" | "unwrap";
interface ModalState {
  type: ModalType | null;
  tokenSymbol: string;
  tokenAddress?: Address;
  decimals: number;
  balance?: bigint;
}

export function AccountDisplay() {
  const { lensAccountAddress } = useLensAccount();
  const [modalState, setModalState] = useState<ModalState>({
    type: null,
    tokenSymbol: "",
    decimals: 18,
  });

  // Native GHO Balance
  const { data: nativeBalanceData, isLoading: isLoadingNative } = useBalance({
    address: lensAccountAddress as Address | undefined,
    chainId: LENS_CHAIN_ID,
    query: {
      enabled: !!lensAccountAddress,
      refetchInterval: 5000,
      refetchOnWindowFocus: true,
    },
  });

  // WGHO Balance
  const { data: wghoBalanceData, isLoading: isLoadingWgho } = useReadContract({
    address: WGHO_TOKEN_ADDRESS,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: lensAccountAddress ? [lensAccountAddress] : undefined,
    chainId: LENS_CHAIN_ID,
    query: {
      enabled: !!lensAccountAddress,
      refetchInterval: 5000,
      refetchOnWindowFocus: true,
    },
  });

  // BONSAI Balance
  const { data: bonsaiBalanceData, isLoading: isLoadingBonsai } = useReadContract({
    address: BONSAI_TOKEN_ADDRESS,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: lensAccountAddress ? [lensAccountAddress] : undefined,
    chainId: LENS_CHAIN_ID,
    query: {
      enabled: !!lensAccountAddress,
      refetchInterval: 5000,
      refetchOnWindowFocus: true,
    },
  });

  const isLoadingBalances = isLoadingNative || isLoadingWgho || isLoadingBonsai;

  // Format balances for display
  const formattedNativeBalance = nativeBalanceData ? formatUnits(nativeBalanceData.value, nativeBalanceData.decimals) : "0";
  const formattedWghoBalance = wghoBalanceData ? formatUnits(wghoBalanceData, 18) : "0";
  const formattedBonsaiBalance = bonsaiBalanceData ? formatUnits(bonsaiBalanceData, 18) : "0";

  const handleActionClick = (actionType: ModalType, symbol: string, address?: Address, decimals = 18, balance?: bigint) => {
    console.log(`Opening ${actionType} modal for ${symbol}`, { address, decimals, balance });
    setModalState({ type: actionType, tokenSymbol: symbol, tokenAddress: address, decimals, balance });
  };

  const closeModal = () => {
    setModalState({ type: null, tokenSymbol: "", decimals: 18 });
  };

  if (!lensAccountAddress) {
    return <p className="text-gray-500">Connect your wallet to view account balances.</p>;
  }

  return (
    <div className="space-y-4">
      {isLoadingBalances && <p className="text-gray-500 text-sm">Loading balances...</p>}

      {/* Native GHO Row */}
      <div className="flex items-center justify-between border-b pb-2">
        <div>
          <h3 className="text-lg font-medium text-gray-900">{lensChain.nativeCurrency.symbol}</h3>
          <p className="text-gray-500">{formattedNativeBalance}</p>
        </div>
        <div className="flex gap-2">
          <ActionButton
            label="Wrap"
            onClick={() =>
              handleActionClick("wrap", lensChain.nativeCurrency.symbol, undefined, lensChain.nativeCurrency.decimals, nativeBalanceData?.value)
            }
          />
          <ActionButton
            label="Send"
            onClick={() =>
              handleActionClick("send", lensChain.nativeCurrency.symbol, undefined, lensChain.nativeCurrency.decimals, nativeBalanceData?.value)
            }
          />
        </div>
      </div>

      {/* WGHO Row */}
      <div className="flex items-center justify-between border-b pb-2">
        <div>
          <h3 className="text-lg font-medium text-gray-900">WGHO</h3>
          <p className="text-gray-500">{formattedWghoBalance}</p>
        </div>
        <div className="flex gap-2">
          <ActionButton label="Unwrap" onClick={() => handleActionClick("unwrap", "WGHO", WGHO_TOKEN_ADDRESS as Address, 18, wghoBalanceData)} />
          <ActionButton label="Approve" onClick={() => handleActionClick("approve", "WGHO", WGHO_TOKEN_ADDRESS as Address, 18, wghoBalanceData)} />
          <ActionButton label="Send" onClick={() => handleActionClick("send", "WGHO", WGHO_TOKEN_ADDRESS as Address, 18, wghoBalanceData)} />
        </div>
      </div>

      {/* BONSAI Row */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">BONSAI</h3>
          <p className="text-gray-500">{formattedBonsaiBalance}</p>
        </div>
        <div className="flex gap-2">
          <ActionButton
            label="Approve"
            onClick={() => handleActionClick("approve", "BONSAI", BONSAI_TOKEN_ADDRESS as Address, 18, bonsaiBalanceData)}
          />
          <ActionButton label="Send" onClick={() => handleActionClick("send", "BONSAI", BONSAI_TOKEN_ADDRESS as Address, 18, bonsaiBalanceData)} />
        </div>
      </div>

      {/* Render Modals */}
      {modalState.type === "send" && (
        <SendModal
          isOpen={true}
          onClose={closeModal}
          tokenSymbol={modalState.tokenSymbol}
          tokenAddress={modalState.tokenAddress}
          decimals={modalState.decimals}
          balance={modalState.balance}
        />
      )}
      {modalState.type === "approve" && modalState.tokenAddress && (
        <ApproveModal
          isOpen={true}
          onClose={closeModal}
          tokenSymbol={modalState.tokenSymbol}
          tokenAddress={modalState.tokenAddress}
          decimals={modalState.decimals}
        />
      )}
      {modalState.type === "wrap" && <WrapModal isOpen={true} onClose={closeModal} balance={modalState.balance} />}
      {modalState.type === "unwrap" && <UnwrapModal isOpen={true} onClose={closeModal} balance={modalState.balance} />}
    </div>
  );
}
