// src/contexts/WalletConnectProvider.tsx
"use client";

import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { WalletConnectService } from "@/services/walletConnectService";
import { SessionTypes } from "@walletconnect/types"; // Keep SessionTypes
import { IWalletKit, WalletKitTypes } from "@reown/walletkit";
import { buildApprovedNamespaces, getSdkError } from "@walletconnect/utils";
import { useLensAccount } from "./LensAccountContext";
import { LENS_CHAIN_ID } from "@/lib/constants";

// ... (rest of the interface and component code remains the same as the previous corrected version)
interface WalletConnectContextState {
  walletConnectService: WalletConnectService | null;
  walletKitInstance: IWalletKit | null;
  activeSessions: Record<string, SessionTypes.Struct>;
  pair: (uri: string) => Promise<void>;
  disconnect: (topic: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

const WalletConnectContext = createContext<
  WalletConnectContextState | undefined
>(undefined);

interface WalletConnectProviderProps {
  children: ReactNode;
}

const DAPP_METADATA: WalletKitTypes.Metadata = {
  name: "Lens Account Interface",
  description: "Interface for managing Lens Account via WalletConnect",
  url:
    typeof window !== "undefined"
      ? window.location.origin
      : "http://localhost:3000",
  icons: ["/favicon.ico"],
};

export function WalletConnectProvider({
  children,
}: WalletConnectProviderProps) {
  const [walletConnectService, setWalletConnectService] =
    useState<WalletConnectService | null>(null);
  const [walletKitInstance, setWalletKitInstance] = useState<IWalletKit | null>(
    null
  );
  const [activeSessions, setActiveSessions] = useState<
    Record<string, SessionTypes.Struct>
  >({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { lensAccountAddress } = useLensAccount();

  const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

  useEffect(() => {
    if (!projectId) {
      console.error("NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not set!");
      setError("WalletConnect Project ID is missing.");
      setIsLoading(false);
      return;
    }

    if (!walletConnectService) {
      const service = new WalletConnectService(projectId, DAPP_METADATA);
      setWalletConnectService(service);

      service
        .init()
        .then((instance) => {
          if (instance) {
            setWalletKitInstance(instance);
            setActiveSessions(instance.getActiveSessions() || {});
          } else {
            setError("Failed to initialize WalletKit.");
          }
        })
        .catch((initError: unknown) => {
          setError(`Initialization failed: ${(initError as Error).message}`);
        })
        .finally(() => setIsLoading(false));
    }
  }, [projectId, walletConnectService]);

  useEffect(() => {
    if (!walletConnectService) return;

    const handlePairStatus = (status: string, message?: string) => {
      if (status === "pairing") setIsLoading(true);
      else setIsLoading(false);
      if (status === "error") setError(message || "Pairing failed");
      else setError(null);
    };

    const handleSessionProposal = (
      proposal: WalletKitTypes.SessionProposal
    ) => {
      if (!lensAccountAddress) {
        setError("Cannot approve session: Lens Account Address missing.");
        walletConnectService
          .rejectSession(proposal, getSdkError("USER_REJECTED"))
          .catch((rejectError) =>
            console.error("Failed to reject session:", rejectError)
          );
        return;
      }
      try {
        const approvedNamespaces = buildApprovedNamespaces({
          proposal: proposal.params,
          supportedNamespaces: {
            eip155: {
              chains: [`eip155:${LENS_CHAIN_ID}`],
              methods: [
                "eth_sendTransaction",
                "personal_sign",
                "eth_signTypedData",
                "eth_signTypedData_v4",
              ],
              events: ["chainChanged", "accountsChanged"],
              accounts: [`eip155:${LENS_CHAIN_ID}:${lensAccountAddress}`],
            },
          },
        });
        walletConnectService
          .approveSession(proposal, approvedNamespaces)
          .catch((approveError: unknown) => {
            setError(
              `Failed to approve session: ${(approveError as Error).message}`
            );
            walletConnectService
              .rejectSession(proposal, getSdkError("USER_REJECTED"))
              .catch((rejectError) =>
                console.error("Failed to reject session:", rejectError)
              );
          });
      } catch (error: unknown) {
        setError(`Error during session approval: ${(error as Error).message}`);
        walletConnectService
          .rejectSession(proposal, getSdkError("USER_REJECTED"))
          .catch((rejectError) =>
            console.error("Failed to reject session:", rejectError)
          );
      }
    };

    const handleSessionConnect = (session: SessionTypes.Struct) => {
      console.log(
        "WalletConnectProvider: Session connected event received:",
        session
      );
      // Use functional update to be safer with potential rapid updates
      setActiveSessions((prev) => {
        console.log("Updating activeSessions state with:", session.topic);
        if (prev[session.topic]) {
          console.warn(
            "Session already exists in state, potentially overwriting:",
            session.topic
          );
        }
        return { ...prev, [session.topic]: session };
      });
      // Introduce a small delay ONLY FOR TESTING if upgrading is not possible yet
      setTimeout(() => {
        setIsLoading(false); // Pairing/connection is complete
        setError(null);
      }, 100); // e.g., 100ms delay - adjust as needed, but this is hacky
    };

    const handleSessionDelete = (topic: string) => {
      setActiveSessions((prev) => {
        const newSessions = { ...prev };
        delete newSessions[topic];
        return newSessions;
      });
    };

    walletConnectService.on("pair_status", handlePairStatus);
    walletConnectService.on("session_proposal", handleSessionProposal);
    walletConnectService.on("session_connect", handleSessionConnect);
    walletConnectService.on("session_delete", handleSessionDelete);

    return () => {
      // Use an IIFE for async cleanup if needed, but simple off is sync
      walletConnectService.off("pair_status", handlePairStatus);
      walletConnectService.off("session_proposal", handleSessionProposal);
      walletConnectService.off("session_connect", handleSessionConnect);
      walletConnectService.off("session_delete", handleSessionDelete);
    };
  }, [walletConnectService, lensAccountAddress]);

  const pair = useCallback(
    async (uri: string) => {
      if (!walletConnectService) {
        setError("WalletConnect Service not initialized.");
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        await walletConnectService.pair(uri);
      } catch (e: unknown) {
        // Error handling is done via event listener now
        console.error("Pairing failed in provider callback:", e);
      }
    },
    [walletConnectService]
  );

  const disconnect = useCallback(
    async (topic: string) => {
      if (!walletConnectService) {
        setError("WalletConnect Service not initialized.");
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        await walletConnectService.disconnectSession(
          topic,
          getSdkError("USER_DISCONNECTED")
        );
      } catch (e: unknown) {
        setError((e as Error).message || "Failed to disconnect");
      } finally {
        setIsLoading(false);
      }
    },
    [walletConnectService]
  );

  const contextValue = useMemo(
    () => ({
      walletConnectService,
      walletKitInstance,
      activeSessions,
      pair,
      disconnect,
      isLoading,
      error,
    }),
    [
      walletConnectService,
      walletKitInstance,
      activeSessions,
      pair,
      disconnect,
      isLoading,
      error,
    ]
  );

  return (
    <WalletConnectContext.Provider value={contextValue}>
      {children}
    </WalletConnectContext.Provider>
  );
}

export function useWalletConnect() {
  const context = useContext(WalletConnectContext);
  if (context === undefined) {
    throw new Error(
      "useWalletConnect must be used within a WalletConnectProvider"
    );
  }
  return context;
}
