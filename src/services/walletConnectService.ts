// src/services/walletConnectService.ts
import { WalletKit, IWalletKit, WalletKitTypes } from "@reown/walletkit";
import { Core } from "@walletconnect/core";
import { ICore, SessionTypes, SignClientTypes } from "@walletconnect/types";
import { ErrorResponse } from "@walletconnect/jsonrpc-utils";
import EventEmitter from "events";

// Define the events that the service will emit
export interface WalletConnectServiceEvents {
  pair_status: (status: "pairing" | "paired" | "error", message?: string) => void;
  session_proposal: (proposal: WalletKitTypes.SessionProposal) => void;
  session_connect: (session: SessionTypes.Struct) => void;
  session_delete: (topic: string) => void;
}

export class WalletConnectService extends EventEmitter {
  private core: ICore | undefined;
  private walletKit: IWalletKit | undefined;
  private projectId: string;
  private metadata: WalletKitTypes.Metadata;
  private isInitialized = false;

  constructor(projectId: string, metadata: WalletKitTypes.Metadata) {
    super();
    this.projectId = projectId;
    this.metadata = JSON.parse(JSON.stringify(metadata));
  }

  async init(): Promise<IWalletKit | undefined> {
    if (this.isInitialized) {
      console.log("WalletConnectService already initialized");
      return this.walletKit;
    }
    if (!this.projectId) {
      throw new Error("Project ID is not defined for WalletConnectService");
    }

    try {
      console.log("Initializing WalletConnect Core...");
      this.core = new Core({ projectId: this.projectId });

      console.log("Initializing WalletKit...");
      this.walletKit = await WalletKit.init({
        core: this.core,
        metadata: this.metadata,
      });

      this.setupEventListeners();
      this.isInitialized = true;
      console.log("WalletConnectService initialized successfully");
      return this.walletKit;
    } catch (error: unknown) {
      console.error("Failed to initialize WalletConnectService:", error);
      throw error;
    }
  }

  private setupEventListeners() {
    if (!this.walletKit) {
      console.error("WalletKit not initialized when setting up listeners.");
      return;
    }
    if (!this.walletKit.engine?.signClient?.events) {
      console.error("SignClient or its events emitter not available on engine.");
      return;
    }

    console.log("Setting up WalletKit event listeners...");

    this.walletKit.on("session_proposal", (proposal: WalletKitTypes.SessionProposal) => {
      console.log("WalletConnectService received session_proposal:", proposal);
      this.emit("session_proposal", proposal);
    });

    this.walletKit.on("session_delete", (event: { id: number; topic: string }) => {
      console.log("WalletConnectService received session_delete:", event);
      console.log(">>> Service: Received session_delete from WalletKit:", event); // <-- ADD LOG
      this.emit("session_delete", event.topic);
    });

    this.walletKit.engine.signClient.events.on("session_connect", (sessionArgs: SignClientTypes.EventArguments["session_connect"]) => {
      console.log("WalletConnectService received session_connect from SignClient:", sessionArgs);
      this.emit("session_connect", sessionArgs.session);
    });
  }

  async pair(uri: string) {
    if (!this.walletKit) {
      throw new Error("WalletKit is not initialized.");
    }
    try {
      console.log("Attempting to pair with URI:", uri);
      this.emit("pair_status", "pairing");
      await this.walletKit.core.pairing.pair({ uri });
      console.log("Pairing initiated for URI:", uri);
    } catch (error: unknown) {
      console.error("Pairing failed:", error);
      this.emit("pair_status", "error", (error as Error).message || "Pairing failed");
      throw error;
    }
  }

  async approveSession(proposal: WalletKitTypes.SessionProposal, approvedNamespaces: SessionTypes.Namespaces): Promise<SessionTypes.Struct> {
    if (!this.walletKit) {
      throw new Error("WalletKit is not initialized.");
    }
    try {
      console.log("Approving session:", proposal.id, approvedNamespaces);
      const session = await this.walletKit.approveSession({
        id: proposal.id,
        namespaces: approvedNamespaces,
      });
      console.log("Session approved and acknowledged:", session);
      return session;
    } catch (error: unknown) {
      console.error("Failed to approve session:", error);
      throw error;
    }
  }

  async rejectSession(proposal: WalletKitTypes.SessionProposal, reason: ErrorResponse) {
    if (!this.walletKit) {
      throw new Error("WalletKit is not initialized.");
    }
    try {
      console.log("Rejecting session:", proposal.id, reason);
      await this.walletKit.rejectSession({
        id: proposal.id,
        reason: reason,
      });
      console.log("Session rejected:", proposal.id);
    } catch (error: unknown) {
      console.error("Failed to reject session:", error);
      throw error;
    }
  }

  async disconnectSession(topic: string, reason: ErrorResponse) {
    if (!this.walletKit) {
      throw new Error("WalletKit is not initialized.");
    }
    try {
      console.log("Disconnecting session:", topic, reason);
      await this.walletKit.disconnectSession({
        topic: topic,
        reason: reason,
      });
      console.log("Session disconnected:", topic);
    } catch (error: unknown) {
      console.error("Failed to disconnect session:", error);
      throw error;
    }
  }

  // Typed EventEmitter methods
  on<E extends keyof WalletConnectServiceEvents>(event: E, listener: WalletConnectServiceEvents[E]): this {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return super.on(event, listener as (...args: any[]) => void);
  }

  once<E extends keyof WalletConnectServiceEvents>(event: E, listener: WalletConnectServiceEvents[E]): this {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return super.once(event, listener as (...args: any[]) => void);
  }

  off<E extends keyof WalletConnectServiceEvents>(event: E, listener: WalletConnectServiceEvents[E]): this {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return super.off(event, listener as (...args: any[]) => void);
  }

  removeListener<E extends keyof WalletConnectServiceEvents>(event: E, listener: WalletConnectServiceEvents[E]): this {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return super.removeListener(event, listener as (...args: any[]) => void);
  }

  emit<E extends keyof WalletConnectServiceEvents>(event: E, ...args: Parameters<WalletConnectServiceEvents[E]>): boolean {
    return super.emit(event, ...args);
  }

  getWalletKitInstance(): IWalletKit | undefined {
    return this.walletKit;
  }

  getActiveSessions(): Record<string, SessionTypes.Struct> {
    if (!this.walletKit) return {};
    return this.walletKit.getActiveSessions() || {};
  }
}
