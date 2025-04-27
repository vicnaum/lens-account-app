"use client";

import { type Address } from "viem";

interface OwnerPanelProps {
  ownerAddress: Address;
}

export function OwnerPanel({ ownerAddress }: OwnerPanelProps) {
  const handleChangeOwnerClick = () => {
    // Placeholder: Functionality to show change owner form will be added later
    console.log("Placeholder: Initiate Change Owner flow");
    alert("Change Owner functionality not yet implemented.");
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4 text-gray-700">Account Owner</h2>
      <div className="bg-gray-50 p-3 rounded-md border border-gray-200 mb-4">
        <p className="text-sm font-mono text-gray-700 break-all">{ownerAddress}</p>
      </div>
      <button onClick={handleChangeOwnerClick} className="text-sm text-indigo-600 hover:text-indigo-800 hover:underline">
        Change Owner
      </button>
      {/* Placeholder for expandable section - logic will be added later */}
      {/* {isChangingOwner && ( ... form ... ) } */}
    </div>
  );
}
