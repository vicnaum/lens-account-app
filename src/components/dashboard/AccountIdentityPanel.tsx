"use client";

import { type Address } from "viem";
import { DocumentDuplicateIcon, QrCodeIcon } from "@heroicons/react/24/outline";

interface AccountIdentityPanelProps {
  username: string | null;
  address: Address;
}

export function AccountIdentityPanel({ username, address }: AccountIdentityPanelProps) {
  const handleCopy = () => {
    // Placeholder: Functionality to be added later
    console.log("Placeholder: Copy address to clipboard");
    alert("Copy functionality not yet implemented.");
  };

  const handleShowQr = () => {
    // Placeholder: Functionality to be added later
    console.log("Placeholder: Show QR code modal");
    alert("QR Code functionality not yet implemented.");
  };

  return (
    <div>
      {username && (
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          Welcome, <span className="text-indigo-600">{username}</span>!
        </h2>
      )}
      <p className="text-sm text-gray-500 mb-3">Managing Lens Account:</p>
      <div className="flex items-center space-x-4 bg-gray-50 p-3 rounded-md border border-gray-200">
        <p className="text-lg md:text-xl font-mono text-gray-700 break-all flex-1">{address}</p>
        <button
          onClick={handleCopy}
          title="Copy Address"
          className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-gray-200 rounded-md transition-colors duration-150"
        >
          <DocumentDuplicateIcon className="w-5 h-5" />
        </button>
        <button
          onClick={handleShowQr}
          title="Show QR Code"
          className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-gray-200 rounded-md transition-colors duration-150"
        >
          <QrCodeIcon className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
