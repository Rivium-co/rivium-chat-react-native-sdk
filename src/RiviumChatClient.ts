import { type RiviumChatConfig, type NormalizedConfig, normalizeConfig } from './RiviumChatConfig';
import { ApiService, type Mention, type SearchResult, type UploadResult } from './services/ApiService';
import { RealtimeService } from './services/RealtimeService';
import { TokenManager } from './services/TokenManager';
import { Outbox, isTransientSendError, pendingMessage, uuidV4, type PendingMessage } from './services/Outbox';
import type {
  Attachment,
  ConnectionState,
  Message,
  MessageType,
  PaginatedMessages,
  Reaction,
  Room,
  UnreadSummary,
} from './models/types';
import type { RiviumChatEventMap } from './events/events';

type EventCallback<K extends keyof RiviumChatEventMap> = (event: RiviumChatEventMap[K]) => void;

/**
 * Main entry point for the RiviumChat SDK.
 *
 * @example
 * ```typescript
 * import { RiviumChatClient } from '@rivium/react-native-chat';
 *
 * const client = new RiviumChatClient({
 *   apiKey: 'your-api-key',
 *   userId: 'user-123',
 *   userInfo: { displayName: 'John Doe' },
 * });
 *
 * client.connect();
 *
 * // Listen for messages
 * client.on('message', (event) => {
 *   console.log('New message:', event.message.content);
 * });
 *
 * // Send a message
 * const message = await client.sendMessage(roomId, 'Hello!');
 * ```
 */
export class RiviumChatClient {
  private config: NormalizedConfig;
  private apiService: ApiService;
  private realtimeService: RealtimeService;
  private outbox: Outbox | null = null;

  constructor(config: RiviumChatConfig) {
    this.config = normalizeConfig(config);
    const tokens = this.config.tokenProvider ? new TokenManager(this.config.tokenProvider) : undefined;
    this.apiService = new ApiService(this.config, tokens, (event) =>
      this.realtimeService.emit('authError', event),
    );
    this.realtimeService = new RealtimeService(
      this.config,
      // With a tokenProvider the same user token authenticates REST and the
      // realtime connection; centrifuge asks again before it expires.
      tokens
        ? () => this.realtimeToken(tokens)
        : () => this.apiService.getCentrifugoToken(this.config.userId, this.config.userInfo),
    );
    if (this.config.queueOfflineMessages) {
      this.outbox = new Outbox({
        userId: this.config.userId,
        store: this.config.outboxStore,
        send: (item) =>
          this.apiService.sendMessage(item.roomId, item.content, {
            type: item.type,
            attachments: item.attachments,
            replyToId: item.replyToId,
            metadata: item.metadata,
            clientMessageId: item.clientMessageId,
          }),
        onSent: (event) => this.realtimeService.emit('messageSent', event),
        onFailed: (event) => this.realtimeService.emit('messageFailed', event),
      });
      this.realtimeService.on('connectionState', (event) => {
        if (event.state === 'connected') void this.outbox?.retryNow();
      });
    }
  }

  /** Whether this client queues messages written without network (`queueOfflineMessages`). */
  get queueOfflineMessages(): boolean {
    return this.outbox !== null;
  }

  /** The user token for the realtime connection; a failing tokenProvider is reported like on REST calls. */
  private async realtimeToken(tokens: TokenManager): Promise<string> {
    try {
      return await tokens.get();
    } catch (error) {
      this.realtimeService.emit('authError', { code: 'token_provider_failed', message: 'tokenProvider failed', error });
      throw error;
    }
  }

  // ─── Event Handling ────────────────────────────────────────────────────

  /**
   * Add event listener.
   *
   * @example
   * ```typescript
   * client.on('message', (event) => {
   *   console.log('New message:', event.message.content);
   * });
   *
   * client.on('typing', (event) => {
   *   console.log(`${event.userId} is ${event.isTyping ? 'typing' : 'not typing'}`);
   * });
   * ```
   */
  on<K extends keyof RiviumChatEventMap>(event: K, callback: EventCallback<K>): void {
    this.realtimeService.on(event, callback);
  }

  /** Remove event listener. */
  off<K extends keyof RiviumChatEventMap>(event: K, callback: EventCallback<K>): void {
    this.realtimeService.off(event, callback);
  }

  /** Subscribe to message events. Returns unsubscribe function. */
  onMessage(callback: EventCallback<'message'>): () => void {
    this.on('message', callback);
    return () => this.off('message', callback);
  }

  /** Subscribe to message deleted events. Returns unsubscribe function. */
  onMessageDeleted(callback: EventCallback<'messageDeleted'>): () => void {
    this.on('messageDeleted', callback);
    return () => this.off('messageDeleted', callback);
  }

