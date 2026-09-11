/**
 * RiviumChat React Native SDK - Headless chat-as-a-service.
 *
 * @example
 * ```typescript
 * import { RiviumChatClient } from '@rivium/react-native-chat';
 *
 * const client = new RiviumChatClient({
 *   apiKey: 'your-api-key',
 *   userId: 'user-123',
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
 *
 * // Cleanup
 * client.dispose();
 * ```
 *
 * @packageDocumentation
 */

// Main client
export { RiviumChatClient } from './RiviumChatClient';

// Config
export { RiviumChatConfig, SDK_CONFIG, normalizeConfig } from './RiviumChatConfig';
export type { NormalizedConfig } from './RiviumChatConfig';

// Models
export type {
  Attachment,
  ConnectionState,
  Message,
  MessageType,
  PaginatedMessages,
  Participant,
  ParticipantRole,
  Reaction,
  Room,
  RoomType,
  RoomUnread,
  SubscriptionStatus,
  UnreadSummary,
} from './models/types';

// Events
export type {
  RiviumChatEventMap,
  ConnectionStateEvent,
  MessageDeletionEvent,
  MessageEditEvent,
  MessageEvent,
  MessagePinEvent,
  PresenceEvent,
  ReactionEvent,
  ReadReceiptEvent,
  RecoveryFailedEvent,
  RoomUpdatedEvent,
  SubscriptionStateEvent,
  TypingEvent,
  AuthErrorEvent,
} from './events/events';

// Services (for advanced usage)
export { ApiService, RiviumChatError } from './services/ApiService';
export type { TokenProvider } from './services/TokenManager';
export type { Mention, SearchResult, UploadResult } from './services/ApiService';
export { RealtimeService } from './services/RealtimeService';
