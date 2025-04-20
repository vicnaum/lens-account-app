# Analysis of Gnosis Safe Web App Connection Mechanisms

This document analyzes how the Gnosis Safe web application handles:

1.  Connecting an Owner's Externally Owned Account (EOA) wallet to the interface.
2.  Connecting the Safe smart contract itself to external dApps using WalletConnect v2.
3.  The underlying technology stack used for these features, based on the provided code structure and `package.json`.

---

## 1. Owner EOA Wallet Connection (User -> Safe Web App)

This flow allows users (Owners, Proposers, or just viewers) to connect their personal wallets (like MetaMask, Ledger, Trezor, WalletConnect mobile apps) to the Safe web interface to interact with it.

**a) High-Level Overview:**

The Safe web app uses a dedicated wallet connection library (**Web3-Onboard**) to manage connections with various EOA wallets. This library abstracts the complexities of different wallet types (injected, hardware, mobile via WalletConnect). Once connected, the application retrieves the user's address and chain ID and uses this information to determine permissions (owner, proposer) and interact with the blockchain _on behalf of the user_ (e.g., signing transactions meant for the Safe).

**b) Key Libraries/Modules Involved:**

- **`@web3-onboard/core` & related modules (`@web3-onboard/injected-wallets`, `@web3-onboard/walletconnect`, `@web3-onboard/ledger`, etc.):** This is the primary library orchestrating the wallet connection flow.
  - _Evidence:_ `hooks/wallets/useOnboard.ts`, `services/onboard.ts`, `hooks/wallets/wallets.ts`.
- **`ethers`:** Used under the hood by Web3-Onboard and likely for interacting with the connected wallet's provider to sign messages/transactions.
  - _Evidence:_ Standard web3 library, presence in `package.json`.
- **React Context / Hooks:** To manage and access the connected wallet's state throughout the application.
  - _Evidence:_ `hooks/wallets/useWallet.ts`, `components/common/WalletProvider/index.tsx`.
- **Redux Toolkit:** To store session state, potentially including details about the connected wallet fetched after connection.
  - _Evidence:_ Presence of `/store` directory with slices like `sessionSlice.ts`.
- **UI Components:** React components for the "Connect Wallet" button and displaying connected account info.
  - _Evidence:_ `components/common/ConnectWallet/` directory, `components/common/WalletOverview/index.tsx`.

**c) Step-by-Step Flow (Inferred):**

1.  **Initiation:** User clicks a "Connect Wallet" button (likely `components/common/ConnectWallet/ConnectWalletButton.tsx`).
2.  **Onboard Trigger:** This action calls a function (e.g., from `hooks/wallets/useConnectWallet.ts`) that utilizes the `useOnboard` hook to trigger `onboard.connectWallet()`.
3.  **Wallet Selection:** Web3-Onboard displays its modal, allowing the user to select their preferred wallet type.
4.  **Connection:** Web3-Onboard handles the specific connection protocol for the chosen wallet (e.g., requesting accounts from MetaMask, initiating a WalletConnect pairing for a mobile wallet).
5.  **State Update:** Upon successful connection, Web3-Onboard updates its internal state. The Safe app subscribes to these state changes (likely via `onboard.state.select('wallets')` within `hooks/wallets/useOnboard.ts` or similar).
6.  **Application State:** The application updates its own state (potentially Redux `sessionSlice` or a React Context via `WalletProvider`) with the connected wallet's details (address, chainId, provider object, label, icon). The `useWallet` hook likely reads from this state.
7.  **UI Update:** Components like the Header re-render to show the connected wallet information (`components/common/ConnectWallet/AccountCenter.tsx`, `components/common/WalletOverview/index.tsx`).
8.  **Chain Check:** The application compares the connected wallet's `chainId` with the target Safe's chain ID. If they don't match, UI elements like `ChainSwitcher` (`components/common/ChainSwitcher/index.tsx`) prompt the user to switch networks using the wallet's provider (`wallet_switchEthereumChain`). Custom RPCs might be configured via `settingsSlice.ts`.

**d) Verification/Checks:**

