// src/services/walletConnectService.ts
import { WalletKit, IWalletKit, WalletKitTypes } from "@reown/walletkit";
import { Core } from "@walletconnect/core";
import { ICore, SessionTypes, SignClientTypes } from "@walletconnect/types";
import { ErrorResponse } from "@walletconnect/jsonrpc-utils";
import EventEmitter from "events";

// --- Export Enums and Interfaces ---
export enum ServiceEvents {
  Initialized = "initialized",
  PairStatus = "pair_status",
  SessionProposal = "session_proposal",
  SessionConnect = "session_connect",
  SessionDelete = "session_delete",
  SessionRequest = "session_request",
  Error = "error",
  SessionsUpdated = "sessions_updated",
  IS_LOADING = "is_loading",
  IS_PAIRING = "is_pairing",
}

export interface WalletConnectServiceEvents {
  [ServiceEvents.Initialized]: (payload: { success: boolean; instance: IWalletKit | null }) => void;
  [ServiceEvents.PairStatus]: (payload: { status: "pairing" | "paired" | "error"; message?: string }) => void;
  [ServiceEvents.SessionProposal]: (payload: { proposal: WalletKitTypes.SessionProposal }) => void;
  [ServiceEvents.SessionConnect]: (payload: { session: SessionTypes.Struct }) => void;
  [ServiceEvents.SessionDelete]: (payload: { topic: string }) => void;
  [ServiceEvents.SessionRequest]: (payload: { request: WalletKitTypes.SessionRequest }) => void;
  [ServiceEvents.Error]: (payload: { message: string }) => void;
  [ServiceEvents.SessionsUpdated]: (payload: { sessions: Record<string, SessionTypes.Struct> }) => void;
  [ServiceEvents.IS_LOADING]: (payload: { isLoading: boolean }) => void;
  [ServiceEvents.IS_PAIRING]: (payload: { isPairing: boolean }) => void;
}
// ------------------------------------

// --- Export the Class Definition ---
export class WalletConnectService extends EventEmitter {
  private core: ICore | undefined;
  private walletKit: IWalletKit | undefined;
  private projectId: string;
  private metadata: WalletKitTypes.Metadata;
  private _isInitialized = false;
  private _isInitializing = false;
  private initPromise: Promise<IWalletKit> | null = null;

  constructor(projectId: string, metadata: WalletKitTypes.Metadata) {
    super();
    if (!projectId) {
      throw new Error("WalletConnectService: Project ID is required.");
    }
    this.projectId = projectId;
    this.metadata = JSON.parse(JSON.stringify(metadata));
    console.log("WalletConnectService: NEW Instance created (by Provider).");
  }

  // --- Getters (keep as before) ---
  public isInitialized(): boolean {
    return this._isInitialized;
  }

  public isInitializing(): boolean {
    return this._isInitializing;
  }

  public getWalletKitInstance(): IWalletKit | undefined {
    return this.walletKit;
  }

  public getActiveSessions(): Record<string, SessionTypes.Struct> {
    return this.walletKit?.getActiveSessions() || {};
  }

