// src/contexts/WalletConnectProvider.tsx
"use client";

import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback, useMemo } from "react";
import { WalletConnectService } from "@/services/walletConnectService";
import { SessionTypes } from "@walletconnect/types";
import { IWalletKit, WalletKitTypes } from "@reown/walletkit";
import { buildApprovedNamespaces, getSdkError } from "@walletconnect/utils";
import { useLensAccount } from "./LensAccountContext";
import { LENS_CHAIN_ID } from "@/lib/constants";

// Define the state including initialization status
interface WalletConnectContextState {
  walletConnectService: WalletConnectService | null;
  walletKitInstance: IWalletKit | null;
  activeSessions: Record<string, SessionTypes.Struct>;
  pair: (uri: string) => Promise<void>;
  disconnect: (topic: string) => Promise<void>;
  isLoading: boolean; // General loading/busy state
  isInitializing: boolean; // Specific initialization state
  isPairing: boolean; // Specific pairing state
  error: string | null;
  isInitialized: boolean; // Track service readiness
}

const WalletConnectContext = createContext<WalletConnectContextState | undefined>(undefined);

interface WalletConnectProviderProps {
  children: ReactNode;
}

const DAPP_METADATA: WalletKitTypes.Metadata = {
  name: "Lens Account Interface",
  description: "Interface for managing Lens Account via WalletConnect",
  url: typeof window !== "undefined" ? window.location.origin : "http://localhost:3000",
  icons: ["/favicon.ico"],
};

