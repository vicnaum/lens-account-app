**Version:** 1.0
**Date:** 2025-04-19

## 1. Introduction

This document outlines the phased development plan for building the Minimum Viable Product (MVP) of the Lens Account Web Interface. It breaks down the work into manageable stages, aligning with the Functional Specification (`Spec.functional.md`) and Technical Specification (`TECHNICAL_SPEC.md`).

## 2. Methodology

We will follow an incremental development approach, building and verifying core features stage by stage. Each stage should result in a testable piece of functionality.

## 3. Development Stages

### Stage 0: Project Setup & Base Configuration (Completed via Setup)

- [x] Initialize Next.js 15+ project with TypeScript, Tailwind CSS, App Router.
- [x] Install pnpm as the package manager.
- [x] Install core dependencies: `wagmi`, `viem`, `@tanstack/react-query`, `connectkit`, `@reown/walletkit`, `@walletconnect/core`, `@walletconnect/utils`.
- [x] Set up basic ESLint and Prettier configuration.
- [x] Create `.env.local` with `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` placeholder.
- [x] Configure `WagmiProvider` and `QueryClientProvider` in the root layout (`app/layout.tsx`).
  - **Check:** Development server runs (`pnpm dev`) without errors. Base Next.js page loads.

### Stage 1: Account Discovery & Chain Read Interaction

**Goal:** Implement the username/address input fields and the logic to look up corresponding data from the `LensGlobalNamespace` contract on the Lens Chain. Verify basic read operations work.

- **Tasks:**
  - [x] **Create Constants:** Define Lens Chain details (ID 232, RPC URL, etc.), `LensGlobalNamespace` address, and its partial ABI (`accountOf(string)`, `usernameOf(address)`) in `lib/constants.ts`.
  - [x] **Update Wagmi Config:** Ensure the `lensChain` object is defined using `defineChain` and included in the `createConfig` call in `lib/wagmi.ts`.
  - [x] **Create DiscoveryForm Component:** Build `components/DiscoveryForm.tsx` with two controlled input fields (Username, Account Address) styled with Tailwind.
  - [x] **Implement Lookup Logic:**
    - [x] Inside `DiscoveryForm.tsx` or a custom hook (`hooks/useLensLookup.ts`), use `useState` for input values.
    - [x] Use `useEffect` with a debounce utility (e.g., from `lodash.debounce` or simple `setTimeout`) to trigger lookups on input change.
    - [x] Call `useReadContract` (Wagmi) within the debounced effect:
      - Target `LensGlobalNamespace` address.
      - Use the appropriate function (`accountOf` or `usernameOf`) based on which input changed.
      - **Crucially:** Pass `chainId: LENS_CHAIN_ID` to ensure the call targets the correct network.
      - Handle loading and error states from `useReadContract`.
    - [x] Update the _other_ input field's state based on the successful result from `useReadContract`.
  - [x] **Integrate Form:** Place `DiscoveryForm.tsx` onto the root page (`app/page.tsx`).
- **Verification:**
  - [x] Typing a known Lens username (e.g., `stani`) correctly populates the Account Address field.
  - [x] Typing/pasting a known Lens Account address correctly populates the Lens Username field (if one exists).
  - [x] Invalid inputs show no result or subtle error indication.
  - [x] Check browser developer console for any Wagmi/Viem errors related to contract reads. Network tab should show RPC calls to the Lens Chain RPC URL.

### Stage 2: Owner EOA Connection & Verification

**Goal:** Integrate the "Connect Wallet" functionality, fetch the Lens Account owner, verify it against the connected EOA, handle chain switching, and navigate to the dashboard.

- **Tasks:**
  - [x] **Add Owner ABI:** Include the `owner()` function signature in the `LENS_ACCOUNT_ABI` within `lib/constants.ts`.
  - [x] **Create Connect Button:** Build `components/ConnectOwnerButton.tsx`. Use ConnectKit's `<ConnectKitButton />` or its underlying hooks (`useModal`, etc.) for the UI.
  - [x] **Fetch Expected Owner:**
    - In `app/page.tsx`, once a valid Lens Account address is determined (from Stage 1 state), use `useReadContract` to call `owner()` on the Lens Account address.
    - Pass `chainId: LENS_CHAIN_ID`.
    - Store the result in state (`expectedOwner`).
  - [x] **Display Expected Owner:** Show the `expectedOwner` address clearly near the `ConnectOwnerButton`.
  - [x] **Integrate Connect Button:** Add `ConnectOwnerButton` to `app/page.tsx`, potentially disabling it until `expectedOwner` is fetched.
  - [ ] **Implement Verification Logic:**
    - In `app/page.tsx`, use `useAccount` (Wagmi) to get the connected EOA's `address` and `chainId`.
    - Use `useEffect` to monitor changes in the connected `address`, `chainId`, and the `expectedOwner`.
    - Inside the effect:
      - If `address` and `expectedOwner` exist:
        - If `chainId !== LENS_CHAIN_ID`, do nothing (ConnectKit/Wagmi handle switch prompt).
        - If `address.toLowerCase() === expectedOwner.toLowerCase()` and `chainId === LENS_CHAIN_ID`, proceed to navigation.
        - If `address.toLowerCase() !== expectedOwner.toLowerCase()` and `chainId === LENS_CHAIN_ID`, set an error state ("Incorrect owner connected...").
      - If `address` is disconnected, clear any error state.
  - [ ] **Implement Navigation:**
    - Use `useRouter` from `next/navigation`.
    - When verification passes (addresses match, correct chain), call `router.push('/dashboard')`.
  - [ ] **Create Context (Optional but Recommended):** Create `contexts/LensAccountProvider.tsx` to store the verified `lensAccountAddress` and `ownerAddress` so the dashboard can access them. Wrap the root layout or dashboard layout with this provider. Update `app/page.tsx` to set context values upon successful verification before navigating.