  /** Subscribe to message edited events. Returns unsubscribe function. */
  onMessageEdited(callback: EventCallback<'messageEdited'>): () => void {
    this.on('messageEdited', callback);
    return () => this.off('messageEdited', callback);
  }

  /** Subscribe to reaction events. Returns unsubscribe function. */
  onReaction(callback: EventCallback<'reaction'>): () => void {
    this.on('reaction', callback);
    return () => this.off('reaction', callback);
  }

  /** Subscribe to typing events. Returns unsubscribe function. */
  onTyping(callback: EventCallback<'typing'>): () => void {
    this.on('typing', callback);
    return () => this.off('typing', callback);
  }

  /** Subscribe to presence change events. Returns unsubscribe function. */
  onPresenceChange(callback: EventCallback<'presence'>): () => void {
    this.on('presence', callback);
    return () => this.off('presence', callback);
  }

  /** Subscribe to read receipt events. Returns unsubscribe function. */
  onReadReceipt(callback: EventCallback<'readReceipt'>): () => void {
    this.on('readReceipt', callback);
    return () => this.off('readReceipt', callback);
  }

  /** Subscribe to message pin/unpin events. Returns unsubscribe function. */
  onMessagePinChanged(callback: EventCallback<'messagePinChanged'>): () => void {
    this.on('messagePinChanged', callback);
    return () => this.off('messagePinChanged', callback);
  }

  /** Subscribe to room updated events. Returns unsubscribe function. */
  onRoomUpdated(callback: EventCallback<'roomUpdated'>): () => void {
    this.on('roomUpdated', callback);
    return () => this.off('roomUpdated', callback);
  }

  /** Subscribe to connection state changes. Returns unsubscribe function. */
  onConnectionStateChange(callback: EventCallback<'connectionState'>): () => void {
    this.on('connectionState', callback);
    return () => this.off('connectionState', callback);
  }

  /** Subscribe to subscription state changes. Returns unsubscribe function. */
  onSubscriptionState(callback: EventCallback<'subscriptionState'>): () => void {
    this.on('subscriptionState', callback);
    return () => this.off('subscriptionState', callback);
  }

  /** A queued message was stored by the Chat API. Returns unsubscribe function. */
  onMessageSent(callback: EventCallback<'messageSent'>): () => void {
    this.on('messageSent', callback);
    return () => this.off('messageSent', callback);
  }

  /** A queued message left the outbox without being stored. Returns unsubscribe function. */
  onMessageFailed(callback: EventCallback<'messageFailed'>): () => void {
    this.on('messageFailed', callback);
    return () => this.off('messageFailed', callback);
  }

  /** Subscribe to recovery failed events. Returns unsubscribe function. */
  onRecoveryFailed(callback: EventCallback<'recoveryFailed'>): () => void {
    this.on('recoveryFailed', callback);
    return () => this.off('recoveryFailed', callback);
  }

  // ─── Connection ────────────────────────────────────────────────────────

  /** Current connection state. */
  get connectionState(): ConnectionState {
    return this.realtimeService.currentConnectionState;
  }

  /** Whether the client is currently connected. */
  get isConnected(): boolean {
    return this.realtimeService.currentConnectionState === 'connected';
  }

  /**
   * Connect to the RiviumChat realtime server. A failing tokenProvider is
   * reported on `authError`; await the returned promise to handle a failure
   * directly.
   */
  connect(): Promise<void> {
    const connecting = this.realtimeService.connect();
    // Callers written against the void signature never await: keep a failure
    // from becoming an unhandled rejection.
    connecting.catch(() => {});
    return connecting;
  }

  /** Disconnect from the RiviumChat realtime server. */
  disconnect(): void {
    this.realtimeService.disconnect();
  }

  /**
   * Clean up resources. Messages still waiting in the offline outbox are
   * forgotten in memory (an `outboxStore` keeps them for the next client of
   * the same user; `clearPendingMessages()` removes them).
   */
  dispose(): void {
    this.disconnect();
    this.outbox?.dispose();
  }

  // ─── Room Operations ───────────────────────────────────────────────────

  /**
   * Find or create a room by external ID.
   *
   * @param externalId - Your application's ID for this conversation
   * @param participants - List of participant info (externalUserId, displayName, locale)
   * @param metadata - Optional metadata for the room
   */
  async findOrCreateRoom(
    externalId: string,
    participants: Array<Record<string, string>>,
    metadata?: Record<string, unknown>
  ): Promise<Room> {
    return this.apiService.findOrCreateRoom(externalId, participants, metadata);
  }

