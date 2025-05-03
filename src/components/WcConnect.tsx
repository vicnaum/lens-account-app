// src/components/WcConnect.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useWalletConnect } from "@/contexts/WalletConnectProvider"; // Ensure correct path
import Image from "next/image";

// Default/Fallback Icon
const FallbackIcon = () => <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-xs">?</div>;

// Helper function to resolve icon URL
const resolveIconUrl = (iconPath: string | null | undefined, baseUrl: string | null | undefined): string | undefined => {
  if (!iconPath) return undefined;

  try {
    // Handle absolute URLs
    if (iconPath.startsWith("http://") || iconPath.startsWith("https://")) {
      return iconPath;
    }
    // Handle root-relative paths if base URL exists
    if (iconPath.startsWith("/") && baseUrl) {
      const origin = new URL(baseUrl).origin;
      return `${origin}${iconPath}`;
    }
    console.warn("Invalid icon URL format:", iconPath);
    return undefined;
  } catch (e) {
    console.warn("Error resolving icon URL:", e);
    return undefined;
  }
};

// Icon component with error handling
const DAppIcon = ({ iconUrl, name, size = 40 }: { iconUrl?: string; name: string; size?: number }) => {
  const [hasError, setHasError] = useState(false);

  if (!iconUrl || hasError) return <FallbackIcon />;

  return (
    <Image
      src={iconUrl}
      alt={`${name} icon`}
      width={size}
      height={size}
      className="rounded-full"
      unoptimized
      onError={() => {
        console.warn("Failed to load icon:", iconUrl);
        setHasError(true);
      }}
    />
  );
};

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

  // Resolve icon URLs
  const connectedDAppIconUrl = connectedSession
    ? resolveIconUrl(connectedSession.peer.metadata.icons?.[0] ?? undefined, connectedSession.peer.metadata.url ?? undefined)
    : undefined;

  const proposalIconUrl = pendingProposal
    ? resolveIconUrl(pendingProposal.params.proposer.metadata.icons?.[0] ?? undefined, pendingProposal.params.proposer.metadata.url ?? undefined)
    : undefined;

  return (
    // Remove border, adjust padding and background if needed (now inside a white card)
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-800">Connect to dApp</h3>

      {/* --- Session Proposal Modal (Simplified Inline) --- */}
      {pendingProposal && (
        // Use softer warning style
        <div className="p-4 border border-orange-200 bg-orange-50 rounded-lg space-y-3">
          <p className="text-sm font-medium text-yellow-800">Connection Request from:</p>
          <div className="flex items-center space-x-2">
            <DAppIcon iconUrl={proposalIconUrl} name={pendingProposal.params.proposer.metadata.name} size={30} />
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
        // Use softer success style
        <div className="space-y-3 p-4 bg-green-50 border border-green-200 rounded-lg">
          {/* Display connected dApp info */}
          <p className="text-green-800 font-medium">Connected to:</p>
          <div className="flex items-center space-x-3">
            <DAppIcon iconUrl={connectedDAppIconUrl} name={connectedSession.peer.metadata.name} size={40} />
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
            className="w-full px-4 py-2 mt-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
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
              className="flex-grow px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:bg-white sm:text-sm disabled:bg-gray-100 transition-colors"
              disabled={isLoading || !isInitialized} // Use combined loading state
            />
            <button
              onClick={handleConnect}
              disabled={!uri || isLoading || !isInitialized} // Use combined loading state
              className="px-5 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
            >
              {connectButtonText}
            </button>
          </div>
        </div>
      )}

      {/* --- Status/Error Messages --- */}
      {error && !isLoading && <p className="text-red-600 text-sm mt-2">Error: {error}</p>}
      {isPairing && <p className="text-emerald-600 text-sm mt-2">Pairing initiated, check dApp/wallet if needed...</p>}
      {/* Check both flags here now */}
      {!isInitialized && !isInitializing && !error && <p className="text-orange-600 text-sm mt-2">WalletConnect service not ready.</p>}
      {/* And display initializing message correctly */}
      {isInitializing && <p className="text-gray-500 text-sm mt-2">Initializing WalletConnect...</p>}
    </div>
  );
}