- **Connection Success:** Handled by Web3-Onboard.
- **Chain Compatibility:** Checks if the wallet is connected to the same chain as the currently viewed Safe. Prompts for switching if necessary.
- **Ownership/Permissions:** This check happens _after_ connection, typically when the user attempts an action requiring specific rights (e.g., signing a transaction). Hooks like `useIsSafeOwner` compare the connected `wallet.address` with the `safe.owners` list.

---

## 2. Safe WalletConnect Connection (Safe -> External dApp)

This flow allows the Safe itself (represented by the web interface) to act as a WalletConnect v2 client (a "wallet") to connect to external dApps like Aave, Uniswap, etc.

**a) High-Level Overview:**

The Safe web app integrates the core WalletConnect v2 SDK (`@walletconnect/web3wallet`) directly. It manages the lifecycle of WC sessions initiated _by_ the Safe interface. When an external dApp sends a request (like signing or sending a transaction), the Safe interface intercepts it, presents it to the connected Owner(s), orchestrates the multi-signature process (if needed) using the Owner EOA(s), executes the transaction via the Safe contract, and finally relays the result (tx hash or error) back to the dApp via the WC session.

**b) Key Libraries/Modules Involved:**

- **`@walletconnect/web3wallet` (or `@walletconnect/sign-client` / `@walletconnect/core` used internally by a wrapper):** The core SDK for implementing the WalletConnect v2 protocol _as a wallet_.
  - _Evidence:_ `features/walletconnect/` directory, especially `services/WalletConnectWallet.ts`. While the direct import isn't visible in the file list summary, the functionality described requires this or its constituent parts. Its presence is confirmed in `package.json`.
- **`ethers`:** Used for constructing, signing (EIP-712), and sending the final Safe transaction (`execTransaction` or similar).
  - _Evidence:_ Standard web3 library, presence in `package.json`.
- **React Context/Hooks:** Likely `WalletConnectContext.tsx` to manage the state of WC sessions and pending requests across the app. Custom hooks (`useWalletConnectSessions`, `useWcUri`) manage specific UI interactions.
- **Redux Toolkit:** Potentially used alongside or instead of Context to store active sessions and pending request details.
- **UI Components:** For pasting URIs, displaying session proposals, showing incoming requests, and managing active sessions.
  - _Evidence:_ `features/walletconnect/components/` like `WcInput.tsx`, `WcProposalForm.tsx`, `WcSessionList.tsx`, `WcSessionManager.tsx`.
- **Safe Transaction Logic:** Code to prepare and execute transactions _through the Safe contract_, involving signature collection from owners.
  - _Evidence:_ Transaction-related directories (`components/transactions`, `services/tx`), signing hooks (`useSignTypedData` via `wagmi`/ethers likely used here for owner signatures).

**c) Step-by-Step Flow (Inferred):**

1.  **Pairing Initiation:**
    - User obtains a WC v2 URI from an external dApp.
    - User pastes the URI into an input field (`WcInput.tsx`). `useWcUri` manages URI input (including from URL params or clipboard via `useWalletConnectClipboardUri`).
    - A "Connect" button click triggers pairing via a service/hook (`WalletConnectWallet.ts` likely wraps this).
    - This calls `@walletconnect/web3wallet`'s `core.pairing.pair({ uri })`.
2.  **Session Proposal:**
    - The `WalletConnectWallet` service listens for the `session_proposal` event from the SDK.
    - The UI displays the proposal details (`WcProposalForm.tsx`), including requested chains/methods and dApp metadata. It performs compatibility checks (`useCompatibilityWarning.ts`).
3.  **Session Approval:**
    - User clicks "Approve".
    - The `WalletConnectWallet` service calls `@walletconnect/web3wallet`'s `approveSession`, constructing the `namespaces` based on the current Safe's chain ID, address, and supported methods/events.
    - The session is established and likely stored in application state (Context/Redux). `WcSessionManager.tsx` might handle displaying/managing these.
4.  **Request Handling:**
    - External dApp sends a JSON-RPC request (`eth_sendTransaction`, `eth_signTypedData_v4`, etc.) via the session topic.
    - The `WalletConnectWallet` service listens for the `session_request` event.
    - Upon receiving a request, the application displays the request details in a modal or dedicated UI area (potentially using `TxModalContext` and a specific flow).
