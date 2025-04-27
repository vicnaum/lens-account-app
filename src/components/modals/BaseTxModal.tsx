"use client";

import React, { ReactNode, useEffect, useState } from "react";
import { XMarkIcon, ExclamationTriangleIcon, CheckCircleIcon, ArrowPathIcon } from "@heroicons/react/24/solid";
import { type Hash } from "viem";

interface BaseTxModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode; // Content specific to the modal type
  isLoading: boolean;
  isSuccess: boolean;
  error: Error | null;
  txHash?: Hash | null; // Optional transaction hash
  disableClose?: boolean; // Optional: prevent closing during transaction
}

export function BaseTxModal({ isOpen, onClose, title, children, isLoading, isSuccess, error, txHash, disableClose = false }: BaseTxModalProps) {
  if (!isOpen) return null;

  const [countdown, setCountdown] = useState(5);

  // Auto-close after success
  useEffect(() => {
    if (isSuccess) {
      const timer = setTimeout(() => {
        onClose();
      }, 5000); // 5 seconds
      return () => clearTimeout(timer);
    }
  }, [isSuccess, onClose]);

  // Countdown effect
  useEffect(() => {
    if (isSuccess && countdown > 0) {
      const interval = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isSuccess, countdown]);

  // Reset countdown when modal opens/closes
  useEffect(() => {
    setCountdown(5);
  }, [isOpen]);

  const handleClose = () => {
    if (!disableClose && !isLoading) {
      onClose();
    }
  };

  let statusMessage = null;
  if (isLoading) {
    statusMessage = (
      <div className="flex items-center justify-center text-indigo-600 text-sm mt-3 p-2 bg-indigo-50 rounded">
        <ArrowPathIcon className="w-4 h-4 mr-1 animate-spin" />
        Processing transaction... Check your wallet.
      </div>
    );
  } else if (isSuccess) {
    statusMessage = (
      <div className="flex items-center justify-center text-green-600 text-sm mt-3 p-2 bg-green-50 rounded">
        <CheckCircleIcon className="w-4 h-4 mr-1" />
        Transaction successful!
        {txHash && (
          <a
            href={`https://explorer.lens.xyz/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-1 underline hover:text-green-800"
          >
            View on Explorer
          </a>
        )}
        <span className="ml-2 text-gray-500">(Closing in {countdown}s)</span>
      </div>
    );
  } else if (error) {
    statusMessage = (
      <div className="flex items-center justify-center text-red-600 text-sm mt-3 p-2 bg-red-50 rounded">
        <ExclamationTriangleIcon className="w-4 h-4 mr-1" />
        Error: {error.message?.split("(")?.[0]?.trim() || "Unknown error"} {/* Show concise error with fallback */}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-black/50 flex items-center justify-center z-50" onClick={handleClose}>
      <div className="bg-white p-6 rounded-lg shadow-xl relative max-w-lg w-full mx-4" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={handleClose}
          disabled={disableClose || isLoading}
          className={`absolute top-3 right-3 ${disableClose || isLoading ? "text-gray-300 cursor-not-allowed" : "text-gray-400 hover:text-gray-600"}`}
          aria-label="Close modal"
        >
          <XMarkIcon className="w-6 h-6" />
        </button>

        <h3 className="text-xl font-semibold mb-4 text-gray-800 pr-8">{title}</h3>

        {/* Modal specific content */}
        <div className="space-y-4">{children}</div>

        {/* Status Message Area */}
        <div className="min-h-[40px] mt-4">{statusMessage}</div>
      </div>
    </div>
  );
}
