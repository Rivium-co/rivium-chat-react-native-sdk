import { type RiviumChatConfig, type NormalizedConfig, normalizeConfig } from './RiviumChatConfig';
import { ApiService, type Mention, type SearchResult, type UploadResult } from './services/ApiService';
import { RealtimeService } from './services/RealtimeService';
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

  constructor(config: RiviumChatConfig) {
    this.config = normalizeConfig(config);
    this.apiService = new ApiService(this.config);
    this.realtimeService = new RealtimeService(
      this.config,
      () => this.apiService.getCentrifugoToken(this.config.userId, this.config.userInfo),
    );
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

  /** Connect to the RiviumChat realtime server. */
  connect(): void {
    this.realtimeService.connect();
  }

  /** Disconnect from the RiviumChat realtime server. */
  disconnect(): void {
    this.realtimeService.disconnect();
  }

  /** Clean up resources. */
  dispose(): void {
    this.disconnect();
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
      participants?: Array<{ userId: string; role?: string }>;
    }
  ): Promise<Room> {
    return this.apiService.createRoom(name, options);
  }

  /** Update a room. */
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

  /** Send a message to a room. */
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
    return this.apiService.sendMessage(roomId, content, options);
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

  /** Mark messages as read up to a certain message. */
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

  /** Upload a file attachment. */
  async uploadFile(roomId: string, file: Blob | File, filename?: string): Promise<UploadResult> {
    return this.apiService.uploadFile(roomId, file, filename);
  }

  // ─── Typing Indicator ──────────────────────────────────────────────────

  /** Publish typing indicator via realtime channel (throttled to 2 seconds). */
  async publishTyping(roomId: string): Promise<void> {
    return this.realtimeService.publishTyping(roomId);
  }

  /** Send typing indicator via API (no throttle). */
  async sendTypingIndicator(roomId: string, isTyping = true): Promise<void> {
    return this.apiService.sendTypingIndicator(roomId, isTyping);
  }

  // ─── Presence ──────────────────────────────────────────────────────────

  /** Get online users in a room. */
  async getRoomPresence(roomId: string): Promise<string[]> {
    return this.apiService.getRoomPresence(roomId);
  }
}
