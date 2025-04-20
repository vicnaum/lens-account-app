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
import { ErrorResponse, JsonRpcResponse } from "@walletconnect/jsonrpc-utils";

// Keep the context state definition
interface WalletConnectContextState {
  walletKitInstance: IWalletKit | null;
  activeSessions: Record<string, SessionTypes.Struct>;
  pendingProposal: WalletKitTypes.SessionProposal | null;
  pendingRequest: WalletKitTypes.SessionRequest | null;
  pair: (uri: string) => Promise<void>;
  disconnect: (topic: string) => Promise<void>;
  approveSession: () => Promise<void>;
  rejectSession: () => Promise<void>;
  respondRequest: (response: JsonRpcResponse) => Promise<void>;
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
  const serviceRef = useRef<WalletConnectService | null>(null);
  const [walletKitInstance, setWalletKitInstance] = useState<IWalletKit | null>(null);
  const [activeSessions, setActiveSessions] = useState<Record<string, SessionTypes.Struct>>({});
  const [pendingProposal, setPendingProposal] = useState<WalletKitTypes.SessionProposal | null>(null);
  const [pendingRequest, setPendingRequest] = useState<WalletKitTypes.SessionRequest | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isPairing, setIsPairing] = useState(false);
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const { lensAccountAddress } = useLensAccount();

  console.log(
    `%cWalletConnectProvider Render: isInitialized=${isInitialized}, isInitializing=${isInitializing}, isPairing=${isPairing}, isProcessing=${isProcessingAction}, serviceExists=${!!serviceRef.current}, pendingProposal=${!!pendingProposal}, pendingRequest=${!!pendingRequest}`,
    "color: blue",
  );

  // --- Effect to Create Instance, Initialize ONCE ---
  useEffect(() => {
    if (!projectId) {
      console.error("WalletConnectProvider: Project ID missing. Cannot initialize service.");
      setError("WalletConnect Project ID is missing.");
      setIsInitializing(false);
      setIsInitialized(false);
      return;
    }
    // Prevent re-initialization if instance already exists in ref
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
    } else {
      console.log(`%cWalletConnectProvider Mount Effect: Creating NEW service instance and initializing...`, "color: orange");
      setIsInitializing(true);
      setError(null);
      const service = new WalletConnectService(projectId, DAPP_METADATA);
      serviceRef.current = service; // Store the instance in the ref

      service.init().catch((initError: Error | unknown) => {
        console.error("WalletConnectProvider Mount Effect: service.init() rejected.", initError);
      });
    }
  }, [projectId]); // Add projectId dependency

  // --- Effect to Attach/Detach Event Listeners ---
  useEffect(() => {
    const currentService = serviceRef.current; // Capture ref value for effect closure
    if (!currentService) {
      console.log(`%cWalletConnectProvider Listener Effect: Skipping setup, no service instance.`, "color: purple");
      return;
    }

    console.log(`%cWalletConnectProvider Listener Effect: Attaching listeners to service instance.`, "color: purple");

    // Define handlers
    const handleInitialized: WalletConnectServiceEvents[ServiceEvents.Initialized] = ({ success, instance }) => {
      console.log(`%cProvider Listener: ${ServiceEvents.Initialized} received (success=${success})`, "color: purple");
      setIsInitialized(success);
      setWalletKitInstance(success ? instance : null);
      if (currentService) setActiveSessions(currentService.getActiveSessions());
      setIsInitializing(false);
      if (!success && !error) setError("Initialization failed via event");
    };
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
    // This now handles PEER disconnects or SDK internal cleanup events
    const handleSessionDelete: WalletConnectServiceEvents[ServiceEvents.SessionDelete] = ({ topic }) => {
      console.log(`%cProvider Listener: ${ServiceEvents.SessionDelete} received (likely from PEER) for topic:`, "color: purple", topic);
      setActiveSessions((prev) => {
        if (!prev[topic]) return prev;
        const { [topic]: _, ...rest } = prev;
        console.log(`%cProvider State: Removing session ${topic} based on SDK/PEER event.`, "color: brown");
        return rest;
      });
      setIsPairing(false);
      if (pendingProposal && pendingProposal.params.pairingTopic === topic) {
        console.log("%cProvider: Clearing pending proposal due to SDK/peer session delete event.", "color: brown");
        setPendingProposal(null);
      }
    };
    const handleSessionsUpdated: WalletConnectServiceEvents[ServiceEvents.SessionsUpdated] = ({ sessions }) => {
      console.log(`%cProvider Listener: ${ServiceEvents.SessionsUpdated} received`, "color: purple", sessions);
      setActiveSessions(sessions);
    };
    const handleSessionRequest: WalletConnectServiceEvents[ServiceEvents.SessionRequest] = ({ request }) => {
      console.log(`%cProvider Listener: ${ServiceEvents.SessionRequest} received:`, "color: purple", request.id, request.params.request.method);
      if (request.params.request.method === "eth_sendTransaction") {
        setPendingRequest(request);
        setError(null);
      } else {
        console.warn(`%cProvider Listener: Received unhandled request method: ${request.params.request.method}`, "color: orange");
      }
    };
    const handleError: WalletConnectServiceEvents[ServiceEvents.Error] = ({ message }) => {
      console.error(`%cProvider Listener: ${ServiceEvents.Error} received:`, "color: red", message);
      setError(message);
      setIsPairing(false);
      setIsProcessingAction(false);
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
    currentService.on(ServiceEvents.SessionRequest, handleSessionRequest);

    // Cleanup function
    return () => {
      console.log("%cWalletConnectProvider Mount Effect: Cleaning up listeners.", "color: orange");
      if (currentService) {
        // Use the captured variable
        console.log("%cDetaching listeners from service instance in ref.", "color: orange");
        currentService.off(ServiceEvents.Initialized, handleInitialized);
        currentService.off(ServiceEvents.PairStatus, handlePairStatus);
        currentService.off(ServiceEvents.SessionProposal, handleSessionProposal);
        currentService.off(ServiceEvents.SessionConnect, handleSessionConnect);
        currentService.off(ServiceEvents.SessionDelete, handleSessionDelete);
        currentService.off(ServiceEvents.SessionsUpdated, handleSessionsUpdated);
        currentService.off(ServiceEvents.Error, handleError);
        currentService.off(ServiceEvents.IS_LOADING, handleIsLoading);
        currentService.off(ServiceEvents.IS_PAIRING, handleIsPairing);
        currentService.off(ServiceEvents.SessionRequest, handleSessionRequest);
      }
    };
  }, []); // Run listeners setup only once

  // --- Context Methods ---
  const pair = useCallback(
    async (uri: string) => {
      if (!serviceRef.current?.isInitialized()) return setError("Service not initialized");
      console.log(`%cWalletConnectProvider: pair called`, "color: cyan");
      setError(null);
      await serviceRef.current.pair(uri);
    },
    [isInitialized],
  );

  const approveSession = useCallback(async () => {
    if (!serviceRef.current?.isInitialized() || !pendingProposal || !lensAccountAddress) {
      const reason = !isInitialized ? "Service not ready." : !pendingProposal ? "No proposal." : "No Lens address.";
      setError(`Cannot approve: ${reason}`);
      return;
    }
    console.log(`%cWalletConnectProvider: approveSession called for proposal ${pendingProposal.id}`, "color: cyan");
    setError(null);

    try {
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

      const session = await serviceRef.current.approveSession(pendingProposal, approvedNamespaces);
      console.log(`%cWalletConnectProvider: approveSession successful, received session:`, "color: green", session);
      // Manually update state since event might not fire from SDK
      setActiveSessions((prev) => ({ ...prev, [session.topic]: session }));
      setPendingProposal(null);
      setIsPairing(false);
      setError(null);
    } catch (e) {
      console.error(`%cWalletConnectProvider: approveSession failed:`, "color: red", e);
    }
  }, [isInitialized, pendingProposal, lensAccountAddress]);

  const rejectSession = useCallback(async () => {
    if (!serviceRef.current?.isInitialized() || !pendingProposal) {
      const reason = !isInitialized ? "Service not ready." : "No proposal.";
      setError(`Cannot reject: ${reason}`);
      return;
    }
    console.log(`%cWalletConnectProvider: rejectSession called for proposal ${pendingProposal.id}`, "color: cyan");
    setError(null);
    try {
      await serviceRef.current.rejectSession(pendingProposal, getSdkError("USER_REJECTED"));
      setPendingProposal(null); // Clear proposal state immediately
    } catch (e) {
      console.error(`%cWalletConnectProvider: rejectSession failed:`, "color: red", e);
    }
  }, [isInitialized, pendingProposal]);

  // >>>>>>>> REVERTED disconnect callback <<<<<<<<
  const disconnect = useCallback(
    async (topic: string) => {
      if (!serviceRef.current?.isInitialized()) {
        setError("Service not initialized");
        console.error("WalletConnectProvider: disconnect called before service initialized.");
        return;
      }
      console.log(`%cWalletConnectProvider: disconnect called for topic ${topic}`, "color: cyan");
      setError(null);

      try {
        await serviceRef.current.disconnectSession(topic, getSdkError("USER_DISCONNECTED"));
        console.log(`%cWalletConnectProvider: disconnect service call succeeded for topic ${topic}`, "color: green");

        // Manually update the Provider's state AFTER successful call
        setActiveSessions((prev) => {
          if (!prev[topic]) {
            console.warn(`%cWalletConnectProvider: Tried to remove non-existent session ${topic} from state.`, "color: orange");
            return prev;
          }
          const { [topic]: _, ...rest } = prev;
          console.log(`%cWalletConnectProvider: Manually removing session ${topic} from state.`, "color: brown");
          return rest;
        });
        // Ensure other related states are cleared
        setIsPairing(false);
        if (pendingProposal?.params?.pairingTopic === topic) {
          console.log(`%cWalletConnectProvider: Clearing pending proposal during manual disconnect cleanup for topic ${topic}.`, "color: brown");
          setPendingProposal(null);
        }
      } catch (e) {
        console.error(`%cWalletConnectProvider: disconnect failed for topic ${topic}:`, "color: red", e);
        setError((e as Error)?.message || "Disconnect failed");
      }
    },
    [isInitialized, pendingProposal], // Keep dependencies
  );
  // >>>>>>>> ----------------------------- <<<<<<<<

  const respondRequest = useCallback(
    async (response: JsonRpcResponse) => {
      if (!serviceRef.current?.isInitialized() || !pendingRequest) {
        setError("Service not initialized or no pending request.");
        console.error("WalletConnectProvider: respondRequest called incorrectly.");
        return;
      }
      console.log(`%cWalletConnectProvider: respondRequest called for ID ${response.id}`, "color: cyan", response);
      setError(null);

      try {
        await serviceRef.current.respondSessionRequest(pendingRequest.topic, response);
        console.log(`%cWalletConnectProvider: response sent successfully for request ${response.id}`, "color: green");
      } catch (e) {
        console.error(`%cWalletConnectProvider: respondRequest failed for ID ${response.id}:`, "color: red", e);
        setError((e as Error)?.message || "Failed to send response");
      } finally {
        setPendingRequest(null);
      }
    },
    [isInitialized, pendingRequest],
  );

  // --- Context Value Memoization ---
  const contextValue = useMemo(
    () => ({
      walletKitInstance,
      activeSessions,
      pendingProposal,
      pendingRequest,
      pair,
      disconnect, // Pass the reverted disconnect function
      approveSession,
      rejectSession,
      respondRequest,
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
      pendingRequest,
      pair,
      disconnect, // Include reverted disconnect
      approveSession,
      rejectSession,
      respondRequest,
      isInitializing,
      isPairing,
      isProcessingAction,
      error,
      isInitialized,
    ],
  );

  return projectId ? (
    <WalletConnectContext.Provider value={contextValue}>{children}</WalletConnectContext.Provider>
  ) : (
    <div>Error: WalletConnect Project ID is missing. Cannot initialize WalletConnect.</div>
  );
}

// Keep hook
export function useWalletConnect() {
  const context = useContext(WalletConnectContext);
  if (context === undefined) {
    throw new Error("useWalletConnect must be used within a WalletConnectProvider");
  }
  return context;
}
