import { SDK_CONFIG, type NormalizedConfig } from '../RiviumChatConfig';
import type { AuthErrorEvent } from '../events/events';
import type { TokenManager } from './TokenManager';
import { SDK_HEADER, SDK_HEADER_VALUE } from '../version';

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
  /** Number of messages that match the query. */
  total: number;
  /** @deprecated Use `total`. Same value. */
  totalCount: number;
  /** @deprecated Compare `offset + messages.length` with `total`. */
  hasMore: boolean;
}

/** Message thrown by `uploadFile()`, which the API does not offer. */
export const UPLOAD_NOT_SUPPORTED =
  'uploadFile() is not supported: Rivium Chat does not store files. Upload the file to your own storage ' +
  'and send its URL as an attachment with sendMessage().';
/** Message thrown by `updateRoom()`, which the API does not offer. */
export const UPDATE_ROOM_NOT_SUPPORTED =
  'updateRoom() is not supported: rooms cannot be changed from the client SDK. ' +
  'Set the name and metadata when you create the room.';

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
  /** The user who was mentioned. */
  mentionedUserId: string;
  /** When the mention was made (ISO 8601). */
  createdAt: string;
  /** @deprecated Use `mentionedUserId`. Same value. */
  userId: string;
  /** @deprecated Use `createdAt`. Same value. */
  mentionedAt: string;
  message: Message;
}

/** HTTP API service for RiviumChat backend. */
export class ApiService {
  private config: NormalizedConfig;

  constructor(
    config: NormalizedConfig,
    private readonly tokens?: TokenManager,
    private readonly onAuthError?: (event: AuthErrorEvent) => void,
  ) {
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
    return this.request<Room>('GET', `/rooms/by-external-id/${encodeURIComponent(externalId)}`);
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
    return this.request<Room>('POST', '/rooms', {
      name,
      externalId: options?.externalId,
      metadata: options?.metadata,
      // The API names the user `externalUserId`; `userId` is accepted here for
      // apps written against earlier releases.
      participants: options?.participants?.map(({ userId, externalUserId, ...rest }) => ({
        externalUserId: externalUserId ?? userId,
        ...rest,
      })),
    });
  }

