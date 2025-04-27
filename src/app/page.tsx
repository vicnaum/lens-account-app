// src/app/page.tsx
"use client";

import { DiscoveryForm } from "@/components/DiscoveryForm";
import { ConnectOwnerButton } from "@/components/ConnectOwnerButton";
import { useState, useEffect } from "react";
import { useAccount, useReadContract } from "wagmi"; // Import useAccount
import { useRouter } from "next/navigation"; // Import useRouter
import { type Address, isAddress } from "viem";
import { useLensAccount } from "@/contexts/LensAccountContext"; // Import the context hook
import { LENS_ACCOUNT_ABI, LENS_CHAIN_ID } from "@/lib/constants";

export default function Home() {
  const [lensAccountAddress, setLensAccountAddress] = useState<Address | "">("");
  const [expectedOwner, setExpectedOwner] = useState<Address | null>(null);
  const [ownerFetchError, setOwnerFetchError] = useState<string | null>(null);
  const [verificationError, setVerificationError] = useState<string | null>(null); // State for verification errors

  const {
    address: connectedAddress,
    chainId: connectedChainId,
    isConnected,
    // isConnecting, // REMOVED - Unused
    // isReconnecting, // REMOVED - Unused
  } = useAccount(); // Get connected account info
  const router = useRouter(); // Initialize router
  const { setVerifiedAccount, clearAccount: clearContext } = useLensAccount(); // Get context actions

  const handleAccountFound = (address: Address | "") => {
    console.log("Account Address Updated in Parent:", address);
    setLensAccountAddress(address);
    setExpectedOwner(null); // Reset owner when lens account changes
    setOwnerFetchError(null);
    setVerificationError(null); // Reset verification error
    clearContext(); // Clear context if lens account changes
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

  // Effect for Owner Verification and Navigation
  useEffect(() => {
    // Clear verification error on disconnect
    if (!isConnected) {
      setVerificationError(null);
      clearContext(); // Also clear context on disconnect
      return;
    }

    if (connectedAddress && expectedOwner && isAddress(lensAccountAddress)) {
      // Check if on the correct chain first
      if (connectedChainId !== LENS_CHAIN_ID) {
        // Wagmi/ConnectKit handles the switch prompt, maybe show a generic message here
        setVerificationError("Please switch to the Lens Chain in your wallet.");
        clearContext();
        return; // Don't proceed further if chain is wrong
      }

      // Now check if the address matches
      if (connectedAddress.toLowerCase() === expectedOwner.toLowerCase()) {
        console.log("Owner verified! Navigating to dashboard...");
        setVerificationError(null); // Clear error on success
        // Set the verified account details in context before navigating
        setVerifiedAccount(lensAccountAddress, connectedAddress);
        router.push("/dashboard");
      } else {
        console.log("Owner mismatch:", {
          connected: connectedAddress,
          expected: expectedOwner,
        });
        setVerificationError(`Incorrect owner connected. Please connect with wallet: ${expectedOwner}`);
        clearContext();
      }
    }
  }, [connectedAddress, connectedChainId, expectedOwner, lensAccountAddress, isConnected, router, setVerifiedAccount, clearContext]);

  const showConnectButton = expectedOwner && !isLoadingOwner && !ownerFetchError;
  // const connectButtonDisabled = // REMOVED - Unused
  //   !!verificationError || connectedChainId !== LENS_CHAIN_ID;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 md:p-24 bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      <h1 className="text-4xl font-bold text-gray-800 mb-12">Lens Account Dashboard</h1>

      <div className="w-full max-w-lg p-8 space-y-8 bg-white rounded-xl shadow-lg">
        <DiscoveryForm onAccountAddressFound={handleAccountFound} />

        <div className="space-y-4">
          {isAddress(lensAccountAddress) && isLoadingOwner && <p className="text-center text-indigo-600">Fetching owner...</p>}

          {ownerFetchError && !isLoadingOwner && <p className="text-center text-red-600">{ownerFetchError}</p>}

          {expectedOwner && !isLoadingOwner && !ownerFetchError && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm font-medium text-blue-800 mb-1">Identified Account Owner:</p>
              <p className="text-xs text-blue-700 break-words font-mono">{expectedOwner}</p>
              {!isConnected && <p className="text-xs text-blue-600 mt-2">Connect this wallet to proceed.</p>}
            </div>
          )}

          {verificationError && <p className="text-sm text-center text-red-600">{verificationError}</p>}

          {showConnectButton && (
            <div className="flex flex-col items-center gap-2">
              <ConnectOwnerButton />
              {isConnected && connectedChainId !== LENS_CHAIN_ID && <p className="text-xs text-orange-600">Waiting for network switch...</p>}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
