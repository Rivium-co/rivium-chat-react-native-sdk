import { SDK_CONFIG, type NormalizedConfig } from '../RiviumChatConfig';

/** Build a query string from key-value pairs (avoids URLSearchParams which Hermes doesn't fully support). */
function buildQueryString(params: Record<string, string | undefined>): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
    }
  }
  return parts.length > 0 ? `?${parts.join('&')}` : '';
}
import type {
  Attachment,
  Message,
  MessageType,
  PaginatedMessages,
  Reaction,
  Room,
  UnreadSummary,
} from '../models/types';

/** Result from a message search operation. */
export interface SearchResult {
  messages: Message[];
  totalCount: number;
  hasMore: boolean;
}

/** Result from a file upload operation. */
export interface UploadResult {
  url: string;
  filename: string;
  mimeType: string;
  size: number;
}

/** Mention information for a user. */
export interface Mention {
  id: string;
  messageId: string;
  roomId: string;
  userId: string;
  mentionedAt: string;
  message: Message;
}

/** HTTP API service for RiviumChat backend. */
export class ApiService {
  private config: NormalizedConfig;

  constructor(config: NormalizedConfig) {
    this.config = config;
  }

  // ─── Room Operations ─────────────────────────────────────────────────

  /** Find or create a room by external ID. */
  async findOrCreateRoom(
    externalId: string,
    participants: Array<Record<string, string>>,
    metadata?: Record<string, unknown>
  ): Promise<Room> {
    const result = await this.request<Record<string, unknown>>('POST', '/rooms/find-or-create', {
      externalId,
      participants,
      metadata,
    });
    // API returns { room: {...}, created: bool }
    if (result && typeof result === 'object' && 'room' in result) {
      return result.room as Room;
    }
    return result as unknown as Room;
  }

  /** List all rooms for the current user. */
  async listRooms(): Promise<Room[]> {
    const qs = buildQueryString({ userId: this.config.userId });
    return this.request<Room[]>('GET', `/rooms${qs}`);
  }

  /** Get a room by ID. */
  async getRoom(roomId: string): Promise<Room> {
    return this.request<Room>('GET', `/rooms/${roomId}`);
  }

  /** Get a room by external ID. */
  async getRoomByExternalId(externalId: string): Promise<Room> {
    return this.request<Room>('GET', `/rooms/external/${encodeURIComponent(externalId)}`);
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
    return this.request<Room>('POST', '/rooms', {
      name,
      externalId: options?.externalId,
      metadata: options?.metadata,
      participants: options?.participants,
    });
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
    return this.request<Room>('PATCH', `/rooms/${roomId}`, updates);
  }

  /** Delete a room. */
  async deleteRoom(roomId: string): Promise<void> {
    await this.request('DELETE', `/rooms/${roomId}`);
  }

  /** Add a participant to a room. */
  async addParticipant(
    roomId: string,
    userId: string,
    options?: { role?: string; displayName?: string }
  ): Promise<void> {
    await this.request('POST', `/rooms/${roomId}/participants`, {
      userId,
      role: options?.role,
      displayName: options?.displayName,
    });
  }

  /** Remove a participant from a room. */
  async removeParticipant(roomId: string, userId: string): Promise<void> {
    await this.request('DELETE', `/rooms/${roomId}/participants/${userId}`);
  }