  // --- Core Initialization (Idempotent - crucial for this pattern too) ---
  async init(): Promise<IWalletKit> {
    // Still useful to prevent accidental double-calls on the same instance
    if (this._isInitialized && this.walletKit) {
      console.log("WalletConnectService Instance: Init called but already initialized.");
      this.emit(ServiceEvents.Initialized, { success: true, instance: this.walletKit }); // Re-emit status
      return this.walletKit;
    }
    if (this._isInitializing && this.initPromise) {
      console.log("WalletConnectService Instance: Init called while already initializing. Returning existing promise.");
      return this.initPromise;
    }

    console.log("WalletConnectService Instance: Starting initialization (init)...");
    this._isInitializing = true;
    this.emit(ServiceEvents.IS_LOADING, { isLoading: true });

    this.initPromise = (async () => {
      try {
        console.log("WalletConnectService Instance: Initializing WalletConnect Core...");
        // Disable global core check within this Core instance to potentially avoid the warning
        // Note: This might have side effects if other parts of the app *rely* on the global core,
        // but given our structure, it should be okay.
        process.env.DISABLE_GLOBAL_CORE = "true"; // Attempt to disable internal check
        this.core = new Core({ projectId: this.projectId });
        process.env.DISABLE_GLOBAL_CORE = "false"; // Re-enable immediately after if needed elsewhere

        console.log("WalletConnectService Instance: Initializing WalletKit...");
        this.walletKit = await WalletKit.init({
          core: this.core,
          metadata: this.metadata,
        });

        this.setupInternalListeners();
        this._isInitialized = true;
        console.log("WalletConnectService Instance: Initialization successful.");
        this.emit(ServiceEvents.Initialized, { success: true, instance: this.walletKit });
        this.emit(ServiceEvents.SessionsUpdated, { sessions: this.getActiveSessions() });
        return this.walletKit;
      } catch (error: unknown) {
        console.error("WalletConnectService Instance: Initialization failed:", error);
        this._isInitialized = false;
        this.emit(ServiceEvents.Initialized, { success: false, instance: null });
        this.emit(ServiceEvents.Error, { message: `Initialization failed: ${(error as Error).message}` });
        throw error;
      } finally {
        this._isInitializing = false;
        this.emit(ServiceEvents.IS_LOADING, { isLoading: false });
        this.initPromise = null;
      }
    })();

    return this.initPromise;
  }

  // --- setupInternalListeners, Event Handlers, Public Methods (keep as before) ---
  private setupInternalListeners() {
    // ... (same as previous version) ...
    if (!this.walletKit) {
      console.error("WalletConnectService: Cannot setup listeners, WalletKit not ready.");
      return;
    }
    console.log("WalletConnectService: Setting up internal event listeners...");

    this.walletKit.off("session_proposal", this.handleSessionProposal);
    this.walletKit.on("session_proposal", this.handleSessionProposal);

    if (this.walletKit.engine?.signClient?.events) {
      this.walletKit.engine.signClient.events.off("session_connect", this.handleSessionConnect);
      this.walletKit.engine.signClient.events.on("session_connect", this.handleSessionConnect);
    } else {
      console.warn("WalletConnectService: SignClient events not available for session_connect listener.");
    }

    this.walletKit.off("session_delete", this.handleSessionDelete);
    this.walletKit.on("session_delete", this.handleSessionDelete);

    console.log("WalletConnectService: Internal listeners attached.");
  }

  // --- Event Handlers (bound methods) ---
  private handleSessionProposal = (proposal: WalletKitTypes.SessionProposal) => {
    console.log("Service Handler: session_proposal", proposal.id);
    this.emit(ServiceEvents.SessionProposal, { proposal });
    this.emit(ServiceEvents.IS_PAIRING, { isPairing: false });
  };

  private handleSessionConnect = (sessionArgs: SignClientTypes.EventArguments["session_connect"]) => {
    console.log("Service Handler: session_connect", sessionArgs.session.topic);
    this.emit(ServiceEvents.SessionConnect, { session: sessionArgs.session });
    this.emit(ServiceEvents.SessionsUpdated, { sessions: this.getActiveSessions() });
  };

  private handleSessionDelete = (event: { id: number; topic: string }) => {
    console.log("Service Handler: session_delete", event.topic);
    this.emit(ServiceEvents.SessionDelete, { topic: event.topic });
    this.emit(ServiceEvents.SessionsUpdated, { sessions: this.getActiveSessions() });
  };

  // --- Public Methods ---
  async pair(uri: string): Promise<void> {
    if (!this._isInitialized || !this.walletKit) throw new Error("WalletConnectService: Not initialized. Cannot pair.");
    console.log("Service: Attempting to pair with URI:", uri);
    this.emit(ServiceEvents.IS_PAIRING, { isPairing: true });
    this.emit(ServiceEvents.PairStatus, { status: "pairing" });
    try {
      await this.walletKit.pair({ uri });
      console.log("Service: Pairing initiated for URI:", uri);
    } catch (error: unknown) {
      console.error("Service: Pairing failed:", error);
      const message = (error as Error).message || "Pairing failed";
      this.emit(ServiceEvents.PairStatus, { status: "error", message });
      this.emit(ServiceEvents.IS_PAIRING, { isPairing: false });
      this.emit(ServiceEvents.Error, { message });
      throw error;
    }
  }

