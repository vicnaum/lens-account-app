// src/components/WcConnect.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useWalletConnect } from "@/contexts/WalletConnectProvider"; // Ensure correct path
import Image from "next/image";

export function WcConnect() {
  // Destructure states from the refactored provider, including isInitializing
  const {
    activeSessions,
    pair,
    disconnect,
    isLoading, // Use the combined loading state
    isPairing,
    error,
    isInitialized, // Use the service readiness flag
    pendingProposal, // Get the pending proposal
    approveSession, // Get approve action
    rejectSession, // Get reject action
    isInitializing, // <<<--- ADDED isInitializing HERE ---<<<
  } = useWalletConnect();
  const [uri, setUri] = useState("");

  const activeSessionTopic = Object.keys(activeSessions)[0]; // Assuming only one session for MVP
  const connectedSession = activeSessionTopic ? activeSessions[activeSessionTopic] : null;

  // --- Add this useEffect ---
  useEffect(() => {
    // If there's no connected session (either initially or after disconnect),
    // clear the URI input field.
    if (!connectedSession) {
      setUri("");
    }
  }, [connectedSession]); // Run this effect when connectedSession changes
  // -------------------------

  const handleConnect = () => {
    if (!uri || !isInitialized || isLoading) return; // Check initialization and combined loading state
    pair(uri);
  };

  const handleDisconnect = () => {
    if (connectedSession && isInitialized && !isLoading) {
      // Check initialization and combined loading state
      disconnect(connectedSession.topic);
    }
  };

  const handleApprove = () => {
    if (pendingProposal && !isLoading) {
      approveSession();
    }
  };

  const handleReject = () => {
    if (pendingProposal && !isLoading) {
      rejectSession();
    }
  };

  // Display loading states more granularly if needed, otherwise use `isLoading`
  const connectButtonText = isPairing ? "Pairing..." : isLoading ? "Working..." : "Connect";
  const disconnectButtonText = isLoading ? "Working..." : "Disconnect";
  const approveButtonText = isLoading ? "Working..." : "Approve Session";
  const rejectButtonText = isLoading ? "Working..." : "Reject Session";

  return (
    <div className="p-4 border rounded-md bg-gray-50 space-y-4">
      <h3 className="text-md font-semibold text-gray-700">Connect to dApp (via Lens Account)</h3>

      {/* --- Session Proposal Modal (Simplified Inline) --- */}
      {pendingProposal && (
        <div className="p-3 border border-yellow-300 bg-yellow-50 rounded-md space-y-2">
          <p className="text-sm font-medium text-yellow-800">Connection Request from:</p>
          <div className="flex items-center space-x-2">
            {pendingProposal.params.proposer.metadata.icons?.[0] && (
              <Image
                src={pendingProposal.params.proposer.metadata.icons[0]}
                alt={`${pendingProposal.params.proposer.metadata.name} icon`}
                width={30}
                height={30}
                className="rounded-full"
                unoptimized
              />
            )}
            <span className="text-sm text-gray-700">{pendingProposal.params.proposer.metadata.name}</span>
          </div>
          {/* TODO: Display requested permissions details if needed */}
          <div className="flex space-x-2 pt-2">
            <button
              onClick={handleApprove}
              disabled={isLoading || !isInitialized}
              className="flex-1 px-3 py-1 bg-green-500 text-white text-xs font-medium rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {approveButtonText}
            </button>
            <button
              onClick={handleReject}
              disabled={isLoading || !isInitialized}
              className="flex-1 px-3 py-1 bg-red-500 text-white text-xs font-medium rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {rejectButtonText}
            </button>
          </div>
        </div>
      )}

      {/* --- Connected Session Display --- */}
      {connectedSession && !pendingProposal && (
        <div className="space-y-3 p-3 bg-green-50 border border-green-200 rounded-md">
          {/* Display connected dApp info */}
          <p className="text-green-800 font-medium">Connected to:</p>
          <div className="flex items-center space-x-3">
            {connectedSession.peer.metadata.icons?.[0] && (
              <Image
                src={connectedSession.peer.metadata.icons[0]}
                alt={`${connectedSession.peer.metadata.name} icon`}
                width={40}
                height={40}
                className="rounded-full"
                unoptimized
              />
            )}
            <div>
              <p className="text-sm font-semibold text-gray-900">{connectedSession.peer.metadata.name}</p>
              <p className="text-xs text-gray-600 break-all">{connectedSession.peer.metadata.url}</p>
            </div>
          </div>
          <p className="text-xs text-gray-500">
            Topic: <span className="font-mono break-all">{connectedSession.topic}</span>
          </p>
          <button
            onClick={handleDisconnect}
            disabled={isLoading || !isInitialized} // Use combined loading state
            className="w-full px-4 py-2 mt-2 bg-red-500 text-white text-sm font-medium rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {disconnectButtonText}
          </button>
        </div>
      )}

      {/* --- Pairing/Connection Form --- */}
      {!connectedSession && !pendingProposal && (
        <div className="space-y-2">
          <label htmlFor="wc-uri" className="block text-sm font-medium text-gray-700">
            Paste WalletConnect URI
          </label>
          <div className="flex space-x-2">
            <input
              id="wc-uri"
              name="wc-uri"
              type="text"
              value={uri}
              onChange={(e) => setUri(e.target.value)}
              placeholder="wc:..."
              className="flex-grow px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-gray-100"
              disabled={isLoading || !isInitialized} // Use combined loading state
            />
            <button
              onClick={handleConnect}
              disabled={!uri || isLoading || !isInitialized} // Use combined loading state
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {connectButtonText}
            </button>
          </div>
        </div>
      )}

      {/* --- Status/Error Messages --- */}
      {error && !isLoading && <p className="text-red-600 text-sm mt-2">Error: {error}</p>}
      {isPairing && <p className="text-indigo-600 text-sm mt-2">Pairing initiated, check dApp/wallet if needed...</p>}
      {/* Check both flags here now */}
      {!isInitialized && !isInitializing && !error && <p className="text-orange-600 text-sm mt-2">WalletConnect service not ready.</p>}
      {/* And display initializing message correctly */}
      {isInitializing && <p className="text-gray-500 text-sm mt-2">Initializing WalletConnect...</p>}
    </div>
  );
}
