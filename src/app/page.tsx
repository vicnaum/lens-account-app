// app/page.tsx
"use client";

import { DiscoveryForm } from "@/components/DiscoveryForm";
import { ConnectOwnerButton } from "@/components/ConnectOwnerButton"; // Import the button
import { useState, useEffect } from "react";
import { useReadContract } from "wagmi"; // Import useReadContract
import { type Address, isAddress } from "viem"; // Import Address type and isAddress
import { LENS_ACCOUNT_ABI, LENS_CHAIN_ID } from "@/lib/constants"; // Import ABI and Chain ID

export default function Home() {
  const [lensAccountAddress, setLensAccountAddress] = useState<Address | "">(
    ""
  );
  const [expectedOwner, setExpectedOwner] = useState<Address | null>(null); // State for the expected owner
  const [ownerFetchError, setOwnerFetchError] = useState<string | null>(null); // State for owner fetch error

  // Handler from DiscoveryForm
  const handleAccountFound = (address: Address | "") => {
    console.log("Account Address Updated in Parent:", address);
    setLensAccountAddress(address);
    // Reset expected owner when the lens account changes
    setExpectedOwner(null);
    setOwnerFetchError(null);
  };

  // Hook to fetch the owner of the identified Lens Account
  const {
    data: ownerData,
    error: ownerError,
    isLoading: isLoadingOwner,
    refetch: refetchOwner, // Added refetch in case address changes
  } = useReadContract({
    address: lensAccountAddress || undefined, // Pass address only if it's valid
    abi: LENS_ACCOUNT_ABI,
    functionName: "owner",
    chainId: LENS_CHAIN_ID,
    query: {
      // Only run the query if lensAccountAddress is a valid address
      enabled: isAddress(lensAccountAddress),
    },
  });

  // Effect to update expectedOwner state when ownerData changes
  useEffect(() => {
    if (ownerData) {
      setExpectedOwner(ownerData);
      setOwnerFetchError(null); // Clear error on success
      console.log("Fetched Expected Owner:", ownerData);
    } else {
      // Don't reset expectedOwner here immediately, wait for error or loading state change
      // setExpectedOwner(null);
    }
  }, [ownerData]);

  // Effect to handle owner fetch errors
  useEffect(() => {
    if (ownerError) {
      console.error("Error fetching owner:", ownerError);
      setOwnerFetchError(
        "Could not fetch account owner. Ensure the address is correct and on Lens Chain."
      );
      setExpectedOwner(null); // Clear owner on error
    } else {
      // Clear error if the query is re-enabled and potentially succeeds later
      if (isAddress(lensAccountAddress)) {
        setOwnerFetchError(null);
      }
    }
  }, [ownerError, lensAccountAddress]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 md:p-24 bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      <div className="w-full max-w-lg p-8 space-y-6 bg-white rounded-xl shadow-lg">
        <h1 className="text-2xl font-bold text-center text-gray-800">
          Lens Account Interface
        </h1>
        <p className="text-center text-gray-600">
          Find your Lens Account by username or address.
        </p>

        <DiscoveryForm onAccountAddressFound={handleAccountFound} />

        {/* Section for Owner Info & Connect Button */}
        <div className="mt-6 text-center space-y-3">
          {/* Display loading state for owner fetch */}
          {isAddress(lensAccountAddress) && isLoadingOwner && (
            <p className="text-gray-500">Fetching owner...</p>
          )}

          {/* Display owner fetch error */}
          {ownerFetchError && <p className="text-red-600">{ownerFetchError}</p>}

          {/* Display expected owner if found */}
          {expectedOwner && !isLoadingOwner && !ownerFetchError && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm font-medium text-blue-800">
                Identified Account Owner:
              </p>
              <p className="text-xs text-blue-700 break-words font-mono">
                {expectedOwner}
              </p>
              <p className="text-xs text-blue-600 mt-1">
                Connect this wallet to proceed.
              </p>
            </div>
          )}

          {/* Conditionally render the Connect Button */}
          {expectedOwner && !isLoadingOwner && !ownerFetchError && (
            <div className="pt-2">
              <ConnectOwnerButton />
            </div>
          )}

          {/* Show initial prompt if no valid address is entered yet */}
          {!isAddress(lensAccountAddress) && (
            <p className="text-sm text-gray-500">
              Enter a Lens username or account address above to find the owner.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
