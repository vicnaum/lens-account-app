// src/components/WcRequestDisplay.tsx
"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useWalletConnect } from "@/contexts/WalletConnectProvider";
import { useLensAccount } from "@/contexts/LensAccountContext";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { formatUnits, type Hash } from "viem";
import { getSdkError } from "@walletconnect/utils";
import { formatJsonRpcError, formatJsonRpcResult, JsonRpcResponse } from "@walletconnect/jsonrpc-utils";
import { LENS_ACCOUNT_ABI, LENS_CHAIN_ID, lensChain } from "@/lib/constants";

// Basic Fallback Icon Component
const FallbackIcon = ({ size = 30 }: { size?: number }) => (
  <div
    style={{ width: `${size}px`, height: `${size}px` }}
    className="rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-xs"
  >
    ?
  </div>
);

export function WcRequestDisplay() {
  const { pendingRequest, respondRequest, error: wcError, isLoading: isWcLoading } = useWalletConnect();
  const { lensAccountAddress } = useLensAccount();
  const { address: ownerAddress, chainId: ownerChainId } = useAccount();

  // State related to the write *initiation*
  const { data: hash, error: writeError, isPending: isWritePending, writeContractAsync, reset: resetWriteContract } = useWriteContract();
  // State related to the *confirmation* of the hash from write initiation
  const {
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    error: receiptError,
    data: receipt,
  } = useWaitForTransactionReceipt({ hash, chainId: LENS_CHAIN_ID });

  const [localError, setLocalError] = useState<string | null>(null);
  const [localLoadingMessage, setLocalLoadingMessage] = useState<string | null>(null);
  // Store the ID of the request currently being actively processed
  const processingRequestId = useRef<number | null>(null);
  // Store the hash associated with the *currently processed* request ID
  const processingRequestHash = useRef<Hash | null>(null);

  // --- Log Component Render ---
  console.log(
    `%cWcRequestDisplay Render: pendingReqId=${pendingRequest?.id ?? "null"}, currentProcessingId=${processingRequestId.current}, currentProcessingHash=${processingRequestHash.current ?? "null"}, hookHash=${hash ?? "null"}, isWritePending=${isWritePending}, isConfirming=${isConfirming}, isConfirmed=${isConfirmed}, receiptHash=${receipt?.transactionHash ?? "null"}, writeError=${!!writeError}, receiptError=${!!receiptError}`,
    "color: magenta",
  );
  // --------------------------

  // --- Effect to Reset State When a NEW Request Arrives ---
  useEffect(() => {
    const incomingRequestId = pendingRequest?.id ?? null;
    const currentProcessing = processingRequestId.current;

    console.log(
      `%cWcRequestDisplay ResetEffect: Running. Incoming ID: ${incomingRequestId}, Current Processing ID: ${currentProcessing}`,
      "color: teal",
    );

    if (incomingRequestId !== null) {
      if (currentProcessing !== incomingRequestId) {
        console.log(`%cWcRequestDisplay ResetEffect: New request ${incomingRequestId} detected. Resetting state.`, "color: teal");
        resetWriteContract();
        setLocalError(null);
        setLocalLoadingMessage(null);
        processingRequestId.current = incomingRequestId;
        processingRequestHash.current = null; // Reset hash ref
      } else {
        console.log(
          `%cWcRequestDisplay ResetEffect: Incoming ID ${incomingRequestId} matches current Processing ID. No reset needed.`,
          "color: teal",
        );
      }
    } else {
      if (currentProcessing !== null) {
        console.log(`%cWcRequestDisplay ResetEffect: No pending request. Resetting state.`, "color: teal");
        resetWriteContract();
        setLocalError(null);
        setLocalLoadingMessage(null);
        processingRequestId.current = null;
        processingRequestHash.current = null; // Reset hash ref
      } else {
        console.log(`%cWcRequestDisplay ResetEffect: No pending request and nothing processing. No reset needed.`, "color: teal");
      }
    }
  }, [pendingRequest, resetWriteContract]); // Now depends on pendingRequest object itself

  // --- Effect to track the hash associated with the current request ---
  useEffect(() => {
    if (hash && processingRequestId.current && !processingRequestHash.current) {
      console.log(`%cWcRequestDisplay HashTrackEffect: Associating hash ${hash} with request ID ${processingRequestId.current}`, "color: purple");
      processingRequestHash.current = hash; // Store the hash for the request we are processing
    }
  }, [hash, processingRequestId]); // Run when hash changes and we have a processing ID

  // --- Centralized Respond Function ---
  const handleRespond = useCallback(
    (response: JsonRpcResponse) => {
      const currentId = processingRequestId.current;
      if (currentId !== null && currentId === response.id) {
        console.log(`%cWcRequestDisplay handleRespond: Responding for request ID: ${response.id}`, "color: darkmagenta", response);
        respondRequest(response);
        // Reset processing state *after* responding
        processingRequestId.current = null;
        processingRequestHash.current = null; // Reset hash ref
        setLocalLoadingMessage(null);
        resetWriteContract(); // Try resetting here too
      } else {
        console.warn(
          `%cWcRequestDisplay handleRespond: Ignoring response attempt for stale/mismatched request ID: ${response.id} (Current Processing: ${currentId})`,
          "color: orange",
        );
      }
    },
    [respondRequest, resetWriteContract],
  ); // Add resetWriteContract

  // --- Effect to Handle Transaction Submission Result ---
  useEffect(() => {
    const currentProcessingId = processingRequestId.current;
    const currentReqHash = processingRequestHash.current; // Use the hash we stored for this request

    console.log(
      `%cWcRequestDisplay ReceiptEffect: Running. CurrentProcessingId=${currentProcessingId}, CurrentReqHash=${currentReqHash ?? "null"}, HookHash=${hash ?? "null"}, isConfirming=${isConfirming}, isConfirmed=${isConfirmed}, receiptHash=${receipt?.transactionHash ?? "null"}, receiptError=${!!receiptError}`,
      "color: #2ECC71",
    );

    // Guards:
    // 1. Must be processing a request.
    // 2. Must have a specific hash associated with *this* request attempt.
    // 3. The confirmation process must be finished (or errored).
    // 4. The hook's current hash must match the hash associated with our request.
    if (!currentProcessingId || !currentReqHash || isConfirming || hash !== currentReqHash) {
      console.log(
        `%cWcRequestDisplay ReceiptEffect: Bailing out (ProcessingID: ${currentProcessingId}, CurrentReqHash: ${currentReqHash}, HookHash: ${hash}, Confirming: ${isConfirming})`,
        "color: gray",
      );
      return;
    }

    // Now check receipt and errors, ensuring they match the currentReqHash
    if (receipt && receipt.transactionHash === currentReqHash) {
      console.log(`%cWcRequestDisplay ReceiptEffect: Receipt received for current hash ${currentReqHash}`, "color: #2ECC71");
      setLocalLoadingMessage(null);
      if (receipt.status === "success") {
        console.log(
          `%cWcRequestDisplay ReceiptEffect: Transaction successful, calling handleRespond for ID ${currentProcessingId}`,
          "color: #2ECC71",
        );
        handleRespond(formatJsonRpcResult(currentProcessingId, receipt.transactionHash));
      } else {
        console.error(
          `%cWcRequestDisplay ReceiptEffect: Transaction reverted, calling handleRespond for ID ${currentProcessingId}`,
          "color: red",
          receipt,
        );
        setLocalError("Transaction reverted on chain.");
        handleRespond(formatJsonRpcError(currentProcessingId, { code: -32000, message: "Transaction reverted" }));
      }
    } else if (receiptError) {
      console.error(
        `%cWcRequestDisplay ReceiptEffect: Transaction Receipt Error for hash ${currentReqHash}, calling handleRespond for ID ${currentProcessingId}`,
        "color: red",
        receiptError,
      );
      setLocalError(`Transaction failed: ${receiptError.message}`);
      handleRespond(formatJsonRpcError(currentProcessingId, { code: -32000, message: "Transaction Failed on chain" }));
    } else if (isConfirmed && !receipt) {
      console.warn(
        `%cWcRequestDisplay ReceiptEffect: isConfirmed is true but receipt is still null/undefined for hash ${currentReqHash}. Waiting.`,
        "color: orange",
      );
    } else {
      console.log(`%cWcRequestDisplay ReceiptEffect: No definitive action taken for hash ${currentReqHash}`, "color: gray");
    }
  }, [isConfirming, isConfirmed, receiptError, receipt, hash, handleRespond]); // Keep dependencies

  // --- Effect to Handle Direct Write Errors ---
  useEffect(() => {
    const currentProcessingId = processingRequestId.current;
    console.log(`%cWcRequestDisplay WriteErrorEffect: Running. writeError=${!!writeError}, currentProcessingId=${currentProcessingId}`, "color: red");
    if (writeError && currentProcessingId) {
      console.error("WcRequestDisplay WriteErrorEffect: Write Contract Error detected:", writeError);
      setLocalError(`Transaction rejected or failed to send: ${writeError.message}`);
      handleRespond(formatJsonRpcError(currentProcessingId, getSdkError("USER_REJECTED")));
    }
  }, [writeError, handleRespond]);

  const handleApprove = async () => {
    if (!pendingRequest) return setLocalError("No request to approve.");
    if (!lensAccountAddress) return setLocalError("Lens Account address missing.");
    if (!ownerAddress) return setLocalError("Owner wallet not connected.");
    if (!writeContractAsync) return setLocalError("Transaction function not ready.");
    if (ownerChainId !== LENS_CHAIN_ID) return setLocalError("Owner wallet not on Lens Chain.");

    // Reset local state AND ensure we reset wagmi state *before* initiating write
    console.log(`%cWcRequestDisplay handleApprove: Resetting state before write for request ID: ${pendingRequest.id}`, "color: blueviolet");
    resetWriteContract(); // Reset here as well
    processingRequestId.current = pendingRequest.id; // Mark immediately
    processingRequestHash.current = null; // Clear previous hash
    setLocalError(null);
    setLocalLoadingMessage("Please confirm in your wallet...");

    const { method, params } = pendingRequest.params.request;
    if (method !== "eth_sendTransaction") {
      const errorMsg = `Unsupported method: ${method}`;
      setLocalError(errorMsg);
      handleRespond(formatJsonRpcError(pendingRequest.id, { code: 4200, message: "Method not supported" }));
      return;
    }

    const tx = params[0] as { to?: `0x${string}`; value?: string; data?: `0x${string}` };
    const targetAddress = tx.to;
    const value = tx.value ? BigInt(tx.value) : 0n;
    const data = tx.data || "0x";

    if (!targetAddress) {
      const errorMsg = "Transaction 'to' address is missing.";
      setLocalError(errorMsg);
      handleRespond(formatJsonRpcError(pendingRequest.id, { code: -32602, message: "Invalid parameters: missing 'to' address" }));
      return;
    }

    try {
      console.log("%cWcRequestDisplay handleApprove: Calling writeContractAsync...", "color: blueviolet");
      // Call async, the hash state update will trigger the HashTrackEffect
      await writeContractAsync({
        address: lensAccountAddress,
        abi: LENS_ACCOUNT_ABI,
        functionName: "executeTransaction",
        args: [targetAddress, value, data],
        account: ownerAddress,
        chainId: LENS_CHAIN_ID,
      });
      console.log("%cWcRequestDisplay handleApprove: writeContractAsync call submitted.", "color: blueviolet");
    } catch (error) {
      console.error("WcRequestDisplay handleApprove: Error calling writeContractAsync:", error);
      if (!writeError && processingRequestId.current) {
        // Check current ID before responding
        const errorMsg = `Failed to initiate transaction: ${(error as Error).message}`;
        setLocalError(errorMsg);
        handleRespond(formatJsonRpcError(processingRequestId.current, getSdkError("USER_REJECTED")));
      }
    }
  };

  const handleReject = () => {
    if (!pendingRequest) return;
    processingRequestId.current = pendingRequest.id; // Mark which request we are rejecting
    setLocalError(null);
    setLocalLoadingMessage(null);
    console.log("WcRequestDisplay handleReject: Rejecting request:", pendingRequest.id);
    handleRespond(formatJsonRpcError(pendingRequest.id, getSdkError("USER_REJECTED")));
  };

  // --- Render Logic ---
  if (!pendingRequest) {
    return (
      <div className="p-4 border rounded-md bg-gray-50">
        <p className="text-gray-600 text-center italic">No pending WalletConnect requests.</p>
      </div>
    );
  }

  // Extract request details safely
  const { request, chainId } = pendingRequest.params;
  const txDetails = request.params?.[0] as { to?: string; value?: string; data?: string } | undefined;
  const dAppName = pendingRequest.verifyContext?.verified.origin || "Unknown dApp";
  const dAppUrl = pendingRequest.verifyContext?.verified.origin;
  const formattedValue = txDetails?.value
    ? `${formatUnits(BigInt(txDetails.value), lensChain.nativeCurrency.decimals)} ${lensChain.nativeCurrency.symbol}`
    : `0 ${lensChain.nativeCurrency.symbol}`;
  const isLoading = isWritePending || isConfirming || isWcLoading;

  return (
    <div className="p-4 border-2 border-blue-300 rounded-md bg-blue-50 shadow-md space-y-4">
      <h3 className="text-md font-semibold text-blue-800">WalletConnect Request</h3>
      <div className="flex items-center space-x-3 mb-3 pb-3 border-b border-blue-200">
        <FallbackIcon size={30} />
        <div>
          <p className="text-sm font-medium text-gray-800">{dAppName}</p>
          {dAppUrl && <p className="text-xs text-gray-500">{dAppUrl}</p>}
        </div>
      </div>

      <div className="space-y-2 text-sm">
        <p>
          <strong className="text-gray-600">Method:</strong> <span className="font-mono bg-gray-100 px-1 rounded">{request.method}</span>
        </p>
        <p>
          <strong className="text-gray-600">Chain:</strong> <span className="font-mono bg-gray-100 px-1 rounded">{chainId}</span>
        </p>
        <p>
          <strong className="text-gray-600">Target (to):</strong> <span className="font-mono text-xs break-all">{txDetails?.to ?? "N/A"}</span>
        </p>
        <p>
          <strong className="text-gray-600">Value:</strong> <span className="font-mono">{formattedValue}</span>
        </p>
        <div>
          <strong className="text-gray-600">Data:</strong>
          <textarea
            readOnly
            value={txDetails?.data ?? "0x"}
            className="mt-1 w-full h-20 p-1 border border-gray-300 rounded text-xs font-mono bg-gray-50"
          />
        </div>
      </div>

      {/* Status Display */}
      {localLoadingMessage && <p className="text-sm text-center text-indigo-600 animate-pulse">{localLoadingMessage}</p>}
      {localError && <p className="text-sm text-center text-red-600">{localError}</p>}
      {wcError && !localError && <p className="text-sm text-center text-red-600">WC Error: {wcError}</p>}

      {/* Action Buttons */}
      <div className="flex space-x-3 pt-2">
        <button
          onClick={handleApprove}
          disabled={isLoading}
          className="flex-1 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {isWritePending ? "Check Wallet..." : isConfirming ? "Confirming..." : "Approve & Send"}
        </button>
        <button
          onClick={handleReject}
          disabled={isLoading}
          className="flex-1 px-4 py-2 bg-red-500 text-white text-sm font-medium rounded-md shadow-sm hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50"
        >
          Reject
        </button>
      </div>
    </div>
  );
}
