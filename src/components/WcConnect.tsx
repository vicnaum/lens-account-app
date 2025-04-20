// src/components/WcConnect.tsx
"use client";

import React, { useState } from "react";
import { useWalletConnect } from "@/contexts/WalletConnectProvider"; // Ensure correct path
import Image from "next/image";

export function WcConnect() {
  // Destructure necessary state values including isInitialized and specific loading states
  const { activeSessions, pair, disconnect, isLoading, isInitializing, isPairing, error, isInitialized } = useWalletConnect();
  const [uri, setUri] = useState("");

  const handleConnect = () => {
    if (!uri || !isInitialized) return; // Check initialization
    pair(uri);
  };

  const activeSessionTopic = Object.keys(activeSessions)[0];
  const connectedSession = activeSessionTopic ? activeSessions[activeSessionTopic] : null;

  const handleDisconnect = () => {
    if (connectedSession && isInitialized) {
      // Check initialization
      disconnect(connectedSession.topic);
    }
  };

  // Determine overall busy state
  const isBusy = isLoading || isInitializing || isPairing;

  return (
    <div className="p-4 border rounded-md bg-gray-50 space-y-4">
      <h3 className="text-md font-semibold text-gray-700">Connect to dApp (via Lens Account)</h3>

      {connectedSession ? (
        // Display connected dApp info
        <div className="space-y-3 p-3 bg-green-50 border border-green-200 rounded-md">
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
            disabled={isBusy || !isInitialized} // Use combined busy state
            className="w-full px-4 py-2 mt-2 bg-red-500 text-white text-sm font-medium rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {isBusy ? "Working..." : "Disconnect"}
          </button>
        </div>
      ) : (
        // Display connection form
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
              disabled={isBusy || !isInitialized} // Use combined busy state
            />
            <button
              onClick={handleConnect}
              disabled={!uri || isBusy || !isInitialized} // Use combined busy state
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {isPairing ? "Pairing..." : isInitializing ? "Initializing..." : "Connect"}
            </button>
          </div>
        </div>
      )}

      {/* Display appropriate status/error messages */}
      {error && !isBusy && <p className="text-red-600 text-sm mt-2">Error: {error}</p>}
      {isPairing && <p className="text-indigo-600 text-sm mt-2">Pairing initiated, check your wallet...</p>}
      {!isInitialized && !isInitializing && !error && <p className="text-orange-600 text-sm mt-2">WalletConnect service not ready.</p>}
      {isInitializing && <p className="text-gray-500 text-sm mt-2">Initializing WalletConnect...</p>}
    </div>
  );
}
