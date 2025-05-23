"use client";

import { type Address } from "viem";
import { DocumentDuplicateIcon, QrCodeIcon, CheckIcon } from "@heroicons/react/24/outline";
import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/solid";
import { useState } from "react";
import { QrCodeModal } from "@/components/modals/QrCodeModal";

interface AccountIdentityPanelProps {
  username: string | null;
  address: Address;
}

export function AccountIdentityPanel({ username, address }: AccountIdentityPanelProps) {
  const [copied, setCopied] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      console.log("Address copied to clipboard:", address);
      // Reset icon after a short delay
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy address: ", err);
      alert("Failed to copy address."); // Simple error feedback
    }
  };

  const handleShowQr = () => {
    setIsQrModalOpen(true);
    console.log("Showing QR code modal for:", address);
  };

  const handleCloseQr = () => {
    setIsQrModalOpen(false);
  };

  const handleOpenExplorer = () => {
    window.open(`https://explorer.lens.xyz/address/${address}`, "_blank");
  };

  return (
    <div>
      {username && (
        <h2 className="text-2xl font-semibold text-gray-800 mb-1">
          Welcome, <span className="font-bold text-emerald-600">{username}</span>!
        </h2>
      )}
      <p className="text-sm text-gray-500 mb-4">Managing Lens Account:</p>
      <div className="flex items-center space-x-3 bg-slate-50 p-4 rounded-lg">
        <p className="text-base font-mono text-gray-800 break-all flex-1">{address}</p>
        <button
          onClick={handleOpenExplorer}
          title="View on Explorer"
          className="p-2 text-gray-500 hover:text-emerald-600 hover:bg-slate-200 rounded-lg transition-colors duration-150"
        >
          <ArrowTopRightOnSquareIcon className="w-5 h-5" />
        </button>
        <button
          onClick={handleCopy}
          title={copied ? "Copied!" : "Copy Address"}
          className={`p-2 rounded-lg transition-colors duration-150 ${
            copied ? "text-green-600 bg-green-100 hover:bg-green-200" : "text-gray-500 hover:text-emerald-600 hover:bg-slate-200"
          }`}
        >
          {copied ? <CheckIcon className="w-5 h-5" /> : <DocumentDuplicateIcon className="w-5 h-5" />}
        </button>
        <button
          onClick={handleShowQr}
          title="Show QR Code"
          className="p-2 text-gray-500 hover:text-emerald-600 hover:bg-slate-200 rounded-lg transition-colors duration-150"
        >
          <QrCodeIcon className="w-5 h-5" />
        </button>
      </div>

      {/* Render the QR modal */}
      <QrCodeModal address={address} isOpen={isQrModalOpen} onClose={handleCloseQr} />
    </div>
  );
}
