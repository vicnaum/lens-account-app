// components/AccountTokensDisplay.tsx
"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useReadContract, useBalance } from "wagmi";
import { formatUnits, type Address } from "viem";
import { useLensAccount } from "@/contexts/LensAccountContext";
import { ERC20_ABI, WGHO_TOKEN_ADDRESS, BONSAI_TOKEN_ADDRESS, LENS_CHAIN_ID, lensChain } from "@/lib/constants";
import { SendModal } from "@/components/modals/SendModal";
import { ApproveModal } from "@/components/modals/ApproveModal";
import { WrapModal } from "@/components/modals/WrapModal";
import { UnwrapModal } from "@/components/modals/UnwrapModal";

// Import necessary icons from Heroicons
import { PaperAirplaneIcon, CircleStackIcon, ArrowDownOnSquareIcon, ArrowUpOnSquareIcon } from "@heroicons/react/24/outline";

// Define color variants for buttons
type ButtonVariant = "green" | "yellow" | "blue" | "purple" | "default";

// Update ActionButtonProps to include an optional icon and variant
interface ActionButtonProps {
  label: string;
  icon: React.ElementType;
  onClick: () => void;
  disabled?: boolean;
  variant?: ButtonVariant;
}

// Modify ActionButton component for icon-top layout with color variants
function ActionButton({ label, icon: Icon, onClick, disabled = false, variant = "default" }: ActionButtonProps) {
  // Define color classes based on variant
  const getColorClasses = (): {
    bg: string;
    hoverBg: string;
    iconColor: string;
    textColor: string;
    border: string;
    shadow: string;
  } => {
    switch (variant) {
      case "green":
        return {
          bg: "bg-emerald-50",
          hoverBg: "bg-emerald-100",
          iconColor: "text-emerald-500 group-hover:text-emerald-600",
          textColor: "text-emerald-700 group-hover:text-emerald-800",
          border: "group-hover:border-emerald-300",
          shadow: "group-hover:shadow-emerald-200",
        };
      case "yellow":
        return {
          bg: "bg-amber-50",
          hoverBg: "bg-amber-100",
          iconColor: "text-amber-500 group-hover:text-amber-600",
          textColor: "text-amber-700 group-hover:text-amber-800",
          border: "group-hover:border-amber-300",
          shadow: "group-hover:shadow-amber-200",
        };
      case "blue":
        return {
          bg: "bg-blue-50",
          hoverBg: "bg-blue-100",
          iconColor: "text-blue-500 group-hover:text-blue-600",
          textColor: "text-blue-700 group-hover:text-blue-800",
          border: "group-hover:border-blue-300",
          shadow: "group-hover:shadow-blue-200",
        };
      case "purple":
        return {
          bg: "bg-purple-50",
          hoverBg: "bg-purple-100",
          iconColor: "text-purple-500 group-hover:text-purple-600",
          textColor: "text-purple-700 group-hover:text-purple-800",
          border: "group-hover:border-purple-300",
          shadow: "group-hover:shadow-purple-200",
        };
      default:
        return {
          bg: "bg-slate-50",
          hoverBg: "bg-slate-100",
          iconColor: "text-slate-500 group-hover:text-indigo-600",
          textColor: "text-slate-700 group-hover:text-indigo-700",
          border: "group-hover:border-slate-300",
          shadow: "group-hover:shadow-slate-200",
        };
    }
  };

  const colors = getColorClasses();

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        flex flex-col items-center justify-center p-2 
        text-center rounded-lg w-[70px] h-[60px] 
        ${colors.bg} hover:${colors.hoverBg} 
        border border-transparent ${colors.border}
        shadow-sm ${colors.shadow}
        transform hover:scale-105
        transition-all duration-150 ease-in-out
        disabled:opacity-50 disabled:cursor-not-allowed 
        disabled:hover:scale-100 disabled:hover:shadow-none
        disabled:hover:bg-slate-50 disabled:hover:border-transparent
        group
      `}
    >
      <Icon className={`w-5 h-5 mb-1 ${colors.iconColor} transition-colors`} />
      <span className={`text-[11px] font-medium ${colors.textColor} transition-colors`}>{label}</span>
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

export function AccountTokensDisplay() {
  const { lensAccountAddress } = useLensAccount();
  const [modalState, setModalState] = useState<ModalState>({
    type: null,
    tokenSymbol: "",
    decimals: 18,
  });

  const { data: nativeBalanceData, isLoading: isLoadingNative } = useBalance({
    address: lensAccountAddress as Address | undefined,
    chainId: LENS_CHAIN_ID,
    query: {
      enabled: !!lensAccountAddress,
      refetchInterval: 5000,
      refetchOnWindowFocus: true,
    },
  });

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

      {/* --- Native GHO Row --- */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Image src="/tokens/gho.svg" alt="GHO icon" width={40} height={40} className="rounded-full" unoptimized />
          <div className="flex items-baseline">
            <p className="text-2xl font-bold text-gray-900 leading-tight">{formattedNativeBalance}</p>
            <p className="text-2xl font-bold text-gray-400 leading-tight ml-2">{lensChain.nativeCurrency.symbol}</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <ActionButton
            label="Wrap"
            icon={ArrowDownOnSquareIcon}
            variant="purple"
            onClick={() =>
              handleActionClick("wrap", lensChain.nativeCurrency.symbol, undefined, lensChain.nativeCurrency.decimals, nativeBalanceData?.value)
            }
          />
          <ActionButton
            label="Send"
            icon={PaperAirplaneIcon}
            variant="green"
            onClick={() =>
              handleActionClick("send", lensChain.nativeCurrency.symbol, undefined, lensChain.nativeCurrency.decimals, nativeBalanceData?.value)
            }
          />
        </div>
      </div>

      {/* --- WGHO Row --- */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Image src="/tokens/wgho.svg" alt="WGHO icon" width={40} height={40} className="rounded-full" unoptimized />
          <div className="flex items-baseline">
            <p className="text-2xl font-bold text-gray-900 leading-tight">{formattedWghoBalance}</p>
            <p className="text-2xl font-bold text-gray-400 leading-tight ml-2">WGHO</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <ActionButton
            label="Unwrap"
            icon={ArrowUpOnSquareIcon}
            variant="blue"
            onClick={() => handleActionClick("unwrap", "WGHO", WGHO_TOKEN_ADDRESS as Address, 18, wghoBalanceData)}
          />
          <ActionButton
            label="Approve"
            icon={CircleStackIcon}
            variant="yellow"
            onClick={() => handleActionClick("approve", "WGHO", WGHO_TOKEN_ADDRESS as Address, 18, wghoBalanceData)}
          />
          <ActionButton
            label="Send"
            icon={PaperAirplaneIcon}
            variant="green"
            onClick={() => handleActionClick("send", "WGHO", WGHO_TOKEN_ADDRESS as Address, 18, wghoBalanceData)}
          />
        </div>
      </div>

      {/* --- BONSAI Row --- */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Image src="/tokens/bonsai.svg" alt="BONSAI icon" width={40} height={40} className="rounded-full object-cover" unoptimized />
          <div className="flex items-baseline">
            <p className="text-2xl font-bold text-gray-900 leading-tight">{formattedBonsaiBalance}</p>
            <p className="text-2xl font-bold text-gray-400 leading-tight ml-2">BONSAI</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <ActionButton
            label="Approve"
            icon={CircleStackIcon}
            variant="yellow"
            onClick={() => handleActionClick("approve", "BONSAI", BONSAI_TOKEN_ADDRESS as Address, 18, bonsaiBalanceData)}
          />
          <ActionButton
            label="Send"
            icon={PaperAirplaneIcon}
            variant="green"
            onClick={() => handleActionClick("send", "BONSAI", BONSAI_TOKEN_ADDRESS as Address, 18, bonsaiBalanceData)}
          />
        </div>
      </div>

      {/* --- Render Modals (remain the same) --- */}
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
