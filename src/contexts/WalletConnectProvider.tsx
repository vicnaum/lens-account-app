// src/contexts/WalletConnectProvider.tsx
"use client";

import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback, useMemo, useRef } from "react";
// Import the CLASS and types
import { WalletConnectService, ServiceEvents, type WalletConnectServiceEvents } from "@/services/walletConnectService";
import { SessionTypes } from "@walletconnect/types";
import { IWalletKit, WalletKitTypes } from "@reown/walletkit";
import { buildApprovedNamespaces, getSdkError } from "@walletconnect/utils";
import { useLensAccount } from "./LensAccountContext";
import { LENS_CHAIN_ID } from "@/lib/constants";
import { ErrorResponse } from "@walletconnect/jsonrpc-utils";

// Keep the context state definition
interface WalletConnectContextState {
  walletKitInstance: IWalletKit | null;
  activeSessions: Record<string, SessionTypes.Struct>;
  pendingProposal: WalletKitTypes.SessionProposal | null;
  pair: (uri: string) => Promise<void>;
  disconnect: (topic: string) => Promise<void>;
  approveSession: () => Promise<void>;
  rejectSession: () => Promise<void>;
  isLoading: boolean;
  isInitializing: boolean;
  isPairing: boolean;
  isProcessingAction: boolean;
  error: string | null;
  isInitialized: boolean;
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

// --- WalletConnectProvider Component ---
export function WalletConnectProvider({ children }: WalletConnectProviderProps) {
  const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

  // --- State Management ---
  // Use useRef to hold the service instance - persists across renders without causing re-renders itself
  const serviceRef = useRef<WalletConnectService | null>(null);
  // State derived from service events or actions
  const [walletKitInstance, setWalletKitInstance] = useState<IWalletKit | null>(null);
  const [activeSessions, setActiveSessions] = useState<Record<string, SessionTypes.Struct>>({});
  const [pendingProposal, setPendingProposal] = useState<WalletKitTypes.SessionProposal | null>(null);
  const [isInitializing, setIsInitializing] = useState(true); // Start as initializing
  const [isPairing, setIsPairing] = useState(false);
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false); // Service readiness

  const { lensAccountAddress } = useLensAccount();

  console.log(
    `%cWalletConnectProvider Render: isInitialized=${isInitialized}, isInitializing=${isInitializing}, isPairing=${isPairing}, isProcessing=${isProcessingAction}, serviceExists=${!!serviceRef.current}, pendingProposal=${!!pendingProposal}`,
    "color: blue",
  );