export function WalletConnectProvider({ children }: WalletConnectProviderProps) {
  const [walletConnectService, setWalletConnectService] = useState<WalletConnectService | null>(null);
  const [walletKitInstance, setWalletKitInstance] = useState<IWalletKit | null>(null);
  const [activeSessions, setActiveSessions] = useState<Record<string, SessionTypes.Struct>>({});
  const [isInitializing, setIsInitializing] = useState(true); // Start initializing
  const [isPairing, setIsPairing] = useState(false); // Track pairing status separately
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false); // Track service readiness

  const { lensAccountAddress } = useLensAccount();
  const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

  // --- Initialization Effect ---
  useEffect(() => {
    if (!projectId) {
      console.error("NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not set!");
      setError("WalletConnect Project ID is missing.");
      setIsInitializing(false);
      setIsInitialized(false); // Mark as not initialized
      return;
    }

    // Only run initialization once
    if (!walletConnectService && !isInitialized && isInitializing) {
      console.log("Creating and initializing WalletConnectService...");
      const service = new WalletConnectService(projectId, DAPP_METADATA);
      setWalletConnectService(service); // Set service instance immediately

      service
        .init() // init now returns the instance or undefined
        .then((instance) => {
          if (instance) {
            setWalletKitInstance(instance);
            setActiveSessions(instance.getActiveSessions() || {});
            setIsInitialized(true); // Mark as initialized *after* successful init
            console.log("WalletConnectService initialized successfully in Provider.");
          } else {
            setError("Failed to initialize WalletKit instance.");
            setIsInitialized(false);
          }
        })
        .catch((initError: unknown) => {
          console.error("Initialization failed:", initError);
          setError(`Initialization failed: ${(initError as Error).message}`);
          setIsInitialized(false);
        })
        .finally(() => {
          setIsInitializing(false); // Stop initializing state regardless of outcome
        });
    }
    // Only depend on projectId. service instance is set inside.
    // isInitialized and isInitializing prevent re-running.
  }, [projectId, walletConnectService, isInitialized, isInitializing]);

  // --- Event Listener Effect ---
  useEffect(() => {
    // Crucially, only attach listeners *after* the service is fully initialized
    if (!walletConnectService || !isInitialized) {
      console.log(">>> Provider: Skipping listener setup - service not initialized yet.");
      return;
    }

    console.log(">>> Provider: Setting up event listeners (service initialized).");

    const handlePairStatus = (status: string, message?: string) => {
      console.log(">>> Provider: handlePairStatus:", status, message);
      setIsPairing(status === "pairing");
      if (status === "error") {
        setError(message || "Pairing failed");
      } else if (status === "paired") {
        // Optional: can clear pairing status here, but session_connect is better indicator
        // setIsPairing(false);
      } else {
        setError(null); // Clear error on non-error status
      }
    };

    const handleSessionProposal = (proposal: WalletKitTypes.SessionProposal) => {
      console.log(">>> Provider: handleSessionProposal received:", proposal.id);
      if (!lensAccountAddress) {
        setError("Cannot approve session: Lens Account Address missing.");
        walletConnectService
          .rejectSession(proposal, getSdkError("USER_REJECTED"))
          .catch((rejectError) => console.error("Failed to reject session:", rejectError));
        return;
      }
      try {
        const approvedNamespaces = buildApprovedNamespaces({
          proposal: proposal.params,
          supportedNamespaces: {
            eip155: {
              chains: [`eip155:${LENS_CHAIN_ID}`],
              methods: ["eth_sendTransaction", "personal_sign", "eth_signTypedData", "eth_signTypedData_v4"],
              events: ["chainChanged", "accountsChanged"],
              accounts: [`eip155:${LENS_CHAIN_ID}:${lensAccountAddress}`],
            },
          },
        });
        console.log(">>> Provider: Approving session:", proposal.id);
        walletConnectService
          .approveSession(proposal, approvedNamespaces)
          .then((session) => {
            console.log(">>> Provider: Session approved and acknowledged:", session.topic);
            // session_connect handler below updates state
          })
          .catch((approveError: unknown) => {
            console.error(">>> Provider: Failed to approve session:", approveError);
            setError(`Failed to approve session: ${(approveError as Error).message}`);
            walletConnectService
              .rejectSession(proposal, getSdkError("USER_REJECTED"))
              .catch((rejectError) => console.error(">>> Provider: Failed to reject session after approve error:", rejectError));
          });
      } catch (error: unknown) {
        console.error(">>> Provider: Error building namespaces/approving:", error);
        setError(`Error during session approval: ${(error as Error).message}`);
        walletConnectService
          .rejectSession(proposal, getSdkError("USER_REJECTED"))
          .catch((rejectError) => console.error(">>> Provider: Failed to reject session after catch:", rejectError));
      }
    };

    const handleSessionConnect = (session: SessionTypes.Struct) => {
      console.log(">>> Provider: handleSessionConnect called:", session.topic);
      setActiveSessions((prev) => ({ ...prev, [session.topic]: session }));
      setIsPairing(false); // Pairing process is complete
      setError(null);
    };

    const handleSessionDelete = (topic: string) => {
      console.log(">>> Provider: handleSessionDelete called:", topic);
      setActiveSessions((prev) => {
        const newSessions = { ...prev };
        delete newSessions[topic];
        return newSessions;
      });
      setIsPairing(false); // Ensure pairing state is reset on disconnect
    };

    // Attach listeners
    console.log(">>> Provider: Attaching listeners.");
    walletConnectService.on("pair_status", handlePairStatus);
    walletConnectService.on("session_proposal", handleSessionProposal);
    walletConnectService.on("session_connect", handleSessionConnect);
    walletConnectService.on("session_delete", handleSessionDelete);

    // Cleanup function
    return () => {
      console.log(">>> Provider: Cleaning up event listeners.");
      if (walletConnectService) {
        walletConnectService.off("pair_status", handlePairStatus);
        walletConnectService.off("session_proposal", handleSessionProposal);
        walletConnectService.off("session_connect", handleSessionConnect);
        walletConnectService.off("session_delete", handleSessionDelete);
      }
    };
    // Rerun ONLY when service initialization status changes or lensAccountAddress changes
  }, [walletConnectService, isInitialized, lensAccountAddress]);

  // --- Exposed Context Functions ---
  const pair = useCallback(
    async (uri: string) => {
      if (!walletConnectService || !isInitialized) {
        // Check initialization status
        setError("WalletConnect Service not ready for pairing.");
        console.error("Attempted to pair before service was initialized.");
        return;
      }
      setIsPairing(true); // Set specific pairing state
      setError(null);
      try {
        await walletConnectService.pair(uri);
        // Let handlePairStatus and handleSessionConnect manage loading/error state
      } catch (e: unknown) {
        console.error("Pairing failed in provider callback:", e);
        // Error is handled by handlePairStatus listener
      }
    },
    [walletConnectService, isInitialized], // Add isInitialized dependency
  );

  const disconnect = useCallback(
    async (topic: string) => {
      if (!walletConnectService || !isInitialized) {
        // Check initialization
        setError("WalletConnect Service not ready for disconnecting.");
        return;
      }
      // Don't set isLoading/isPairing here, let session_delete handle UI
      setError(null);
      try {
        await walletConnectService.disconnectSession(topic, getSdkError("USER_DISCONNECTED"));
        // State update happens via session_delete listener
      } catch (e: unknown) {
        setError((e as Error).message || "Failed to disconnect");
      }
    },
    [walletConnectService, isInitialized], // Add isInitialized dependency
  );

  const contextValue = useMemo(
    () => ({
      walletConnectService,
      walletKitInstance,
      activeSessions,
      pair,
      disconnect,
      isLoading: isInitializing || isPairing, // Use combined loading state
      isInitializing, // Expose specific initializing state
      isPairing, // Expose specific pairing state
      error,
      isInitialized, // Expose initialization status
    }),
    [walletConnectService, walletKitInstance, activeSessions, pair, disconnect, isInitializing, isPairing, error, isInitialized],
  );

  return <WalletConnectContext.Provider value={contextValue}>{children}</WalletConnectContext.Provider>;
}

// Custom hook to use the context
export function useWalletConnect() {
  const context = useContext(WalletConnectContext);
  if (context === undefined) {
    throw new Error("useWalletConnect must be used within a WalletConnectProvider");
  }
  return context;
}