- **Verification:**
  - [ ] "Connect Wallet" button appears/enables only when a Lens Account address is set and `owner()` has been potentially fetched. Expected owner address is displayed.
  - [ ] Clicking "Connect Wallet" opens the ConnectKit modal.
  - [ ] Connecting the _correct_ Owner EOA wallet on the wrong network prompts a "Switch Network" request to Lens Chain.
  - [ ] Connecting the _correct_ Owner EOA wallet on the Lens Chain navigates the user to `/dashboard`.
  - [ ] Connecting an _incorrect_ EOA wallet (not the owner) on the Lens Chain displays a clear error message and _does not_ navigate.
  - [ ] Disconnecting the wallet returns the user to the login/discovery state or clears the owner state.

### Stage 3: Basic Dashboard Display

**Goal:** Create the dashboard page and display the Lens Account address and its WGHO balance.

- **Tasks:**
  - [ ] **Create Dashboard Page:** Create `app/dashboard/page.tsx`. Ensure it's protected or redirects if owner/lens account state (from Context) is missing.
  - [ ] **Add WGHO Constants:** Define `WGHO_TOKEN_ADDRESS` and `ERC20_ABI` (with `balanceOf(address)`) in `lib/constants.ts`.
  - [ ] **Create AccountDisplay Component:** Build `components/AccountDisplay.tsx`.
  - [ ] **Fetch/Display Data:**
    - In `AccountDisplay.tsx`, retrieve the `lensAccountAddress` from context (e.g., `useContext(LensAccountContext)`).
    - Use `useReadContract` (Wagmi) to call `balanceOf(lensAccountAddress)` on the `WGHO_TOKEN_ADDRESS`.
    - Pass `chainId: LENS_CHAIN_ID`.
    - Use Viem's `formatUnits` to format the returned balance (assuming WGHO has 18 decimals).
    - Display the `lensAccountAddress` and the formatted WGHO balance. Handle loading/error states for the balance fetch.
  - [ ] **Integrate Component:** Add `AccountDisplay` to the dashboard page.
- **Verification:**
  - [ ] Navigating to `/dashboard` after successful login shows the correct Lens Account address.
  - [ ] The WGHO balance for the Lens Account is fetched and displayed correctly (or shows loading/error state).

### Stage 4: WalletConnect v2 Pairing (Act as Wallet)

**Goal:** Implement the WalletConnect URI input and pairing logic, allowing the web app (representing the Lens Account) to connect to external dApps.

- **Tasks:**
  - [ ] **Create WC Service:** Set up `services/walletConnectService.ts`. Include an `init` method that creates a `Web3Wallet` instance from `@reown/walletkit` using the `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`. Store the instance.
  - [ ] **Create WC Context:** Set up `contexts/WalletConnectProvider.tsx`. Initialize the `walletConnectService` on mount. Provide the `web3wallet` instance, active sessions state (`useState`), pairing state (`useState`), and pending request state (`useState`) via context.
  - [ ] **Wrap Layout:** Wrap the relevant part of the application (e.g., dashboard layout or root layout) with `WalletConnectProvider`.
  - [ ] **Create WcConnect Component:** Build `components/WcConnect.tsx`.
    - Include an `<input>` for the WC URI and a `<button>` ("Connect").
    - Add state for the input value.
    - On button click, call a `pair` function provided by the `WalletConnectContext`.
  - [ ] **Implement Pairing Logic:**
    - In `WalletConnectProvider` (or the service), define the `pair(uri)` function. Call `web3wallet.core.pairing.pair({ uri })`. Handle potential errors.
    - Set up the `session_proposal` listener (`web3wallet.on('session_proposal', handleSessionProposal)`).
  - [ ] **Implement Session Approval:**
    - Define `handleSessionProposal(proposal)` in the service/provider.
    - Retrieve the `lensAccountAddress` and `LENS_CHAIN_ID` from state/constants.
    - Construct the `approvedNamespaces` object containing only the `eip155` namespace, with the `LENS_CHAIN_ID`, the Lens Account address (formatted as `eip155:232:0x...`), required methods (`eth_sendTransaction`, `personal_sign`, etc.), and events (`chainChanged`, `accountsChanged`).
    - Call `web3wallet.approveSession({ id: proposal.id, namespaces: approvedNamespaces })`.
    - On success, update the `activeSessions` state in the context.
    - Handle potential errors during approval.
  - [ ] **Update UI:** Modify `WcConnect.tsx` to:
    - Conditionally render the input/button form OR the connected dApp info based on `activeSessions` state from context.
    - Display dApp metadata (name, icon, url) from the active session.
