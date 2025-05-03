// src/app/page.tsx
"use client";

import { DiscoveryForm } from "@/components/DiscoveryForm";
import { ConnectOwnerButton } from "@/components/ConnectOwnerButton";
import { useState, useEffect } from "react";
import { useAccount, useReadContract } from "wagmi";
import { useRouter } from "next/navigation";
import { type Address, isAddress } from "viem";
import { useLensAccount } from "@/contexts/LensAccountContext";
import { LENS_ACCOUNT_ABI, LENS_CHAIN_ID, LOCAL_STORAGE_KEYS } from "@/lib/constants";
import { ArrowPathIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";

export default function Home() {
  // Initialize state with empty defaults (server-renderable)
  const [lensAccountAddress, setLensAccountAddress] = useState<Address | "">("");
  const [lensUsername, setLensUsername] = useState<string>("");

  const [expectedOwner, setExpectedOwner] = useState<Address | null>(null);
  const [ownerFetchError, setOwnerFetchError] = useState<string | null>(null);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  const { address: connectedAddress, chainId: connectedChainId, isConnected, isConnecting, isReconnecting, status } = useAccount();
  const router = useRouter();
  const { setVerifiedAccount, clearAccount: clearContext } = useLensAccount();

  // New useEffect to load from localStorage after component mount
  useEffect(() => {
    // This code only runs on the client after the initial render
    try {
      const storedAddress = localStorage.getItem(LOCAL_STORAGE_KEYS.LENS_ACCOUNT_ADDRESS);
      if (storedAddress && isAddress(storedAddress)) {
        setLensAccountAddress(storedAddress);
      }

      const storedUsername = localStorage.getItem(LOCAL_STORAGE_KEYS.LENS_USERNAME);
      if (storedUsername) {
        setLensUsername(storedUsername);
      }
    } catch (error) {
      console.error("Failed to read session from localStorage on mount:", error);
    }
  }, []); // Empty dependency array ensures this runs only once on mount

  // Updated handler for DiscoveryForm callback
  const handleAccountDetailsFound = (details: { address: Address | ""; username: string }) => {
    console.log("Account Details Updated in Parent:", details);
    setLensAccountAddress(details.address);
    setLensUsername(details.username);
    setExpectedOwner(null);
    setOwnerFetchError(null);
    setVerificationError(null);
    clearContext();
  };

  const {
    data: ownerData,
    error: ownerError,
    isLoading: isLoadingOwner,
  } = useReadContract({
    address: lensAccountAddress || undefined,
    abi: LENS_ACCOUNT_ABI,
    functionName: "owner",
    chainId: LENS_CHAIN_ID,
    query: {
      enabled: isAddress(lensAccountAddress),
    },
  });

  // Effect to update expectedOwner state
  useEffect(() => {
    if (ownerData) {
      setExpectedOwner(ownerData);
      setOwnerFetchError(null);
      console.log("Fetched Expected Owner:", ownerData);
    }
  }, [ownerData]);

  // Effect to handle owner fetch errors
  useEffect(() => {
    if (ownerError) {
      console.error("Error fetching owner:", ownerError);
      setOwnerFetchError("Could not fetch account owner. Ensure the address is correct and on Lens Chain.");
      setExpectedOwner(null);
    } else if (isAddress(lensAccountAddress)) {
      setOwnerFetchError(null);
    }
  }, [ownerError, lensAccountAddress]);

  // Session Restore Effect
  useEffect(() => {
    console.log("Session Restore Check Effect: Running...");
    // Prevent restore logic while connection is initializing/reconnecting
    if (isConnecting || isReconnecting || status !== "connected") {
      console.log("Session Restore Check Effect: Waiting for connection to settle...");
      return;
    }

    // Only attempt restore if the wallet is definitively connected
    if (!connectedAddress) {
      console.log("Session Restore Check Effect: Wallet not connected, skipping restore.");
      // Ensure local storage is cleared if wallet is disconnected but data exists
      try {
        if (localStorage.getItem(LOCAL_STORAGE_KEYS.LENS_ACCOUNT_ADDRESS)) {
          console.log("Session Restore Check Effect: Clearing stale localStorage data as wallet is disconnected.");
          localStorage.removeItem(LOCAL_STORAGE_KEYS.LENS_ACCOUNT_ADDRESS);
          localStorage.removeItem(LOCAL_STORAGE_KEYS.EXPECTED_OWNER_ADDRESS);
          localStorage.removeItem(LOCAL_STORAGE_KEYS.LENS_USERNAME);
        }
      } catch (error) {
        console.error("Failed to clear stale session from localStorage:", error);
      }
      return;
    }

    let storedLensAddress: Address | null = null;
    let storedOwner: Address | null = null;
    let storedUsername: string | null = null;

    try {
      storedLensAddress = localStorage.getItem(LOCAL_STORAGE_KEYS.LENS_ACCOUNT_ADDRESS) as Address | null;
      storedOwner = localStorage.getItem(LOCAL_STORAGE_KEYS.EXPECTED_OWNER_ADDRESS) as Address | null;
      storedUsername = localStorage.getItem(LOCAL_STORAGE_KEYS.LENS_USERNAME);
      console.log("Session Restore Check Effect: Found stored data:", { storedLensAddress, storedOwner, storedUsername });
    } catch (error) {
      console.error("Session Restore Check Effect: Failed to read session from localStorage:", error);
      return;
    }

    // Check if essential data exists and is valid, and matches the connected wallet
    if (
      storedLensAddress &&
      isAddress(storedLensAddress) &&
      storedOwner &&
      isAddress(storedOwner) &&
      connectedAddress.toLowerCase() === storedOwner.toLowerCase()
    ) {
      // Check chain ID
      if (connectedChainId !== LENS_CHAIN_ID) {
        console.log("Session Restore Check Effect: Wallet connected but on wrong chain. Waiting for switch.");
        setVerificationError("Previous session found. Please switch to the Lens Chain.");
        setLensAccountAddress(storedLensAddress);
        setLensUsername(storedUsername || "");
        setExpectedOwner(storedOwner);
        return;
      }

      console.log("Session Restore Check Effect: Valid session found, wallet connected correctly. Restoring session and redirecting...");
      setVerifiedAccount(storedLensAddress, connectedAddress);
      setLensAccountAddress(storedLensAddress);
      setLensUsername(storedUsername || "");
      setExpectedOwner(storedOwner);
      setVerificationError(null);

      router.replace("/dashboard");
    } else {
      console.log("Session Restore Check Effect: No valid stored session found or owner mismatch.");
      try {
        localStorage.removeItem(LOCAL_STORAGE_KEYS.LENS_ACCOUNT_ADDRESS);
        localStorage.removeItem(LOCAL_STORAGE_KEYS.EXPECTED_OWNER_ADDRESS);
        localStorage.removeItem(LOCAL_STORAGE_KEYS.LENS_USERNAME);
      } catch (error) {
        console.error("Failed to clear invalid session data from localStorage:", error);
      }
    }
  }, [status, connectedAddress, connectedChainId, isConnecting, isReconnecting, router, setVerifiedAccount, clearContext]);

  // Effect for Owner Verification and Navigation
  useEffect(() => {
    if (!isConnected || !connectedAddress || !expectedOwner || !isAddress(lensAccountAddress)) {
      return;
    }

    if (connectedChainId !== LENS_CHAIN_ID) {
      setVerificationError("Please switch to the Lens Chain in your wallet.");
      clearContext();
      return;
    }

    if (connectedAddress.toLowerCase() === expectedOwner.toLowerCase()) {
      console.log("Owner verified! Storing session and navigating...");
      setVerificationError(null);

      try {
        localStorage.setItem(LOCAL_STORAGE_KEYS.LENS_ACCOUNT_ADDRESS, lensAccountAddress);
        localStorage.setItem(LOCAL_STORAGE_KEYS.EXPECTED_OWNER_ADDRESS, expectedOwner);
        localStorage.setItem(LOCAL_STORAGE_KEYS.LENS_USERNAME, lensUsername || "");
        console.log("Session data stored in localStorage");
      } catch (error) {
        console.error("Failed to write session to localStorage:", error);
      }

      setVerifiedAccount(lensAccountAddress, connectedAddress);
      router.push("/dashboard");
    } else {
      console.log("Owner mismatch:", { connected: connectedAddress, expected: expectedOwner });
      setVerificationError(`Incorrect owner connected. Please connect with wallet: ${expectedOwner}`);
      try {
        localStorage.removeItem(LOCAL_STORAGE_KEYS.LENS_ACCOUNT_ADDRESS);
        localStorage.removeItem(LOCAL_STORAGE_KEYS.EXPECTED_OWNER_ADDRESS);
        localStorage.removeItem(LOCAL_STORAGE_KEYS.LENS_USERNAME);
      } catch (error) {
        console.error("Failed to clear session from localStorage during mismatch:", error);
      }
      clearContext();
    }
  }, [connectedAddress, connectedChainId, expectedOwner, lensAccountAddress, lensUsername, isConnected, router, setVerifiedAccount, clearContext]);

  const showConnectButton = expectedOwner && !isLoadingOwner && !ownerFetchError;

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center p-6 md:p-24 bg-gradient-to-br from-emerald-100 via-teal-100 to-blue-100">
      <h1 className="text-5xl font-extrabold text-gray-900 mb-16 tracking-tight">Lens Account Dashboard</h1>
      <div className="w-full max-w-lg p-10 md:p-12 space-y-10 bg-white rounded-2xl shadow-xl">
        <DiscoveryForm
          onAccountDetailsFound={handleAccountDetailsFound}
          initialAddress={lensAccountAddress || ""}
          initialUsername={lensUsername || ""}
        />

        <div className="space-y-4">
          {isAddress(lensAccountAddress) && isLoadingOwner && (
            <div className="mt-4 flex items-center justify-center gap-2 text-sm font-medium text-emerald-600">
              <ArrowPathIcon className="w-5 h-5 animate-spin" />
              <span>Fetching owner...</span>
            </div>
          )}

          {ownerFetchError && !isLoadingOwner && (
            <div className="mt-4 flex items-center justify-center gap-2 text-sm font-medium text-red-600 bg-red-50 p-3 rounded-lg">
              <ExclamationTriangleIcon className="w-5 h-5" />
              <span>{ownerFetchError}</span>
            </div>
          )}

          {expectedOwner && !isLoadingOwner && !ownerFetchError && (
            <div className="p-5 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm font-semibold text-blue-800 mb-1">Identified Account Owner:</p>
              <p className="text-xs text-blue-700 break-words font-mono">{expectedOwner}</p>
              {!isConnected && <p className="text-xs text-blue-600 mt-2">Connect this wallet to proceed.</p>}
            </div>
          )}

          {verificationError && (
            <div className="mt-4 flex items-center justify-center gap-2 text-sm font-medium text-red-600 bg-red-50 p-3 rounded-lg">
              <ExclamationTriangleIcon className="w-5 h-5" />
              <span>{verificationError}</span>
            </div>
          )}

          {showConnectButton && (
            <div className="flex flex-col items-center gap-3 mt-2">
              <ConnectOwnerButton />
              {isConnected && connectedChainId !== LENS_CHAIN_ID && (
                <p className="text-xs text-orange-600 bg-orange-50 px-3 py-2 rounded-md">Waiting for network switch...</p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
        <a href="https://fkng.social" target="_blank" rel="noopener noreferrer" className="block text-gray-500 hover:text-gray-600 transition-colors">
          <img src="/FKNG.SOCIAL.svg" alt="FKNG.SOCIAL" className="h-5 w-auto" />
        </a>
        <p className="font-sans text-[11px] font-light text-gray-500">JOIN THE FKNG REVOLUTION</p>
      </div>
    </main>
  );
}
