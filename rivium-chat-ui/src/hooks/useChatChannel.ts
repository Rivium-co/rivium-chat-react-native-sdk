import { useState, useEffect, useCallback, useRef } from 'react';
import { useRiviumChatClient, Message, Attachment, Reaction } from '../state/RiviumChatProvider';

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
}

/**
 * Hook for managing chat channel state in React Native
 */
export function useChatChannel(
  roomId: string,
  currentUserId: string
): ChatChannelState & ChatChannelActions {
  const client = useRiviumChatClient();

  const [messages, setMessages] = useState<Message[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [otherUserLastRead, setOtherUserLastRead] = useState<Date | null>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const typingTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const lastTypingTimeRef = useRef<number>(0);

  // Initialize channel
  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      try {
        await client.subscribeToRoom(roomId);

        const result = await client.getMessages(roomId, { limit: 50 });
        if (mounted) {
          setMessages(result.messages.reverse());
          setHasMore(result.messages.length >= 50);
          setIsInitialLoading(false);
        }

        try {
          const presence = await client.getRoomPresence(roomId);
          if (mounted) {
            setOnlineUsers(new Set(presence));
          }
        } catch {
          // Ignore presence errors
        }

        // Load initial read state from room participants
        try {
          const room = await client.getRoom(roomId);
          if (mounted) {
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
        if (mounted) {
          setError(err instanceof Error ? err : new Error('Failed to load messages'));
          setIsInitialLoading(false);
        }
      }
    };

    initialize();

    return () => {
      mounted = false;
      client.leaveRoom(roomId);
      typingTimersRef.current.forEach((timer) => clearTimeout(timer));
      typingTimersRef.current.clear();
    };
  }, [client, roomId]);

  // Event subscriptions
  useEffect(() => {
    const unsubMessage = client.onMessage((event) => {
      if (event.message.roomId !== roomId) return;

      setMessages((prev) => {
        const pendingIndex = prev.findIndex(
          (m) =>
            m.isPending &&
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

    return () => {
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
  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore || messages.length === 0) return;

    setIsLoadingMore(true);
    try {
      const oldestMessage = messages[messages.length - 1];
      const result = await client.getMessages(roomId, {
        limit: 50,
        before: oldestMessage?.id,
      });
      setMessages((prev) => [...prev, ...result.messages.reverse()]);
      setHasMore(result.messages.length >= 50);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load more messages'));
    } finally {
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
          prev.map((m) => (m.id === pendingId ? sent : m))
        );
      } catch {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === pendingId ? { ...m, isPending: false, isFailed: true } : m
          )
        );
      }
    },
    [client, roomId, currentUserId, replyingTo]
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
          attachments: message.attachments.length > 0 ? message.attachments : undefined,
          replyToId: message.replyToId || undefined,
        });
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? sent : m))
        );
      } catch {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId ? { ...m, isPending: false, isFailed: true } : m
          )
        );
      }
    },
    [client, roomId, messages]
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
  };
}
