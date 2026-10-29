import { useState, useEffect, useCallback, useRef } from 'react';
import { useRiviumChatClient, useRiviumChatConnection, Message, Attachment } from '../state/RiviumChatProvider';

export interface ChatChannelState {
  messages: Message[];
  hasMore: boolean;
  isLoadingMore: boolean;
  isInitialLoading: boolean;
  typingUsers: string[];
  onlineUsers: Set<string>;
  otherUserLastRead: Date | null;
  replyingTo: Message | null;
  error: Error | null;
  /** Display names of the room's participants, by user id (when the room has them). */
  displayNames: Record<string, string>;
}

export interface ChatChannelActions {
  loadMore: () => Promise<void>;
  sendMessage: (content: string, attachments?: Attachment[]) => Promise<void>;
  retryMessage: (messageId: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  editMessage: (messageId: string, newContent: string) => Promise<void>;
  addReaction: (messageId: string, emoji: string) => Promise<void>;
  removeReaction: (messageId: string, emoji: string) => Promise<void>;
  publishTyping: () => Promise<void>;
  markAsRead: () => Promise<void>;
  setReplyingTo: (message: Message | null) => void;
  clearError: () => void;
  /** Reload the latest messages from the server. */
  refresh: () => Promise<void>;
}

/** Whether `m` is the same message as `other` (same id or same clientMessageId). */
function sameMessage(m: Message, other: Message): boolean {
  return m.id === other.id || (!!m.clientMessageId && m.clientMessageId === other.clientMessageId);
}

/** A message waiting in the client's offline outbox, as the screen shows it. */
function asQueued(m: Message): Message {
  return {
    ...m,
    attachments: m.attachments ?? [],
    reactions: m.reactions ?? [],
    isPending: true,
    isFailed: false,
    isQueued: true,
  };
}

/**
 * Puts `sent` (what the client answered: the stored message, or its pending
 * copy when it was queued offline) in place of the local entry `localId`.
 * When the same message is already on screen (the live event came first),
 * the local entry is dropped instead, so a message is never shown twice.
 */
function settle(prev: Message[], localId: string, sent: Message, queued: boolean): Message[] {
  const next: Message = queued ? asQueued(sent) : sent;
  if (prev.some((m) => m.id !== localId && sameMessage(m, next))) {
    return prev.filter((m) => m.id !== localId);
  }
  return prev.map((m) => (m.id === localId ? next : m));
}

/**
 * Hook for managing chat channel state in React Native
 */
export function useChatChannel(
  roomId: string,
  currentUserId: string
): ChatChannelState & ChatChannelActions {
  const client = useRiviumChatClient();
  const { isConnected } = useRiviumChatConnection();
  // With the client's offline outbox, a queued send shows "Waiting for network…".
  const queueOn = client.queueOfflineMessages === true;

  const [messages, setMessages] = useState<Message[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [otherUserLastRead, setOtherUserLastRead] = useState<Date | null>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [displayNames, setDisplayNames] = useState<Record<string, string>>({});

  const typingTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const lastTypingTimeRef = useRef<number>(0);
  const mountedRef = useRef(true);

  /** Loads the latest page; keeps messages still being sent (or failed) locally. */
  const loadLatest = useCallback(async () => {
    const result = await client.getMessages(roomId, { limit: 50 });
    if (!mountedRef.current) return;
    const latest = [...result.messages].reverse(); // Newest first
    setMessages((prev) => {
      const ids = new Set(latest.map((m) => m.id));
      const clientIds = new Set(latest.map((m) => m.clientMessageId).filter(Boolean));
      const local = prev.filter(
        (m) =>
          (m.isPending || m.isFailed) &&
          !ids.has(m.id) &&
          !(m.clientMessageId && clientIds.has(m.clientMessageId))
      );
      return [...local, ...latest];
    });
    setHasMore(result.messages.length >= 50);
    setError(null);
  }, [client, roomId]);

  const refresh = useCallback(async () => {
    try {
      await loadLatest();
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err : new Error('Failed to load messages'));
      }
    }
  }, [loadLatest]);