  /**
   * Not supported: the API has no route to change a room.
   * @deprecated Always rejects with a `RiviumChatError`.
   */
  async updateRoom(
    _roomId: string,
    _updates: {
      name?: string;
      metadata?: Record<string, unknown>;
      isActive?: boolean;
    }
  ): Promise<Room> {
    throw new RiviumChatError(UPDATE_ROOM_NOT_SUPPORTED);
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
      externalUserId: userId,
      role: options?.role,
      displayName: options?.displayName,
    });
  }

  /** Remove a participant from a room. */
  async removeParticipant(roomId: string, userId: string): Promise<void> {
    await this.request('DELETE', `/rooms/${roomId}/participants/${encodeURIComponent(userId)}`);
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
      /** Sent only by the offline outbox (`queueOfflineMessages`). */
      clientMessageId?: string;
    }
  ): Promise<Message> {
    return this.request<Message>('POST', `/rooms/${roomId}/messages`, {
      senderUserId: this.config.userId,
      content,
      type: options?.type ?? 'text',
      attachments: options?.attachments,
      replyToId: options?.replyToId,
      metadata: options?.metadata,
      ...(options?.clientMessageId && { clientMessageId: options.clientMessageId }),
    });
  }

  /** Get messages for a room with pagination. */
  async getMessages(
    roomId: string,
    options?: { limit?: number; before?: string }
  ): Promise<PaginatedMessages> {
    const qs = buildQueryString({
      userId: this.config.userId,
      limit: String(options?.limit ?? 50),
      before: options?.before,
    });
    return this.request<PaginatedMessages>(
      'GET',
      `/rooms/${roomId}/messages${qs}`
    );
  }

  /** Delete a message. `roomId` is kept for compatibility; the message id is enough. */
  async deleteMessage(_roomId: string, messageId: string): Promise<void> {
    const qs = buildQueryString({ userId: this.config.userId });
    await this.request('DELETE', `/messages/${messageId}${qs}`);
  }

  /** Edit a message. `roomId` is kept for compatibility; the message id is enough. */
  async editMessage(_roomId: string, messageId: string, content: string): Promise<Message> {
    return this.request<Message>('PUT', `/messages/${messageId}`, {
      userId: this.config.userId,
      content,
    });
  }

  // ─── Read Status ─────────────────────────────────────────────────────

  /**
   * Mark all messages in a room as read. `messageId` is ignored: the API marks
   * the whole room read.
   */
  async markAsRead(roomId: string, _messageId?: string): Promise<void> {
    await this.request('POST', `/rooms/${roomId}/read`, {
      userId: this.config.userId,
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
  async getReactions(_roomId: string, messageId: string): Promise<Reaction[]> {
    return this.request<Reaction[]>('GET', `/messages/${messageId}/reactions`);
  }

  // ─── Pinned Messages ───────────────────────────────────────────────────

  /** Pin a message. `roomId` is kept for compatibility; the message id is enough. */
  async pinMessage(_roomId: string, messageId: string): Promise<void> {
    await this.request('POST', `/messages/${messageId}/pin`, { userId: this.config.userId });
  }

  /** Unpin a message. `roomId` is kept for compatibility; the message id is enough. */
  async unpinMessage(_roomId: string, messageId: string): Promise<void> {
    await this.request('DELETE', `/messages/${messageId}/pin`, { userId: this.config.userId });
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
      userId: this.config.userId,
      q: query,
      limit: options?.limit ? String(options.limit) : undefined,
      offset: options?.offset ? String(options.offset) : undefined,
    });
    const result = await this.request<{ messages?: Message[]; total?: number }>(
      'GET',
      `/rooms/${roomId}/messages/search${qs}`
    );
    const messages = result?.messages ?? [];
    const total = result?.total ?? messages.length;
    return {
      messages,
      total,
      totalCount: total,
      hasMore: (options?.offset ?? 0) + messages.length < total,
    };
  }

  /**
   * Get mentions for the current user in a room, newest first. `before` is
   * ignored: the API returns the latest `limit` mentions.
   */
  async getMentions(roomId: string, options?: { limit?: number; before?: string }): Promise<Mention[]> {
    const qs = buildQueryString({
      userId: this.config.userId,
      limit: options?.limit ? String(options.limit) : undefined,
    });
    const mentions = await this.request<Mention[]>('GET', `/rooms/${roomId}/mentions${qs}`);
    // Older releases typed these fields; fill them from what the API sends.
    return (mentions ?? []).map((m) => ({
      ...m,
      userId: m.userId ?? m.mentionedUserId,
      mentionedAt: m.mentionedAt ?? m.createdAt,
    }));
  }

  // ─── File Upload ───────────────────────────────────────────────────────

  /**
   * Not supported: Rivium Chat does not store files. Upload the file to your
   * own storage and send its URL as an attachment with `sendMessage()`.
   * @deprecated Always rejects with a `RiviumChatError`.
   */
  async uploadFile(_roomId: string, _file: Blob | File, _filename?: string): Promise<UploadResult> {
    throw new RiviumChatError(UPLOAD_NOT_SUPPORTED);
  }

  // ─── Typing Indicator ────────────────────────────────────────────────

  /**
   * Not supported over HTTP: typing goes over the realtime connection. Use
   * `RiviumChatClient.publishTyping()` or `RiviumChatClient.sendTypingIndicator()`.
   * @deprecated Always rejects with a `RiviumChatError`.
   */
  async sendTypingIndicator(_roomId: string, _isTyping: boolean): Promise<void> {
    throw new RiviumChatError(
      'ApiService.sendTypingIndicator() is not supported: typing goes over the realtime connection. ' +
        'Use RiviumChatClient.sendTypingIndicator().'
    );
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

  /** Gets a user token, reporting a failing tokenProvider as an auth error. */
  private async userToken(get: () => Promise<string>): Promise<string> {
    try {
      return await get();
    } catch (error) {
      this.onAuthError?.({ code: 'token_provider_failed', message: 'tokenProvider failed', error });
      throw new RiviumChatError('tokenProvider failed', 0, String(error));
    }
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const url = `${SDK_CONFIG.baseUrl}/api/v1${path}`;

    const send = async (token?: string): Promise<Response> => {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-API-Key': this.config.apiKey,
        'X-User-ID': this.config.userId,
        [SDK_HEADER]: SDK_HEADER_VALUE,
      };
      if (token) headers['X-User-Token'] = token;
      const options: RequestInit = { method, headers };
      if (body && method !== 'GET') {
        options.body = JSON.stringify(body);
      }
      return fetchWithTimeout(url, options, this.config.requestTimeoutMs);
    };

    let response: Response;
    if (this.tokens) {
      response = await send(await this.userToken(() => this.tokens!.get()));
      // An expired token is routine: fetch a new one and replay the request
      // once. The user never sees it.
      if (response.status === 401 && parseAuthCode(await response.clone().text()) === 'token_expired') {
        response = await send(await this.userToken(() => this.tokens!.refresh()));
      }
    } else {
      response = await send();
    }

    if (!response.ok) {
      const errorData = await response.text();
      const code = response.status === 401 ? parseAuthCode(errorData) : undefined;
      if (code && this.tokens) {
        this.onAuthError?.({ code, message: parseMessage(errorData) });
      }
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

/** The identity error code (`token_*`) of a 401 body, if any. */
function parseAuthCode(text: string): string | undefined {
  try {
    const code = JSON.parse(text)?.code;
    return typeof code === 'string' && code.startsWith('token_') ? code : undefined;
  } catch {
    return undefined;
  }
}

function parseMessage(text: string): string {
  try {
    const message = JSON.parse(text)?.message;
    return typeof message === 'string' ? message : 'Authentication failed';
  } catch {
    return 'Authentication failed';
  }
}

/** Error thrown by RiviumChat SDK operations. */
export class RiviumChatError extends Error {
  public readonly statusCode?: number;
  public readonly responseData?: string;
  /** Set when the request failed before an answer: `'timeout'`. */
  public readonly code?: string;

  constructor(message: string, statusCode?: number, responseData?: string, code?: string) {
    super(message);
    this.name = 'RiviumChatError';
    this.statusCode = statusCode;
    this.responseData = responseData;
    this.code = code;
  }
}

/**
 * fetch() that gives up after `timeoutMs`: the request is aborted and the
 * promise rejects with a RiviumChatError (code `'timeout'`), also where
 * fetch ignores the abort signal.
 */
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : undefined;
  const timeoutError = new RiviumChatError(`Request timed out after ${timeoutMs / 1000} seconds`, undefined, undefined, 'timeout');
  let timedOut = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      // Reject first, then abort: a browser's fetch rejects with AbortError the moment it is aborted, and that must
      // not win the race. The catch below maps any rejection after the timer fired to the timeout error too.
      timedOut = true;
      reject(timeoutError);
      controller?.abort();
    }, timeoutMs);
  });
  try {
    return await Promise.race([
      fetch(url, controller ? { ...options, signal: controller.signal } : options),
      timeout,
    ]);
  } catch (error) {
    if (timedOut) throw timeoutError;
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