  // --- Effect to Create Instance, Initialize, and Attach Listeners ONCE on Mount ---
  useEffect(() => {
    if (!projectId) {
      console.error("WalletConnectProvider: Project ID missing. Cannot initialize service.");
      setError("WalletConnect Project ID is missing.");
      setIsInitializing(false);
      setIsInitialized(false);
      return;
    }

    // Prevent re-initialization if instance already exists in ref (e.g., due to HMR preserving ref)
    if (serviceRef.current) {
      console.log(
        `%cWalletConnectProvider Mount Effect: Service instance already exists in ref. Skipping creation/init. isInitialized=${serviceRef.current.isInitialized()}`,
        "color: yellow",
      );
      // Sync state if needed (e.g. HMR occurred after init finished)
      if (serviceRef.current.isInitialized() && !isInitialized) {
        setIsInitialized(true);
        setIsInitializing(false);
        setWalletKitInstance(serviceRef.current.getWalletKitInstance() ?? null);
        setActiveSessions(serviceRef.current.getActiveSessions());
      } else if (serviceRef.current.isInitializing() && !isInitializing) {
        setIsInitializing(true);
      }
      // Listeners should ideally already be attached if instance exists, but re-attaching defensively
      // might cause issues if not cleaned up properly. Let's rely on cleanup below.
    } else {
      console.log(`%cWalletConnectProvider Mount Effect: Creating NEW service instance and initializing...`, "color: orange");
      setIsInitializing(true);
      setError(null);
      const service = new WalletConnectService(projectId, DAPP_METADATA);
      serviceRef.current = service; // Store the instance in the ref

      // Call init immediately after creation
      service.init().catch((initError: Error | unknown) => {
        console.error("WalletConnectProvider Mount Effect: service.init() rejected.", initError);
        // Error state is set via the 'error'/'initialized' event listener below
      });
    }

    // --- Attach listeners to the current instance in the ref ---
    const currentService = serviceRef.current;
    if (!currentService) return; // Should not happen if projectId exists

    console.log(`%cWalletConnectProvider Mount Effect: Attaching listeners to service instance.`, "color: purple");

    // Define handlers (update provider's state based on service events)
    const handleInitialized: WalletConnectServiceEvents[ServiceEvents.Initialized] = ({ success, instance }) => {
      console.log(`%cProvider Listener: ${ServiceEvents.Initialized} received (success=${success})`, "color: purple");
      setIsInitialized(success);
      setWalletKitInstance(success ? instance : null);
      if (currentService) setActiveSessions(currentService.getActiveSessions()); // Use currentService here
      setIsInitializing(false);
      if (!success && !error) setError("Initialization failed via event");
    };
    // ... (Keep other handlers: handlePairStatus, handleSessionProposal, etc. - they remain the same) ...
    const handlePairStatus: WalletConnectServiceEvents[ServiceEvents.PairStatus] = ({ status, message }) => {
      console.log(`%cProvider Listener: ${ServiceEvents.PairStatus} received: ${status}`, "color: purple", message);
      setIsPairing(status === "pairing");
      if (status === "error") {
        setError(message || "Pairing failed");
        setIsPairing(false);
      } else if (status !== "pairing") {
        setError(null);
      }
    };

    const handleSessionProposal: WalletConnectServiceEvents[ServiceEvents.SessionProposal] = ({ proposal }) => {
      console.log(`%cProvider Listener: ${ServiceEvents.SessionProposal} received:`, "color: purple", proposal.id);
      setPendingProposal(proposal);
      setIsPairing(false);
      setError(null);
    };

    const handleSessionConnect: WalletConnectServiceEvents[ServiceEvents.SessionConnect] = ({ session }) => {
      console.log(`%cProvider Listener: ${ServiceEvents.SessionConnect} received:`, "color: purple", session.topic);
      setActiveSessions((prev) => ({ ...prev, [session.topic]: session }));
      setIsPairing(false);
      setError(null);
      setPendingProposal(null);
    };

    const handleSessionDelete: WalletConnectServiceEvents[ServiceEvents.SessionDelete] = ({ topic }) => {
      console.log(`%cProvider Listener: ${ServiceEvents.SessionDelete} received:`, "color: purple", topic);
      setActiveSessions((prev) => {
        const { [topic]: _, ...rest } = prev;
        return rest;
      });
      setIsPairing(false);
      if (pendingProposal && pendingProposal.params.pairingTopic === topic) {
        console.log("%cProvider: Clearing pending proposal due to session delete event.", "color: brown");
        setPendingProposal(null);
      }
    };

    const handleSessionsUpdated: WalletConnectServiceEvents[ServiceEvents.SessionsUpdated] = ({ sessions }) => {
      console.log(`%cProvider Listener: ${ServiceEvents.SessionsUpdated} received`, "color: purple", sessions);
      setActiveSessions(sessions);
    };

    const handleError: WalletConnectServiceEvents[ServiceEvents.Error] = ({ message }) => {
      console.error(`%cProvider Listener: ${ServiceEvents.Error} received:`, "color: red", message);
      setError(message);
      setIsPairing(false);
      setIsProcessingAction(false);
      // Potentially reset initializing state on critical init errors
      // if (!isInitialized) setIsInitializing(false);
    };

    const handleIsLoading: WalletConnectServiceEvents[ServiceEvents.IS_LOADING] = ({ isLoading }) => {
      console.log(`%cProvider Listener: ${ServiceEvents.IS_LOADING} received: ${isLoading}`, "color: purple");
      setIsProcessingAction(isLoading);
    };

    const handleIsPairing: WalletConnectServiceEvents[ServiceEvents.IS_PAIRING] = ({ isPairing }) => {
      console.log(`%cProvider Listener: ${ServiceEvents.IS_PAIRING} received: ${isPairing}`, "color: purple");
      setIsPairing(isPairing);
    };

    // Attach listeners
    currentService.on(ServiceEvents.Initialized, handleInitialized);
    currentService.on(ServiceEvents.PairStatus, handlePairStatus);
    currentService.on(ServiceEvents.SessionProposal, handleSessionProposal);
    currentService.on(ServiceEvents.SessionConnect, handleSessionConnect);
    currentService.on(ServiceEvents.SessionDelete, handleSessionDelete);
    currentService.on(ServiceEvents.SessionsUpdated, handleSessionsUpdated);
    currentService.on(ServiceEvents.Error, handleError);
    currentService.on(ServiceEvents.IS_LOADING, handleIsLoading);
    currentService.on(ServiceEvents.IS_PAIRING, handleIsPairing);

    // Cleanup function: Remove listeners from the instance in the ref
    return () => {
      console.log("%cWalletConnectProvider Mount Effect: Cleaning up listeners.", "color: orange");
      if (serviceRef.current) {
        console.log("%cDetaching listeners from service instance in ref.", "color: orange");
        serviceRef.current.off(ServiceEvents.Initialized, handleInitialized);
        serviceRef.current.off(ServiceEvents.PairStatus, handlePairStatus);
        serviceRef.current.off(ServiceEvents.SessionProposal, handleSessionProposal);
        serviceRef.current.off(ServiceEvents.SessionConnect, handleSessionConnect);
        serviceRef.current.off(ServiceEvents.SessionDelete, handleSessionDelete);
        serviceRef.current.off(ServiceEvents.SessionsUpdated, handleSessionsUpdated);
        serviceRef.current.off(ServiceEvents.Error, handleError);
        serviceRef.current.off(ServiceEvents.IS_LOADING, handleIsLoading);
        serviceRef.current.off(ServiceEvents.IS_PAIRING, handleIsPairing);
      }
    };
  }, [projectId]); // Run ONLY once when projectId is available

