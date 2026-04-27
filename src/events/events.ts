import type { Message } from '../models/types';

/** Event emitted when a new message is received. */
export interface MessageEvent {
  message: Message;
}

/** Event emitted when a message is read. */
export interface ReadReceiptEvent {
  userId: string;
  roomId: string;
  readAt: Date;
}

/** Event emitted when a user starts/stops typing. */
export interface TypingEvent {
  roomId: string;
  userId: string;
  isTyping: boolean;
}

/** Event emitted when a user comes online/offline. */
export interface PresenceEvent {
  roomId: string;
  userId: string;
  isOnline: boolean;
}

/** Event emitted when a reaction is added/removed. */
export interface ReactionEvent {
  messageId: string;
  roomId: string;
  userId: string;
  emoji: string;
  added: boolean;
  reactionId?: string;
}

/** Event emitted when a message is deleted. */
export interface MessageDeletionEvent {
  messageId: string;
  roomId: string;
  deletedBy: string;
}

/** Event emitted when a message is edited. */
export interface MessageEditEvent {
  messageId: string;
  roomId: string;
  content: string;
  editedBy: string;
  editedAt: Date;
}

/** Event emitted when a message is pinned/unpinned. */
export interface MessagePinEvent {
  messageId: string;
  roomId: string;
  isPinned: boolean;
  pinnedBy?: string;
  pinnedAt?: Date;
}

/** Event emitted when connection state changes. */
export interface ConnectionStateEvent {
  state: 'disconnected' | 'connecting' | 'connected' | 'error';
  error?: Error;
}

/** Event emitted when subscription state changes. */
export interface SubscriptionStateEvent {
  channel: string;
  state: 'subscribing' | 'subscribed' | 'unsubscribed';
}

/** Event emitted when recovery fails and full refresh is needed. */
export interface RecoveryFailedEvent {
  roomId: string;
}

/** Event emitted when a room is updated. */
export interface RoomUpdatedEvent {
  roomId: string;
  name?: string;
  metadata?: Record<string, unknown>;
  isActive?: boolean;
}

/** Map of all event types and their payloads. */
export interface RiviumChatEventMap {
  message: MessageEvent;
  readReceipt: ReadReceiptEvent;
  typing: TypingEvent;
  presence: PresenceEvent;
  reaction: ReactionEvent;
  messageDeleted: MessageDeletionEvent;
  messageEdited: MessageEditEvent;
  messagePinChanged: MessagePinEvent;
  connectionState: ConnectionStateEvent;
  subscriptionState: SubscriptionStateEvent;
  recoveryFailed: RecoveryFailedEvent;
  roomUpdated: RoomUpdatedEvent;
}
