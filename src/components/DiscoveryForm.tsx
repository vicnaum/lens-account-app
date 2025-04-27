// components/DiscoveryForm.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useReadContract } from "wagmi";
import { isAddress } from "viem";
import { useDebounce } from "@/hooks/useDebounce";
import { LENS_CHAIN_ID, LENS_GLOBAL_NAMESPACE_ADDRESS, LENS_GLOBAL_NAMESPACE_ABI } from "@/lib/constants";

interface DiscoveryFormProps {
  // Allow empty string or null when no valid address is found
  onAccountAddressFound: (address: `0x${string}` | "") => void; // Changed type
  initialUsername?: string;
  initialAddress?: string;
}

export function DiscoveryForm({ onAccountAddressFound, initialUsername = "", initialAddress = "" }: DiscoveryFormProps) {
  const [username, setUsername] = useState(initialUsername);
  const [address, setAddress] = useState(initialAddress);
  const [lookupError, setLookupError] = useState<string | null>(null);

  const [lastEdited, setLastEdited] = useState<"username" | "address" | null>(initialUsername ? "username" : initialAddress ? "address" : null);

  const debouncedUsername = useDebounce(username, 500);
  const debouncedAddress = useDebounce(address, 500);

  const {
    data: addressFromUsername,
    isLoading: isLoadingAddress,
    error: addressError,
    refetch: refetchAddress,
  } = useReadContract({
    address: LENS_GLOBAL_NAMESPACE_ADDRESS,
    abi: LENS_GLOBAL_NAMESPACE_ABI,
    functionName: "accountOf",
    args: [debouncedUsername || ""],
    chainId: LENS_CHAIN_ID,
    query: {
      enabled: false,
    },
  });

  const {
    data: usernameFromAddress,
    isLoading: isLoadingUsername,
    error: usernameError,
    refetch: refetchUsername,
  } = useReadContract({
    address: LENS_GLOBAL_NAMESPACE_ADDRESS,
    abi: LENS_GLOBAL_NAMESPACE_ABI,
    functionName: "usernameOf",
    args: [debouncedAddress as `0x${string}`],
    chainId: LENS_CHAIN_ID,
    query: {
      enabled: false,
    },
  });

  useEffect(() => {
    if (debouncedUsername && lastEdited === "username") {
      setLookupError(null);
      console.log(`Looking up address for username: ${debouncedUsername}`);
      refetchAddress();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedUsername, lastEdited]);

  useEffect(() => {
    if (debouncedAddress && isAddress(debouncedAddress) && lastEdited === "address") {
      setLookupError(null);
      console.log(`Looking up username for address: ${debouncedAddress}`);
      refetchUsername();
    } else if (debouncedAddress && !isAddress(debouncedAddress) && lastEdited === "address") {
      setLookupError("Invalid address format");
      onAccountAddressFound(""); // Use empty string
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedAddress, lastEdited]);

  useEffect(() => {
    if (addressFromUsername && isAddress(addressFromUsername) && lastEdited === "username") {
      if (addressFromUsername === "0x0000000000000000000000000000000000000000") {
        setLookupError(`No account found for username "${debouncedUsername}"`);
        setAddress("");
        onAccountAddressFound(""); // Use empty string
      } else {
        console.log(`Found address: ${addressFromUsername}`);
        setAddress(addressFromUsername);
        onAccountAddressFound(addressFromUsername);
        setLookupError(null);
      }
    } else if (addressError && lastEdited === "username") {
      console.error("Error fetching address:", addressError);
      // Check if it's a DoesNotExist error
      if (addressError.message.includes("0xb0ce7591") || addressError.message.includes("DoesNotExist")) {
        setLookupError(`Username "${debouncedUsername}" does not exist`);
      } else {
        setLookupError("Error fetching address. Please try again.");
      }
      onAccountAddressFound(""); // Use empty string
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addressFromUsername, addressError, lastEdited]);

  useEffect(() => {
    if (usernameFromAddress && lastEdited === "address") {
      console.log(`Found username: ${usernameFromAddress}`);
      setUsername(usernameFromAddress);
      if (isAddress(debouncedAddress)) {
        // Ensure address is still valid
        onAccountAddressFound(debouncedAddress as `0x${string}`);
      }
      setLookupError(null);
    } else if (usernameError && lastEdited === "address") {
      console.log("No primary username found for address or error:", usernameError.message);
      setUsername("");
      if (isAddress(debouncedAddress)) {
        onAccountAddressFound(debouncedAddress as `0x${string}`);
      }
      setLookupError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usernameFromAddress, usernameError, lastEdited, debouncedAddress]);

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUsername(e.target.value);
    setLastEdited("username");
    if (lastEdited !== "address") setAddress("");
    onAccountAddressFound(""); // Use empty string
    setLookupError(null);
  };

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setAddress(value);
    setLastEdited("address");
    if (lastEdited !== "username") setUsername("");
    if (!isAddress(value) && value !== "") {
      setLookupError("Invalid address format");
      onAccountAddressFound(""); // Use empty string
    } else {
      setLookupError(null);
      if (isAddress(value)) {
        onAccountAddressFound(value as `0x${string}`);
      } else {
        onAccountAddressFound(""); // Use empty string
      }
    }
  };

  const isLoading = isLoadingAddress || isLoadingUsername;

  return (
    <div className="w-full max-w-md mx-auto space-y-8">
      <div className="text-center space-y-2">
        <p className="text-lg text-gray-600 font-light">To login, please enter your</p>
      </div>

      <div className="space-y-6">
        <div>
          <label htmlFor="username" className="block text-lg font-medium text-gray-700 mb-2">
            Lens Username
          </label>
          <input
            id="username"
            name="username"
            type="text"
            value={username}
            onChange={handleUsernameChange}
            placeholder="e.g. stani"
            className="w-full px-4 py-3 border border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition duration-200"
            aria-describedby="username-status"
            disabled={isLoading && lastEdited === "address"}
          />
        </div>

        <div className="flex items-center justify-center space-x-4">
          <div className="h-px bg-gray-200 w-20"></div>
          <span className="text-xl font-semibold text-gray-400">OR</span>
          <div className="h-px bg-gray-200 w-20"></div>
        </div>

        <div>
          <label htmlFor="address" className="block text-lg font-medium text-gray-700 mb-2">
            Lens Account Address
          </label>
          <input
            id="address"
            name="address"
            type="text"
            value={address}
            onChange={handleAddressChange}
            placeholder="0x..."
            className={`w-full px-4 py-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition duration-200 ${
              !lookupError && isAddress(address) ? "border-green-500" : address && !isAddress(address) ? "border-red-500" : "border-gray-200"
            }`}
            aria-describedby="address-status"
            disabled={isLoading && lastEdited === "username"}
          />
        </div>
      </div>

      {/* Status messages with improved styling */}
      <div className="space-y-2">
        <div id="username-status" aria-live="polite" className="text-sm text-center min-h-[20px]">
          {isLoading && lastEdited === "username" && <span className="text-indigo-600">Checking username...</span>}
        </div>
        <div id="address-status" aria-live="polite" className="text-sm text-center min-h-[20px]">
          {isLoading && lastEdited === "address" && <span className="text-indigo-600">Checking address...</span>}
          {lookupError && <span className="text-red-600">{lookupError}</span>}
          {!lookupError && isAddress(address) && lastEdited !== "username" && <span className="text-green-600">Valid Address</span>}
        </div>
      </div>
    </div>
  );
}