- **Verification:**
  - [ ] Open the dashboard page. The WC input form is visible.
  - [ ] Go to a test dApp (e.g., Reown's React Dapp Example) and generate a WC v2 URI.
  - [ ] Paste the URI into the input field in _this_ app and click "Connect".
  - [ ] The connection should establish successfully (no prompt needed in the Owner EOA wallet for pairing/session _approval_ in this flow).
  - [ ] The `WcConnect.tsx` component should update to show the connected dApp's information. Check the dApp, it should also show a successful connection to the _Lens Account address_.

### Stage 5: WalletConnect v2 Transaction Request Handling

**Goal:** Handle incoming `eth_sendTransaction` requests from the connected dApp, prompt the Owner EOA for approval via the Lens Account's `executeTransaction`, and relay the result.

- **Tasks:**
  - [ ] **Create WcRequestDisplay Component:** Build `components/WcRequestDisplay.tsx`. It should conditionally render based on the `pendingRequest` state from `WalletConnectContext`. Display request details (`to`, `value`, `data` hex string) and "Send Transaction" / "Reject" buttons.
  - [ ] **Implement Request Listener:**
    - In `WalletConnectProvider` (or service), set up the `session_request` listener (`web3wallet.on('session_request', handleSessionRequest)`).
    - Define `handleSessionRequest(event)`: Store the `event.topic`, `event.id`, and `event.params.request` (`{ method, params }`) in the `pendingRequest` state of the context. Only handle `eth_sendTransaction` for MVP.
  - [ ] **Implement Transaction Execution Logic:**
    - Create `hooks/useWcRequestHandler.ts` or add logic to `WcRequestDisplay.tsx`.
    - On "Send Transaction" click:
      - Get `lensAccountAddress`, `ownerAddress` from relevant contexts.
      - Get `topic`, `id`, `request` (`method`, `params`) from `WalletConnectContext.pendingRequest`.
      - Extract `to`, `value`, `data` from `request.params[0]`.
      - Call `useWriteContract` (Wagmi) hook configured for the `executeTransaction` function on the `LENS_ACCOUNT_ABI` and `lensAccountAddress`.
      - The `args` for `executeTransaction` will be `[to, value || 0n, data || '0x']`.
      - Pass `account: ownerAddress` and `chainId: LENS_CHAIN_ID` to `useWriteContract`'s mutation function.
      - Use `useWaitForTransactionReceipt` to wait for the transaction hash returned by `writeContract`.
  - [ ] **Implement Response Logic:**
    - Modify the "Send Transaction" click handler:
      - On `writeContract` success: Wait for the receipt. If receipt status is `'success'`, call `web3wallet.respondSessionRequest({ topic, response: { id, result: receipt.transactionHash, jsonrpc: '2.0' } })`.
      - If receipt status is `'reverted'`, call `web3wallet.respondSessionRequest` with a JSON-RPC error payload (e.g., `{ id, jsonrpc: '2.0', error: { code: -32000, message: 'Transaction reverted' } }`).
      - On `writeContract` error (e.g., user rejection in EOA wallet): Call `web3wallet.respondSessionRequest` with a user rejection error payload (`{ id, jsonrpc: '2.0', error: { code: 5000, message: 'User Rejected' } }`).
    - On "Reject" click: Call `web3wallet.respondSessionRequest` with a user rejection error payload.
    - After responding (success or error), clear the `pendingRequest` state in the context.
  - [ ] **Integrate Component:** Add `WcRequestDisplay` to the dashboard page.
- **Verification:**
  - [ ] Connect to a test dApp (e.g., Aave testnet interface pointed to Lens Chain RPC, or a simple custom test page).
  - [ ] Initiate a transaction on the test dApp (e.g., a simple contract call or ETH transfer _if possible via the dApp_).
  - [ ] The `WcRequestDisplay` component should appear in _this_ app showing the request details.
  - [ ] Clicking "Reject" should send an error to the dApp and hide the request display.
  - [ ] Clicking "Send Transaction" should:
    - Prompt the _Owner EOA wallet_ (MetaMask, etc.) to confirm the `executeTransaction` call on the Lens Account.
    - Rejecting in the Owner EOA wallet sends an error to the dApp.
    - Confirming in the Owner EOA wallet sends the transaction.
    - Upon successful mining, the transaction hash is sent back to the dApp, and the request display hides. Success feedback is shown.
    - If the on-chain execution reverts, an error is sent back to the dApp, and the request display hides. Error feedback is shown.

## 4. Post-MVP Considerations

- Implement handling for other WalletConnect methods (`personal_sign`, etc.).
- Add UI for managing active WalletConnect sessions (viewing, disconnecting).
- Improve transaction data decoding in the request display.
- Enhance error messages and user feedback.
- Refine UI/UX, add loading states more granularly.
- Mobile responsiveness.
