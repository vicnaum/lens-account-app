"use client";

import React from "react";
import { QRCodeSVG } from "qrcode.react";
import { type Address } from "viem";
import { XMarkIcon } from "@heroicons/react/24/solid";

interface QrCodeModalProps {
  address: Address;
  isOpen: boolean;
  onClose: () => void;
}

export function QrCodeModal({ address, isOpen, onClose }: QrCodeModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose} // Close on backdrop click
    >
      <div
        className="bg-white p-6 rounded-lg shadow-xl relative max-w-sm w-full text-center"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal
      >
        <button onClick={onClose} className="absolute top-2 right-2 text-gray-500 hover:text-gray-800" aria-label="Close modal">
          <XMarkIcon className="w-6 h-6" />
        </button>
        <h3 className="text-lg font-medium mb-4 text-gray-800">Receive Funds</h3>
        <p className="text-sm text-gray-600 mb-4 break-all">Scan this QR code or copy the address below.</p>
        <div className="flex justify-center mb-4">
          <QRCodeSVG value={address} size={192} level="H" includeMargin={true} />
        </div>
        <p className="text-xs font-mono bg-gray-100 p-2 rounded border break-all">{address}</p>
      </div>
    </div>
  );
}