  /** List all rooms the current user is a participant in. */
  async listRooms(): Promise<Room[]> {
    return this.apiService.listRooms();
  }

  /** Get a room by ID. */
  async getRoom(roomId: string): Promise<Room> {
    return this.apiService.getRoom(roomId);
  }

  /** Get a room by external ID. */
  async getRoomByExternalId(externalId: string): Promise<Room> {
    return this.apiService.getRoomByExternalId(externalId);
  }

  /** Create a new room. */
  async createRoom(
    name: string,
    options?: {
      externalId?: string;
      metadata?: Record<string, unknown>;
      participants?: Array<{ userId?: string; externalUserId?: string; role?: string; displayName?: string; locale?: string }>;
    }
  ): Promise<Room> {
    return this.apiService.createRoom(name, options);
  }

  /**
   * Not supported: rooms cannot be changed from the client SDK. Set the name
   * and metadata when you create the room.
   * @deprecated Always rejects with a `RiviumChatError`.
   */
  async updateRoom(
    roomId: string,
    updates: {
      name?: string;
      metadata?: Record<string, unknown>;
      isActive?: boolean;
    }
  ): Promise<Room> {
    return this.apiService.updateRoom(roomId, updates);
  }

  /** Delete a room. */
  async deleteRoom(roomId: string): Promise<void> {
    return this.apiService.deleteRoom(roomId);
  }

  /** Add a participant to a room. */
  async addParticipant(
    roomId: string,
    userId: string,
    options?: { role?: string; displayName?: string }
  ): Promise<void> {
    return this.apiService.addParticipant(roomId, userId, options);
  }

  /** Remove a participant from a room. */
  async removeParticipant(roomId: string, userId: string): Promise<void> {
    return this.apiService.removeParticipant(roomId, userId);
  }

  /** Subscribe to realtime events for a room. */
  subscribeToRoom(roomId: string): void {
    this.realtimeService.subscribeToRoom(roomId);
  }

  /** Subscribe only to chat channel for messages/read receipts, without joining presence or typing. */
  observeRoom(roomId: string): void {
    this.realtimeService.observeRoom(roomId);
  }

  /** Unsubscribe from realtime events for a room. */
  unsubscribeFromRoom(roomId: string): void {
    this.realtimeService.unsubscribeFromRoom(roomId);
  }

  /** Leave presence and typing channels but keep chat channel for unread updates. */
  leaveRoom(roomId: string): void {
    this.realtimeService.leaveRoom(roomId);
  }

  // ─── Message Operations ────────────────────────────────────────────────

  /**
   * Send a message to a room.
   *
   * With `queueOfflineMessages`, a message that cannot be sent now (no
   * network, timeout, 408, 429, 5xx) is queued and returned as pending
   * (`isPending: true`, `id: "local_<clientMessageId>"`) instead of rejecting;
   * it is sent when the connection is back (`messageSent` / `messageFailed`).
   * Attachments are queued as they are (URLs of files you already uploaded).
   */
  async sendMessage(
    roomId: string,
    content: string,
    options?: {
      type?: MessageType;
      attachments?: Attachment[];
      replyToId?: string;
      metadata?: Record<string, unknown>;
    }
  ): Promise<Message> {
    const outbox = this.outbox;
    if (!outbox) return this.apiService.sendMessage(roomId, content, options);

    const clientMessageId = uuidV4();
    const pending = pendingMessage(roomId, this.config.userId, content, clientMessageId, options, Date.now());
    // Messages already waiting for this room go first: queue behind them.
    if (await outbox.hasPending(roomId)) {
      await outbox.enqueue(pending);
      if (this.isConnected) void outbox.flush();
      return pending;
    }
    try {
      const sent = await this.apiService.sendMessage(roomId, content, { ...options, clientMessageId });
      return sent && !sent.clientMessageId ? { ...sent, clientMessageId } : sent;
    } catch (error) {
      if (!isTransientSendError(error)) throw error;
      await outbox.enqueue(pending);
      return pending;
    }
  }

  // ─── Offline outbox (queueOfflineMessages) ─────────────────────────────

  /** Messages waiting in the offline outbox, oldest first; only `roomId`'s when given. */
  async getPendingMessages(roomId?: string): Promise<PendingMessage[]> {
    return this.outbox ? this.outbox.list(roomId) : [];
  }

  /** Sends the waiting messages now (instead of waiting for the next retry). */
  async retryPendingMessages(): Promise<void> {
    await this.outbox?.retryNow();
  }

