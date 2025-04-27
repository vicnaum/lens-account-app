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
export const LENS_GLOBAL_NAMESPACE_ADDRESS = "0x1aA55B9042f08f45825dC4b651B64c9F98Af4615";

// --- ABIs ---
export const LENS_GLOBAL_NAMESPACE_ABI = parseAbi([
  "function accountOf(string calldata name) view returns (address)",
  "function usernameOf(address user) view returns (string)",
  "error DoesNotExist()",
]);

// Added owner() function
export const LENS_ACCOUNT_ABI = parseAbi([
  "function owner() view returns (address)",
  "function executeTransaction(address target, uint256 value, bytes calldata data)",
]);

export const WGHO_TOKEN_ADDRESS = "0x6bDc36E20D267Ff0dd6097799f82e78907105e2F";
export const ERC20_ABI = parseAbi(["function balanceOf(address owner) view returns (uint256)"]);