  // ─── Message Operations ──────────────────────────────────────────────

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
    return this.request<Message>('POST', `/rooms/${roomId}/messages`, {
      senderUserId: this.config.userId,
      content,
      type: options?.type ?? 'text',
      attachments: options?.attachments,
      replyToId: options?.replyToId,
      metadata: options?.metadata,
    });
  }

  /** Get messages for a room with pagination. */
  async getMessages(
    roomId: string,
    options?: { limit?: number; before?: string }
  ): Promise<PaginatedMessages> {
    const qs = buildQueryString({
      limit: String(options?.limit ?? 50),
      before: options?.before,
    });
    return this.request<PaginatedMessages>(
      'GET',
      `/rooms/${roomId}/messages${qs}`
    );
  }

  /** Delete a message. */
  async deleteMessage(roomId: string, messageId: string): Promise<void> {
    await this.request('DELETE', `/rooms/${roomId}/messages/${messageId}`);
  }

  /** Edit a message. */
  async editMessage(roomId: string, messageId: string, content: string): Promise<Message> {
    return this.request<Message>('PATCH', `/rooms/${roomId}/messages/${messageId}`, {
      content,
    });
  }

  // ─── Read Status ─────────────────────────────────────────────────────

  /** Mark messages as read up to a certain message. */
  async markAsRead(roomId: string, messageId?: string): Promise<void> {
    await this.request('POST', `/rooms/${roomId}/read`, {
      userId: this.config.userId,
      ...(messageId && { messageId }),
    });
  }

  /** Get unread summary for all rooms. */
  async getUnreadSummary(): Promise<UnreadSummary> {
    const qs = buildQueryString({ userId: this.config.userId });
    return this.request<UnreadSummary>('GET', `/rooms/unread-summary${qs}`);
  }

  // ─── Reactions ───────────────────────────────────────────────────────

  /** Add a reaction to a message. */
  async addReaction(roomId: string, messageId: string, emoji: string): Promise<void> {
    await this.request('POST', `/messages/${messageId}/reactions`, {
      userId: this.config.userId,
      emoji,
    });
  }

  /** Remove a reaction from a message. */
  async removeReaction(roomId: string, messageId: string, emoji: string): Promise<void> {
    await this.request('DELETE', `/messages/${messageId}/reactions`, {
      userId: this.config.userId,
      emoji,
    });
  }

  /** Get all reactions for a message. */
  async getReactions(roomId: string, messageId: string): Promise<Reaction[]> {
    return this.request<Reaction[]>('GET', `/rooms/${roomId}/messages/${messageId}/reactions`);
  }

  // ─── Pinned Messages ───────────────────────────────────────────────────

  /** Pin a message. */
  async pinMessage(roomId: string, messageId: string): Promise<void> {
    await this.request('POST', `/rooms/${roomId}/messages/${messageId}/pin`);
  }

  /** Unpin a message. */
  async unpinMessage(roomId: string, messageId: string): Promise<void> {
    await this.request('DELETE', `/rooms/${roomId}/messages/${messageId}/pin`);
  }

  /** Get all pinned messages in a room. */
  async getPinnedMessages(roomId: string): Promise<Message[]> {
    return this.request<Message[]>('GET', `/rooms/${roomId}/pinned`);
  }

  // ─── Search & Mentions ─────────────────────────────────────────────────

  /** Search messages in a room. */
  async searchMessages(
    roomId: string,
    query: string,
    options?: { limit?: number; offset?: number }
  ): Promise<SearchResult> {
    const qs = buildQueryString({
      q: query,
      limit: options?.limit ? String(options.limit) : undefined,
      offset: options?.offset ? String(options.offset) : undefined,
    });
    return this.request<SearchResult>('GET', `/rooms/${roomId}/messages/search${qs}`);
  }

  /** Get mentions for the current user in a room. */
  async getMentions(roomId: string, options?: { limit?: number; before?: string }): Promise<Mention[]> {
    const qs = buildQueryString({
      limit: options?.limit ? String(options.limit) : undefined,
      before: options?.before,
    });
    return this.request<Mention[]>('GET', `/rooms/${roomId}/mentions${qs}`);
  }

  // ─── File Upload ───────────────────────────────────────────────────────

  /** Upload a file attachment. */
  async uploadFile(roomId: string, file: Blob | File, filename?: string): Promise<UploadResult> {
    const formData = new FormData();
    formData.append('file', file, filename);

    const url = `${SDK_CONFIG.baseUrl}/rooms/${roomId}/upload`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'X-API-Key': this.config.apiKey,
        'X-User-ID': this.config.userId,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new RiviumChatError(
        `HTTP error ${response.status}: ${response.statusText}`,
        response.status,
        errorData
      );
    }

    return response.json();
  }

  // ─── Typing Indicator ────────────────────────────────────────────────

  /** Send typing indicator. */
  async sendTypingIndicator(roomId: string, isTyping: boolean): Promise<void> {
    await this.request('POST', `/rooms/${roomId}/typing`, { isTyping });
  }

  // ─── Presence ────────────────────────────────────────────────────────

  /** Get online users in a room. */
  async getRoomPresence(roomId: string): Promise<string[]> {
    const result = await this.request<{ online: string[]; numUsers: number }>('GET', `/rooms/${roomId}/presence`);
    return result.online ?? [];
  }

  // ─── Centrifugo Token ────────────────────────────────────────────────

  /** Get a Centrifugo connection token from the server. */
  async getCentrifugoToken(userId: string, info?: Record<string, string>): Promise<string> {
    const result = await this.request<{ token: string }>('POST', '/centrifugo/token', {
      userId,
      ...(info && Object.keys(info).length > 0 ? { info } : {}),
    });
    return result.token;
  }

  // ─── Private Helpers ─────────────────────────────────────────────────

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const url = `${SDK_CONFIG.baseUrl}/api/v1${path}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-API-Key': this.config.apiKey,
      'X-User-ID': this.config.userId,
    };

    const options: RequestInit = {
      method,
      headers,
    };

    if (body && method !== 'GET') {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      const errorData = await response.text();
      throw new RiviumChatError(
        `HTTP error ${response.status}: ${response.statusText}`,
        response.status,
        errorData
      );
    }

    // Handle empty responses
    const text = await response.text();
    if (!text) {
      return undefined as T;
    }

    return JSON.parse(text) as T;
  }
}

/** Error thrown by RiviumChat SDK operations. */
export class RiviumChatError extends Error {
  public readonly statusCode?: number;
  public readonly responseData?: string;

  constructor(message: string, statusCode?: number, responseData?: string) {
    super(message);
    this.name = 'RiviumChatError';
    this.statusCode = statusCode;
    this.responseData = responseData;
  }
}