  /**
   * Removes a waiting message (by its `localId`) from the outbox; emits
   * nothing. Returns false when it is not waiting (already sent or failed).
   */
  async cancelPendingMessage(localId: string): Promise<boolean> {
    return this.outbox ? this.outbox.cancel(localId) : false;
  }

  /**
   * Empties the offline outbox, also its `outboxStore`. Call it on sign-out
   * when another user may sign in on this device.
   */
  async clearPendingMessages(): Promise<void> {
    await this.outbox?.clear();
  }

  /** Get messages for a room with pagination. */
  async getMessages(
    roomId: string,
    options?: { limit?: number; before?: string }
  ): Promise<PaginatedMessages> {
    return this.apiService.getMessages(roomId, options);
  }

  /** Delete a message. */
  async deleteMessage(roomId: string, messageId: string): Promise<void> {
    return this.apiService.deleteMessage(roomId, messageId);
  }

  /** Edit a message. */
  async editMessage(roomId: string, messageId: string, content: string): Promise<Message> {
    return this.apiService.editMessage(roomId, messageId, content);
  }

  // ─── Read Status ───────────────────────────────────────────────────────

  /** Mark all messages in a room as read. `messageId` is ignored. */
  async markAsRead(roomId: string, messageId?: string): Promise<void> {
    return this.apiService.markAsRead(roomId, messageId);
  }

  /** Get unread summary for all rooms. */
  async getUnreadSummary(): Promise<UnreadSummary> {
    return this.apiService.getUnreadSummary();
  }

  // ─── Reactions ─────────────────────────────────────────────────────────

  /** Add a reaction to a message. */
  async addReaction(roomId: string, messageId: string, emoji: string): Promise<void> {
    return this.apiService.addReaction(roomId, messageId, emoji);
  }

  /** Remove a reaction from a message. */
  async removeReaction(roomId: string, messageId: string, emoji: string): Promise<void> {
    return this.apiService.removeReaction(roomId, messageId, emoji);
  }

  /** Get all reactions for a message. */
  async getReactions(roomId: string, messageId: string): Promise<Reaction[]> {
    return this.apiService.getReactions(roomId, messageId);
  }

  // ─── Pinned Messages ──────────────────────────────────────────────────

  /** Pin a message. */
  async pinMessage(roomId: string, messageId: string): Promise<void> {
    return this.apiService.pinMessage(roomId, messageId);
  }

  /** Unpin a message. */
  async unpinMessage(roomId: string, messageId: string): Promise<void> {
    return this.apiService.unpinMessage(roomId, messageId);
  }

  /** Get all pinned messages in a room. */
  async getPinnedMessages(roomId: string): Promise<Message[]> {
    return this.apiService.getPinnedMessages(roomId);
  }

  // ─── Search & Mentions ────────────────────────────────────────────────

  /** Search messages in a room. */
  async searchMessages(
    roomId: string,
    query: string,
    options?: { limit?: number; offset?: number }
  ): Promise<SearchResult> {
    return this.apiService.searchMessages(roomId, query, options);
  }

  /** Get mentions for the current user in a room. */
  async getMentions(roomId: string, options?: { limit?: number; before?: string }): Promise<Mention[]> {
    return this.apiService.getMentions(roomId, options);
  }

  // ─── File Upload ──────────────────────────────────────────────────────

  /**
   * Not supported: Rivium Chat does not store files. Upload the file to your
   * own storage and send its URL as an attachment:
   *
   * ```typescript
   * await client.sendMessage(roomId, 'photo.jpg', {
   *   type: 'image',
   *   attachments: [{ url, mimeType: 'image/jpeg', name: 'photo.jpg', size }],
   * });
   * ```
   * @deprecated Always rejects with a `RiviumChatError`.
   */
  async uploadFile(roomId: string, file: Blob | File, filename?: string): Promise<UploadResult> {
    return this.apiService.uploadFile(roomId, file, filename);
  }

  // ─── Typing Indicator ──────────────────────────────────────────────────

  /** Publish typing indicator via realtime channel (throttled to 2 seconds). */
  async publishTyping(roomId: string): Promise<void> {
    return this.realtimeService.publishTyping(roomId);
  }

  /** Send a typing state via the realtime channel (no throttle). Needs `subscribeToRoom()` first. */
  async sendTypingIndicator(roomId: string, isTyping = true): Promise<void> {
    return this.realtimeService.sendTyping(roomId, isTyping);
  }

  // ─── Presence ──────────────────────────────────────────────────────────

  /** Get online users in a room. */
  async getRoomPresence(roomId: string): Promise<string[]> {
    return this.apiService.getRoomPresence(roomId);
  }
}