  // Load the room's history (REST: does not wait for the realtime connection)
  useEffect(() => {
    mountedRef.current = true;
    setMessages([]);
    setIsInitialLoading(true);

    const initialize = async () => {
      try {
        await loadLatest();
        if (mountedRef.current) {
          setIsInitialLoading(false);
        }

        // Messages still waiting in the client's offline outbox (also after a restart)
        if (queueOn && client.getPendingMessages) {
          try {
            const waiting = await client.getPendingMessages(roomId);
            if (mountedRef.current && waiting.length > 0) {
              setMessages((prev) => {
                const fresh = waiting
                  .filter((w) => !prev.some((m) => sameMessage(m, w)))
                  .map(asQueued)
                  .reverse(); // newest first
                return [...fresh, ...prev];
              });
            }
          } catch {
            // Nothing waiting can be shown: they are still sent.
          }
        }

        try {
          const presence = await client.getRoomPresence(roomId);
          if (mountedRef.current) {
            setOnlineUsers(new Set(presence));
          }
        } catch {
          // Ignore presence errors
        }

        // Load initial read state and names from room participants
        try {
          const room = await client.getRoom(roomId);
          if (mountedRef.current) {
            const names: Record<string, string> = {};
            for (const p of room.participants ?? []) {
              if (p.displayName) names[p.externalUserId] = p.displayName;
            }
            setDisplayNames(names);
            const otherParticipant = room.participants.find(
              (p) => p.externalUserId !== currentUserId
            );
            if (otherParticipant?.lastReadAt) {
              setOtherUserLastRead(new Date(otherParticipant.lastReadAt));
            }
          }
        } catch {
          // Non-critical: read receipts will still work via real-time events
        }
      } catch (err) {
        if (mountedRef.current) {
          setError(err instanceof Error ? err : new Error('Failed to load messages'));
          setIsInitialLoading(false);
        }
      }
    };

    initialize();

    return () => {
      mountedRef.current = false;
      typingTimersRef.current.forEach((timer) => clearTimeout(timer));
      typingTimersRef.current.clear();
    };
  }, [client, roomId]);

  // Follow the room in realtime once the client is connected, and again after
  // every reconnect (then reload what was missed while away).
  const followedOnceRef = useRef(false);
  useEffect(() => {
    followedOnceRef.current = false;
  }, [client, roomId]);
  useEffect(() => {
    let followed = false;
    try {
      const pending = client.subscribeToRoom(roomId) as unknown;
      if (pending && typeof (pending as Promise<void>).catch === 'function') {
        (pending as Promise<void>).catch(() => {});
      }
      followed = true;
    } catch {
      // Not connected yet: this effect runs again when the connection is up.
    }
    if (followed) {
      if (followedOnceRef.current) refresh();
      followedOnceRef.current = true;
    }
    return () => {
      if (followed) client.leaveRoom(roomId);
    };
  }, [client, roomId, isConnected, refresh]);

  // The room's live updates were lost (long offline gap) or refused: reload.
  useEffect(() => {
    if (!client.onRecoveryFailed) return;
    return client.onRecoveryFailed((event) => {
      if (event.roomId === roomId) refresh();
    });
  }, [client, roomId, refresh]);