  // --- Context Methods (Interact with the service instance via ref) ---
  const pair = useCallback(
    async (uri: string) => {
      // Use serviceRef.current
      if (!serviceRef.current?.isInitialized()) return setError("Service not initialized");
      console.log(`%cWalletConnectProvider: pair called`, "color: cyan");
      setError(null);
      await serviceRef.current.pair(uri);
    },
    [isInitialized], // Depend on react state `isInitialized` for enabling the action
  );

  const approveSession = useCallback(async () => {
    // Use serviceRef.current
    if (!serviceRef.current?.isInitialized() || !pendingProposal || !lensAccountAddress) {
      const reason = !isInitialized ? "Service not ready." : !pendingProposal ? "No proposal." : "No Lens address.";
      setError(`Cannot approve: ${reason}`);
      return;
    }
    console.log(`%cWalletConnectProvider: approveSession called`, "color: cyan");
    setError(null);

    try {
      // ... (namespace building logic remains the same)
      const requiredNamespaces = pendingProposal.params.requiredNamespaces || {};
      const optionalNamespaces = pendingProposal.params.optionalNamespaces || {};
      const requestedMethods = [...(requiredNamespaces.eip155?.methods || []), ...(optionalNamespaces.eip155?.methods || [])];
      const requestedEvents = [...(requiredNamespaces.eip155?.events || []), ...(optionalNamespaces.eip155?.events || [])];
      const methods = requestedMethods.length > 0 ? requestedMethods : ["eth_sendTransaction", "personal_sign", "eth_signTypedData_v4"];
      const events = requestedEvents.length > 0 ? requestedEvents : ["chainChanged", "accountsChanged"];

      const approvedNamespaces = buildApprovedNamespaces({
        proposal: pendingProposal.params,
        supportedNamespaces: {
          eip155: {
            chains: [`eip155:${LENS_CHAIN_ID}`],
            methods: methods,
            events: events,
            accounts: [`eip155:${LENS_CHAIN_ID}:${lensAccountAddress}`],
          },
        },
      });
      await serviceRef.current.approveSession(pendingProposal, approvedNamespaces);
      setPendingProposal(null); // Still clear proposal state here
    } catch (e) {
      console.error(`%cWalletConnectProvider: approveSession failed:`, "color: red", e);
    }
  }, [isInitialized, pendingProposal, lensAccountAddress]);

  const rejectSession = useCallback(async () => {
    // Use serviceRef.current
    if (!serviceRef.current?.isInitialized() || !pendingProposal) {
      const reason = !isInitialized ? "Service not ready." : "No proposal.";
      setError(`Cannot reject: ${reason}`);
      return;
    }
    console.log(`%cWalletConnectProvider: rejectSession called`, "color: cyan");
    setError(null);
    try {
      await serviceRef.current.rejectSession(pendingProposal, getSdkError("USER_REJECTED"));
      setPendingProposal(null);
    } catch (e) {
      console.error(`%cWalletConnectProvider: rejectSession failed:`, "color: red", e);
    }
  }, [isInitialized, pendingProposal]);

  const disconnect = useCallback(
    async (topic: string) => {
      // Use serviceRef.current
      if (!serviceRef.current?.isInitialized()) return setError("Service not initialized");
      console.log(`%cWalletConnectProvider: disconnect called`, "color: cyan");
      setError(null);
      await serviceRef.current.disconnectSession(topic, getSdkError("USER_DISCONNECTED"));
    },
    [isInitialized],
  );

  // --- Context Value Memoization ---
  const contextValue = useMemo(
    () => ({
      walletKitInstance,
      activeSessions,
      pendingProposal,
      pair,
      disconnect,
      approveSession,
      rejectSession,
      isLoading: isInitializing || isPairing || isProcessingAction,
      isInitializing,
      isPairing,
      isProcessingAction,
      error,
      isInitialized,
    }),
    [
      walletKitInstance,
      activeSessions,
      pendingProposal,
      pair,
      disconnect,
      approveSession,
      rejectSession,
      isInitializing,
      isPairing,
      isProcessingAction,
      error,
      isInitialized,
    ],
  );

  // Only render children when projectId is available, otherwise show error/loading
  return projectId ? (
    <WalletConnectContext.Provider value={contextValue}>{children}</WalletConnectContext.Provider>
  ) : (
    <div>Error: WalletConnect Project ID is missing. Cannot initialize WalletConnect.</div>
  );
}

// Keep your existing hook
export function useWalletConnect() {
  const context = useContext(WalletConnectContext);
  if (context === undefined) {
    throw new Error("useWalletConnect must be used within a WalletConnectProvider");
  }
  return context;
}