5.  **Owner Authorization & Execution:**
    - The request details (target contract, value, data) are presented to the user (connected Owner EOA).
    - If the request is `eth_sendTransaction`, the application prepares the arguments for the Safe's `executeTransaction` method.
    - The application initiates the Safe's signing process (this uses the flow described in **Section 1** for the _connected Owner EOA_):
      - Collect required owner signatures (usually EIP-712 signing of the Safe transaction hash). This involves prompting the Owner's connected wallet (MetaMask etc.) via `ethers` or `wagmi` hooks.
      - Assemble the final transaction data calling `executeTransaction` on the Safe, including the collected signatures.
    - An authorized Owner EOA sends this final transaction to the blockchain.
6.  **Response:**
    - The application waits for the transaction hash of the _Safe execution transaction_.
    - The `WalletConnectWallet` service calls `@walletconnect/web3wallet`'s `respondSessionRequest` with the result (tx hash) or an error (e.g., user rejection).
    - The UI updates to reflect the outcome.

**d) Verification/Checks:**

- **URI Validity:** Checks if the pasted string is a valid `wc:` URI (`isPairingUri`).
- **Chain Compatibility:** Verifies if the dApp's requested chains include the Safe's current chain during session proposal.
- **Method Support:** Ensures requested methods are supported/allowed.
- **Signature Verification:** The Safe contract itself verifies the collected owner signatures during `executeTransaction`.
- **Origin Verification:** WalletConnect SDK v2 includes verification steps (Verify API) to check the dApp's origin domain against the request source (`ProposalVerification.tsx`).

---

## 3. Tech Stack Summary (from `package.json` & Inferred Usage)

- **Core Framework:** `next`, `react`, `react-dom`
- **Web3 Interaction:**
  - `ethers` (v6): Foundational library.
  - `@safe-global/protocol-kit`: Likely used for constructing Safe transactions and interacting with the SDK.
  - `@safe-global/safe-core-sdk-types`: Core types for Safe interactions.
- **Wallet Connection (Owner EOA):**
  - `@web3-onboard/core`: Main wallet connection library.
  - `@web3-onboard/injected-wallets`, `@web3-onboard/walletconnect`, `@web3-onboard/ledger`, `@web3-onboard/coinbase`, etc.: Specific wallet modules for Web3-Onboard.
- **WalletConnect (Safe as Wallet):**
  - `@walletconnect/core` (v2): Core protocol logic.
  - `@walletconnect/sign-client` (v2) or `@reown/walletkit` (a wrapper using `@walletconnect/web3wallet`): Client for handling WC v2 sessions and requests _as a wallet_. The presence of `@reown/walletkit` suggests it might be the primary interface used in the provided code.
  - `@walletconnect/utils`: Utility functions for WC.
- **State Management:** `@reduxjs/toolkit`, `react-redux`
- **UI Components:** `@mui/material`, `@mui/icons-material`, `@emotion/react`, `@emotion/styled`
- **Routing:** `next/router` (built into Next.js)
- **Utilities:** `lodash`, `date-fns`, `classnames`
- **Backend Interaction:** `@safe-global/safe-gateway-typescript-sdk`, `@safe-global/safe-client-gateway-sdk` (for fetching Safe info, transaction history, etc.)
- **Testing:** `jest`, `@testing-library/react`, `cypress`
- **Linting/Formatting:** `eslint`, `prettier`
- **Build/Dev:** `typescript`, `next`, `babel`

**Conclusion:**

The Gnosis Safe web app uses **Web3-Onboard** for connecting Owner EOA wallets and the **WalletConnect v2 SDK (`@walletconnect/web3wallet` or similar core/sign-client, possibly via `@reown/walletkit`)** to enable the Safe itself to connect to external dApps. The architecture involves distinct services and UI components to handle these two different connection types, underpinned by `ethers` for blockchain interaction and likely Redux for managing the complex state involved, especially with WalletConnect sessions and requests.