  async approveSession(proposal: WalletKitTypes.SessionProposal, approvedNamespaces: SessionTypes.Namespaces): Promise<SessionTypes.Struct> {
    if (!this._isInitialized || !this.walletKit) throw new Error("WalletConnectService: Not initialized. Cannot approve session.");
    this.emit(ServiceEvents.IS_LOADING, { isLoading: true });
    try {
      console.log("Service: Approving session:", proposal.id);
      const session = await this.walletKit.approveSession({
        id: proposal.id,
        namespaces: approvedNamespaces,
      });
      console.log("Service: Session approved via approveSession:", session.topic);
      return session;
    } catch (error: unknown) {
      console.error("Service: Failed to approve session:", error);
      this.emit(ServiceEvents.Error, { message: (error as Error).message || "Failed to approve session" });
      throw error;
    } finally {
      this.emit(ServiceEvents.IS_LOADING, { isLoading: false });
    }
  }

  async rejectSession(proposal: WalletKitTypes.SessionProposal, reason: ErrorResponse): Promise<void> {
    if (!this._isInitialized || !this.walletKit) throw new Error("WalletConnectService: Not initialized. Cannot reject session.");
    this.emit(ServiceEvents.IS_LOADING, { isLoading: true });
    try {
      console.log("Service: Rejecting session:", proposal.id);
      await this.walletKit.rejectSession({
        id: proposal.id,
        reason: reason,
      });
      console.log("Service: Session rejected:", proposal.id);
    } catch (error: unknown) {
      console.error("Service: Failed to reject session:", error);
      this.emit(ServiceEvents.Error, { message: (error as Error).message || "Failed to reject session" });
      throw error;
    } finally {
      this.emit(ServiceEvents.IS_LOADING, { isLoading: false });
    }
  }

  async disconnectSession(topic: string, reason: ErrorResponse): Promise<void> {
    if (!this._isInitialized || !this.walletKit) throw new Error("WalletConnectService: Not initialized. Cannot disconnect session.");
    this.emit(ServiceEvents.IS_LOADING, { isLoading: true });
    try {
      console.log("Service: Disconnecting session:", topic);
      await this.walletKit.disconnectSession({
        topic: topic,
        reason: reason,
      });
      console.log("Service: Disconnect call successful for topic:", topic);
    } catch (error: unknown) {
      console.error("Service: Failed to disconnect session:", error);
      this.emit(ServiceEvents.Error, { message: (error as Error).message || "Failed to disconnect session" });
      throw error;
    } finally {
      this.emit(ServiceEvents.IS_LOADING, { isLoading: false });
    }
  }

  // Typed EventEmitter methods
  on<E extends keyof WalletConnectServiceEvents>(event: E, listener: WalletConnectServiceEvents[E]): this {
    return super.on(event, listener as (...args: any[]) => void);
  }
  once<E extends keyof WalletConnectServiceEvents>(event: E, listener: WalletConnectServiceEvents[E]): this {
    return super.once(event, listener as (...args: any[]) => void);
  }
  off<E extends keyof WalletConnectServiceEvents>(event: E, listener: WalletConnectServiceEvents[E]): this {
    return super.off(event, listener as (...args: any[]) => void);
  }
  removeListener<E extends keyof WalletConnectServiceEvents>(event: E, listener: WalletConnectServiceEvents[E]): this {
    return super.removeListener(event, listener as (...args: any[]) => void);
  }
  emit<E extends keyof WalletConnectServiceEvents>(event: E, ...args: Parameters<WalletConnectServiceEvents[E]>): boolean {
    return super.emit(event, ...args);
  }
}
// ------------------------------------
