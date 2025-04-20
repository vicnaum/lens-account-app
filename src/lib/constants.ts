// lib/constants.ts
import { defineChain, parseAbi } from "viem";

export const LENS_CHAIN_ID = 232;

export const lensChain = defineChain({
  id: LENS_CHAIN_ID,
  name: "Lens Chain",
  nativeCurrency: { name: "GHO", symbol: "GHO", decimals: 18 },
  rpcUrls: {
    default: {
      http: ["https://rpc.lens.xyz"],
    },
  },
  blockExplorers: {
    default: { name: "Lens Explorer", url: "https://explorer.lens.xyz" },
  },
  testnet: false,
});

// --- Contract Addresses ---
// IMPORTANT: Replace with the actual deployed address on Lens Chain
export const LENS_GLOBAL_NAMESPACE_ADDRESS =
  "0x1aA55B9042f08f45825dC4b651B64c9F98Af4615"; // Example, Replace Me!

// --- ABIs (Minimal for Stage 1) ---
// Removed 'as const'
export const LENS_GLOBAL_NAMESPACE_ABI = parseAbi([
  "function accountOf(string calldata name) view returns (address)",
  "function usernameOf(address user) view returns (string)",
]);

// Removed 'as const'
export const LENS_ACCOUNT_ABI = parseAbi([
  "function owner() view returns (address)",
  "function executeTransaction(address target, uint256 value, bytes calldata data)",
]);

// Removed 'as const'
// IMPORTANT: Replace with the actual WGHO address on Lens Chain
export const WGHO_TOKEN_ADDRESS = "0xYOUR_WGHO_TOKEN_ADDRESS"; // Example, Replace Me!
export const ERC20_ABI = parseAbi([
  "function balanceOf(address owner) view returns (uint256)",
]);
