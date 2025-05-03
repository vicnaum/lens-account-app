// components/DiscoveryForm.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useReadContract } from "wagmi";
import { isAddress, type Address } from "viem";
import { useDebounce } from "@/hooks/useDebounce";
import { LENS_CHAIN_ID, LENS_GLOBAL_NAMESPACE_ADDRESS, LENS_GLOBAL_NAMESPACE_ABI } from "@/lib/constants";

// Import icons from Heroicons
import { CheckCircleIcon, ExclamationTriangleIcon, ArrowPathIcon } from "@heroicons/react/24/solid";

interface DiscoveryFormProps {
  // Update the callback prop definition
  onAccountDetailsFound: (details: { address: Address | ""; username: string }) => void;
  initialUsername?: string;
  initialAddress?: string;
}

// Add a StatusMessage component for consistent styling
function StatusMessage({ type, message }: { type: "loading" | "error" | "success"; message: string }) {
  return (
    <div
      className={`flex items-center justify-center gap-2 text-sm font-medium ${
        type === "loading" ? "text-indigo-600" : type === "error" ? "text-red-600" : "text-green-600"
      }`}
    >
      {type === "loading" && <ArrowPathIcon className="w-4 h-4 animate-spin" />}
      {type === "error" && <ExclamationTriangleIcon className="w-4 h-4" />}
      {type === "success" && <CheckCircleIcon className="w-4 h-4" />}
      <span>{message}</span>
    </div>
  );
}

export function DiscoveryForm({ onAccountDetailsFound, initialUsername = "", initialAddress = "" }: DiscoveryFormProps) {
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
      onAccountDetailsFound({ address: "", username: "" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedAddress, lastEdited]);

  useEffect(() => {
    if (addressFromUsername && isAddress(addressFromUsername) && lastEdited === "username") {
      if (addressFromUsername === "0x0000000000000000000000000000000000000000") {
        setLookupError(`No account found for username "${debouncedUsername}"`);
        setAddress("");
        onAccountDetailsFound({ address: "", username: debouncedUsername || "" });
      } else {
        console.log(`Found address: ${addressFromUsername}`);
        setAddress(addressFromUsername);
        onAccountDetailsFound({ address: addressFromUsername, username: debouncedUsername || "" });
        setLookupError(null);
      }
    } else if (addressError && lastEdited === "username") {
      console.error("Error fetching address:", addressError);
      if (addressError.message.includes("0xb0ce7591") || addressError.message.includes("DoesNotExist")) {
        setLookupError(`Username "${debouncedUsername}" does not exist`);
      } else {
        setLookupError("Error fetching address. Please try again.");
      }
      onAccountDetailsFound({ address: "", username: debouncedUsername || "" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addressFromUsername, addressError, lastEdited, debouncedUsername]);

  useEffect(() => {
    if (usernameFromAddress && lastEdited === "address") {
      console.log(`Found username: ${usernameFromAddress}`);
      setUsername(usernameFromAddress);
      if (isAddress(debouncedAddress)) {
        onAccountDetailsFound({ address: debouncedAddress as Address, username: usernameFromAddress });
      }
      setLookupError(null);
    } else if (usernameError && lastEdited === "address") {
      console.log("No primary username found for address or error:", usernameError.message);
      setUsername("");
      if (isAddress(debouncedAddress)) {
        onAccountDetailsFound({ address: debouncedAddress as Address, username: "" });
      }
      setLookupError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usernameFromAddress, usernameError, lastEdited, debouncedAddress]);

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleanValue = e.target.value.replace(/\s+/g, "");
    setUsername(cleanValue);
    setLastEdited("username");
    if (lastEdited !== "address") setAddress("");
    onAccountDetailsFound({ address: "", username: cleanValue });
    setLookupError(null);
  };

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleanValue = e.target.value.replace(/\s+/g, "");
    setAddress(cleanValue);
    setLastEdited("address");
    if (lastEdited !== "username") setUsername("");
    if (!isAddress(cleanValue) && cleanValue !== "") {
      setLookupError("Invalid address format");
      onAccountDetailsFound({ address: "", username: "" });
    } else {
      setLookupError(null);
      if (isAddress(cleanValue)) {
        onAccountDetailsFound({ address: cleanValue as Address, username: "" });
      } else {
        onAccountDetailsFound({ address: "", username: "" });
      }
    }
  };

  const isLoading = isLoadingAddress || isLoadingUsername;

  return (
    <div className="w-full max-w-md mx-auto space-y-8">
      <div className="text-center space-y-2">
        <p className="text-base text-gray-500">To login, please enter your</p>
      </div>

      <div className="space-y-6">
        <div>
          <label htmlFor="username" className="block text-sm font-semibold text-gray-700 mb-2">
            Lens Username
          </label>
          <input
            id="username"
            name="username"
            type="text"
            value={username}
            onChange={handleUsernameChange}
            placeholder="e.g. stani"
            className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white transition duration-200"
            aria-describedby="username-status"
            disabled={isLoading && lastEdited === "address"}
          />
        </div>

        <div className="relative flex items-center justify-center my-6">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-gray-200"></div>
          </div>
          <div className="relative flex justify-center">
            <span className="bg-white px-2 text-sm font-medium text-gray-500">OR</span>
          </div>
        </div>

        <div>
          <label htmlFor="address" className="block text-sm font-semibold text-gray-700 mb-2">
            Lens Account Address
          </label>
          <input
            id="address"
            name="address"
            type="text"
            value={address}
            onChange={handleAddressChange}
            placeholder="0x..."
            className={`w-full px-4 py-3 bg-gray-50 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white transition duration-200 ${
              !lookupError && isAddress(address) ? "border-green-500" : address && !isAddress(address) ? "border-red-500" : "border-gray-300"
            }`}
            aria-describedby="address-status"
            disabled={isLoading && lastEdited === "username"}
          />
        </div>
      </div>

      {/* Status messages with improved styling */}
      <div className="min-h-[28px] flex justify-center">
        {isLoading && lastEdited === "username" && <StatusMessage type="loading" message="Checking username..." />}
        {isLoading && lastEdited === "address" && <StatusMessage type="loading" message="Checking address..." />}
        {lookupError && <StatusMessage type="error" message={lookupError} />}
        {!lookupError && isAddress(address) && lastEdited !== "username" && <StatusMessage type="success" message="Valid Address" />}
      </div>
    </div>
  );
}