  // Event subscriptions
  useEffect(() => {
    const unsubMessage = client.onMessage((event) => {
      if (event.message.roomId !== roomId) return;

      setMessages((prev) => {
        const clientId = event.message.clientMessageId;

        // The local copy of this message (offline outbox): matched by its clientMessageId
        if (clientId) {
          const localIndex = prev.findIndex((m) => m.clientMessageId === clientId && m.id !== event.message.id);
          if (localIndex >= 0) {
            if (prev.some((m) => m.id === event.message.id)) {
              return prev.filter((_, i) => i !== localIndex);
            }
            const updated = [...prev];
            updated[localIndex] = event.message;
            return updated;
          }
        }

        // A send still on its way has no clientMessageId yet: matched by content
        const pendingIndex = prev.findIndex(
          (m) =>
            m.isPending &&
            !m.clientMessageId &&
            m.content === event.message.content &&
            m.senderUserId === event.message.senderUserId
        );

        if (pendingIndex >= 0) {
          const updated = [...prev];
          updated[pendingIndex] = event.message;
          return updated;
        }

        if (prev.some((m) => m.id === event.message.id)) {
          return prev;
        }

        return [event.message, ...prev];
      });
    });

    const unsubDeleted = client.onMessageDeleted((event) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === event.messageId ? { ...m, isDeleted: true } : m
        )
      );
    });

    const unsubEdited = client.onMessageEdited((event: any) => {
      const newContent = event.newContent ?? event.content;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === event.messageId
            ? { ...m, content: newContent, isEdited: true, editedAt: event.editedAt }
            : m
        )
      );
    });

    const unsubReaction = client.onReaction((event: any) => {
      const isAdded = event.isAdded ?? event.added ?? true;
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== event.messageId) return m;

          let reactions = [...(m.reactions ?? [])];
          if (isAdded) {
            if (!reactions.some((r) => r.userId === event.userId && r.emoji === event.emoji)) {
              reactions.push({
                id: `${event.userId}_${event.emoji}`,
                messageId: event.messageId,
                userId: event.userId,
                emoji: event.emoji,
                createdAt: new Date().toISOString(),
              });
            }
          } else {
            reactions = reactions.filter(
              (r) => !(r.userId === event.userId && r.emoji === event.emoji)
            );
          }

          return { ...m, reactions };
        })
      );
    });

    const unsubTyping = client.onTyping((event) => {
      if (event.roomId !== roomId || event.userId === currentUserId) return;

      setTypingUsers((prev) => {
        if (!prev.includes(event.userId)) {
          return [...prev, event.userId];
        }
        return prev;
      });

      const existingTimer = typingTimersRef.current.get(event.userId);
      if (existingTimer) clearTimeout(existingTimer);

      const timer = setTimeout(() => {
        setTypingUsers((prev) => prev.filter((id) => id !== event.userId));
        typingTimersRef.current.delete(event.userId);
      }, 3000);
      typingTimersRef.current.set(event.userId, timer);
    });

    const unsubPresence = client.onPresenceChange((event) => {
      if (event.roomId !== roomId) return;

      setOnlineUsers((prev) => {
        const updated = new Set(prev);
        if (event.isOnline) {
          updated.add(event.userId);
        } else {
          updated.delete(event.userId);
        }
        return updated;
      });
    });

    const unsubReadReceipt = client.onReadReceipt((event) => {
      if (event.roomId !== roomId || event.userId === currentUserId) return;

      const timestamp = new Date(event.readAt ?? event.lastReadAt ?? new Date());
      setOtherUserLastRead((prev) => {
        if (!prev || timestamp > prev) {
          return timestamp;
        }
        return prev;
      });
    });

    // Offline outbox: a queued message was stored, or left the queue unsent
    const unsubSent = client.onMessageSent?.((event) => {
      if (event.message.roomId && event.message.roomId !== roomId) return;
      setMessages((prev) => {
        const local = prev.find(
          (m) => m.id === event.localId || (m.isPending && m.clientMessageId === event.clientMessageId)
        );
        if (!local) return prev;
        return settle(prev, local.id, { ...event.message, clientMessageId: event.clientMessageId }, false);
      });
    });
    const unsubFailed = client.onMessageFailed?.((event) => {
      if (event.roomId !== roomId) return;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === event.localId || (m.isPending && m.clientMessageId === event.clientMessageId)
            ? { ...m, isPending: false, isFailed: true, isQueued: false }
            : m
        )
      );
    });

    return () => {
      unsubSent?.();
      unsubFailed?.();
      unsubMessage();
      unsubDeleted();
      unsubEdited();
      unsubReaction();
      unsubTyping();
      unsubPresence();
      unsubReadReceipt();
    };
  }, [client, roomId, currentUserId]);

  // Actions
  // A ref, not only state: two scroll events in the same moment both saw isLoadingMore false and loaded the same page twice.
  const loadingMoreRef = useRef(false);
  const loadMore = useCallback(async () => {
    if (loadingMoreRef.current || isLoadingMore || !hasMore || messages.length === 0) return;

    loadingMoreRef.current = true;
    setIsLoadingMore(true);
    try {
      const oldestMessage = messages[messages.length - 1];
      const result = await client.getMessages(roomId, {
        limit: 50,
        before: oldestMessage?.id,
      });
      setMessages((prev) => {
        const shown = new Set(prev.map((m) => m.id));
        return [...prev, ...result.messages.reverse().filter((m) => !shown.has(m.id))];
      });
      setHasMore(result.messages.length >= 50);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load more messages'));
    } finally {
      loadingMoreRef.current = false;
      setIsLoadingMore(false);
    }
  }, [client, roomId, isLoadingMore, hasMore, messages]);

  const sendMessage = useCallback(
    async (content: string, attachments?: Attachment[]) => {
      const pendingId = `pending_${Date.now()}_${Math.random()}`;
      const pendingMessage: Message = {
        id: pendingId,
        roomId,
        senderUserId: currentUserId,
        content,
        type: 'text',
        attachments: attachments || [],
        metadata: null,
        replyToId: replyingTo?.id || null,
        replyTo: replyingTo,
        isDeleted: false,
        createdAt: new Date().toISOString(),
        isEdited: false,
        editedAt: null,
        editHistory: null,
        isPinned: false,
        pinnedAt: null,
        pinnedBy: null,
        reactions: [],
        isPending: true,
        isFailed: false,
      };

      setMessages((prev) => [pendingMessage, ...prev]);
      const replyId = replyingTo?.id;
      setReplyingTo(null);

      try {
        const sent = await client.sendMessage(roomId, content, {
          attachments,
          replyToId: replyId,
        });
        setMessages((prev) =>
          queueOn
            ? settle(prev, pendingId, sent, sent.isPending === true)
            : prev.map((m) => (m.id === pendingId ? sent : m))
        );
      } catch {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === pendingId ? { ...m, isPending: false, isFailed: true } : m
          )
        );
      }
    },
    [client, roomId, currentUserId, replyingTo, queueOn]
  );

  const retryMessage = useCallback(
    async (messageId: string) => {
      const message = messages.find((m) => m.id === messageId);
      if (!message?.isFailed) return;

      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, isPending: true, isFailed: false } : m
        )
      );

      try {
        const sent = await client.sendMessage(roomId, message.content, {
          attachments: (message.attachments ?? []).length > 0 ? message.attachments : undefined,
          replyToId: message.replyToId || undefined,
        });
        setMessages((prev) =>
          queueOn
            ? settle(prev, messageId, sent, sent.isPending === true)
            : prev.map((m) => (m.id === messageId ? sent : m))
        );
      } catch {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId ? { ...m, isPending: false, isFailed: true } : m
          )
        );
      }
    },
    [client, roomId, messages, queueOn]
  );

  const deleteMessage = useCallback(
    async (messageId: string) => {
      try {
        await client.deleteMessage(roomId, messageId);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to delete message'));
      }
    },
    [client, roomId]
  );

  const editMessage = useCallback(
    async (messageId: string, newContent: string) => {
      try {
        await client.editMessage(roomId, messageId, newContent);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to edit message'));
      }
    },
    [client, roomId]
  );

  const addReaction = useCallback(
    async (messageId: string, emoji: string) => {
      try {
        await client.addReaction(roomId, messageId, emoji);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to add reaction'));
      }
    },
    [client, roomId]
  );

  const removeReaction = useCallback(
    async (messageId: string, emoji: string) => {
      try {
        await client.removeReaction(roomId, messageId, emoji);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to remove reaction'));
      }
    },
    [client, roomId]
  );

  const publishTyping = useCallback(async () => {
    const now = Date.now();
    if (now - lastTypingTimeRef.current < 2000) return;

    lastTypingTimeRef.current = now;
    try {
      await client.publishTyping(roomId);
    } catch {
      // Ignore typing errors
    }
  }, [client, roomId]);

  const markAsRead = useCallback(async () => {
    try {
      await client.markAsRead(roomId);
    } catch {
      // Ignore read errors
    }
  }, [client, roomId]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    messages,
    hasMore,
    isLoadingMore,
    isInitialLoading,
    typingUsers,
    onlineUsers,
    otherUserLastRead,
    replyingTo,
    error,
    displayNames,
    loadMore,
    sendMessage,
    retryMessage,
    deleteMessage,
    editMessage,
    addReaction,
    removeReaction,
    publishTyping,
    markAsRead,
    setReplyingTo,
    clearError,
    refresh,
  };
}
