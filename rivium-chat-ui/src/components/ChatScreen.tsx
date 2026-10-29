import React, { useRef, useCallback, useMemo, useState } from 'react';
import {
  View,
  FlatList,
  ActivityIndicator,
  Text,
  StyleSheet,
  ListRenderItem,
  Clipboard,
} from 'react-native';
import { useChatChannel } from '../hooks/useChatChannel';
import { useRiviumChatTheme } from '../theme/RiviumChatTheme';
import { Message, Attachment, useRiviumChatClient } from '../state/RiviumChatProvider';
import { ChatMessageBubble } from './ChatMessageBubble';
import { ChatInputField } from './ChatInputField';
import { TypingIndicator } from './TypingIndicator';
import { MessageContextMenu, createMessageActions } from './MessageContextMenu';
import { MessageReactionPicker } from './MessageReactionPicker';
import { ChatAttachmentPicker, type AttachmentOption, type SelectedAttachment } from './ChatAttachmentPicker';

export interface FileUploader {
  uploadFile(uri: string, mimeType?: string, fileName?: string): Promise<Attachment | null>;
}

export interface ChatScreenProps {
  roomId: string;
  currentUserId: string;
  readOnly?: boolean;
  messageBuilder?: (message: Message, isMe: boolean, isRead: boolean) => React.ReactNode;
  fileUploader?: FileUploader;
  onImagePress?: (url: string) => void;
  userDisplayNames?: Record<string, string>;
  placeholder?: string;
  /** Show "… is typing" above the input. Default: true. */
  showTypingIndicator?: boolean;
  /** Show when the other person has read your messages (✓✓). Default: true. */
  showReadReceipts?: boolean;
  enableReactions?: boolean;
  enableReplies?: boolean;
  /** Show the attachment button (needs `fileUploader`). Default: true. */
  enableAttachments?: boolean;
  /**
   * The sources in the attachment sheet. Each option's `onPress` receives
   * `addAttachments`: pass it the files your picker returned.
   */
  attachmentOptions?: AttachmentOption[];
  /** Largest file the attachment sheet accepts, in bytes. Default: 25 MB. */
  maxFileSize?: number;
  /** MIME types the attachment sheet accepts, for example `['image/*', 'application/pdf']`. Default: all. */
  allowedTypes?: string[];
  enablePinning?: boolean;
  /**
   * Called when the user sends a text message, before the kit sends it.
   * Return `false` (or a promise of `false`) to send it yourself, or not at
   * all; return nothing to let the kit send it as usual.
   */
  onSendMessage?: (content: string) => void | boolean | Promise<void | boolean>;
  /** Title shown in a room with no messages. Default: "No messages yet". */
  emptyStateTitle?: string;
  /** Second line shown in a room with no messages. */
  emptyStateSubtitle?: string;
}

export function ChatScreen({
  roomId,
  currentUserId,
  readOnly = false,
  messageBuilder,
  fileUploader,
  onImagePress,
  userDisplayNames: userDisplayNamesProp,
  placeholder,
  enableReactions = true,
  enableReplies = true,
  enablePinning = false,
  enableAttachments = true,
  showTypingIndicator = true,
  showReadReceipts = true,
  onSendMessage,
  emptyStateTitle = 'No messages yet',
  emptyStateSubtitle,
  attachmentOptions,
  maxFileSize,
  allowedTypes,
}: ChatScreenProps) {
  const state = useChatChannel(roomId, currentUserId);
  // Names from the room's participants; names passed in by the app win.
  const userDisplayNames = useMemo(
    () => ({ ...state.displayNames, ...userDisplayNamesProp }),
    [state.displayNames, userDisplayNamesProp]
  );
  const client = useRiviumChatClient();
  const flatListRef = useRef<FlatList>(null);
  const { colors } = useRiviumChatTheme();
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showAttachmentPicker, setShowAttachmentPicker] = useState(false);

  // Upload the picked files with the app's fileUploader, then send each one.
  const handleAttachmentsSelected = useCallback(
    async (selected: SelectedAttachment[]) => {
      if (!fileUploader || selected.length === 0) return;
      setIsUploading(true);
      try {
        for (const item of selected) {
          try {
            const attachment = await fileUploader.uploadFile(item.uri, item.mimeType, item.name);
            if (attachment) {
              const isImage = (item.mimeType ?? '').startsWith('image/');
              await state.sendMessage(isImage ? '📷 Image' : `📎 ${item.name}`, [attachment]);
            }
          } catch {
            // A failed upload skips that file; the others still go out.
          }
        }
      } finally {
        setIsUploading(false);
      }
    },
    [fileUploader, state]
  );

  // Mark messages as read when screen mounts and when new messages arrive
  React.useEffect(() => {
    if (state.messages.length > 0 && !state.isInitialLoading) {
      state.markAsRead();
    }
  }, [state.messages.length, state.isInitialLoading]);

  const handleEndReached = useCallback(() => {
    if (state.hasMore && !state.isLoadingMore) {
      state.loadMore();
    }
  }, [state]);

  const isMessageRead = useCallback(
    (message: Message) => {
      if (!showReadReceipts || message.senderUserId !== currentUserId || !state.otherUserLastRead) {
        return false;
      }
      const messageDate = new Date(message.createdAt);
      return messageDate <= state.otherUserLastRead;
    },
    [currentUserId, state.otherUserLastRead, showReadReceipts]
  );

  // Long press on message -> show context menu
  const handleMessageLongPress = useCallback((message: Message) => {
    setSelectedMessage(message);
    setShowContextMenu(true);
  }, []);

  // Context menu actions
  const getContextMenuActions = useCallback(() => {
    if (!selectedMessage) return [];

    const isMe = selectedMessage.senderUserId === currentUserId;

    return createMessageActions({
      onReply: enableReplies ? () => {
        state.setReplyingTo(selectedMessage);
        setShowContextMenu(false);
        setSelectedMessage(null);
      } : undefined,
      onCopy: () => {
        Clipboard.setString(selectedMessage.content);
        setShowContextMenu(false);
        setSelectedMessage(null);
      },
      onEdit: isMe ? () => {
        setEditingMessage(selectedMessage);
        setShowContextMenu(false);
        setSelectedMessage(null);
      } : undefined,
      onDelete: isMe ? () => {
        state.deleteMessage(selectedMessage.id);
        setShowContextMenu(false);
        setSelectedMessage(null);
      } : undefined,
      onPin: enablePinning && !selectedMessage.isPinned ? () => {
        (client as any).pinMessage(roomId, selectedMessage.id).catch(() => {});
        setShowContextMenu(false);
        setSelectedMessage(null);
      } : undefined,
      onUnpin: enablePinning && selectedMessage.isPinned ? () => {
        (client as any).unpinMessage(roomId, selectedMessage.id).catch(() => {});
        setShowContextMenu(false);
        setSelectedMessage(null);
      } : undefined,
      isOwner: isMe,
      isPinned: selectedMessage.isPinned,
    });
  }, [selectedMessage, currentUserId, state, enableReplies, enablePinning]);

  // Reaction handling
  const handleReactionSelect = useCallback(async (emoji: string) => {
    if (!selectedMessage) return;

    const hasReacted = (selectedMessage.reactions ?? []).some(
      (r) => r.userId === currentUserId && r.emoji === emoji
    );

    if (hasReacted) {
      await state.removeReaction(selectedMessage.id, emoji);
    } else {
      await state.addReaction(selectedMessage.id, emoji);
    }

    setShowReactionPicker(false);
    setShowContextMenu(false);
    setSelectedMessage(null);
  }, [selectedMessage, currentUserId, state]);

  // Inline reaction tap on existing reactions
  const handleInlineReactionTap = useCallback((messageId: string, emoji: string, reactions: Array<{userId: string; emoji: string}>) => {
    const hasReacted = (reactions ?? []).some(
      (r) => r.userId === currentUserId && r.emoji === emoji
    );
    if (hasReacted) {
      state.removeReaction(messageId, emoji);
    } else {
      state.addReaction(messageId, emoji);
    }
  }, [currentUserId, state]);

  const renderMessage: ListRenderItem<Message> = useCallback(
    ({ item: message }) => {
      const isMe = message.senderUserId === currentUserId;

      if (messageBuilder) {
        return <>{messageBuilder(message, isMe, isMessageRead(message))}</>;
      }

      return (
        <ChatMessageBubble
          message={message}
          isMe={isMe}
          isRead={isMessageRead(message)}
          otherUserName={userDisplayNames[message.senderUserId]}
          mentionDisplayNames={userDisplayNames}
          onRetry={
            message.isFailed
              ? () => state.retryMessage(message.id)
              : undefined
          }
          onReactionTap={enableReactions ? (emoji) => {
            handleInlineReactionTap(message.id, emoji, message.reactions);
          } : undefined}
          onLongPress={() => handleMessageLongPress(message)}
          onImagePress={onImagePress}
        />
      );
    },
    [
      currentUserId,
      messageBuilder,
      userDisplayNames,
      isMessageRead,
      state,
      handleMessageLongPress,
      handleInlineReactionTap,
      onImagePress,
      enableReactions,
    ]
  );

  const renderHeader = useCallback(() => {
    if (!showTypingIndicator || state.typingUsers.length === 0) return null;
    return (
      <TypingIndicator
        typingUsers={state.typingUsers}
        userDisplayNames={userDisplayNames}
      />
    );
  }, [state.typingUsers, userDisplayNames, showTypingIndicator]);

  const renderFooter = useCallback(() => {
    if (!state.isLoadingMore) return null;
    return (
      <View style={styles.loadingMore}>
        <ActivityIndicator size="small" color={colors.linkText} />
      </View>
    );
  }, [state.isLoadingMore, colors.linkText]);

  const renderEmpty = useCallback(() => {
    if (state.isInitialLoading) {
      return (
        <View style={[styles.centered, styles.invertedFix]}>
          <ActivityIndicator size="large" color={colors.linkText} />
        </View>
      );
    }

    if (state.error) {
      return (
        <View style={[styles.centered, styles.invertedFix]}>
          <Text style={[styles.errorTitle, { color: colors.failedMessage }]}>
            Failed to load messages
          </Text>
          <Text style={[styles.errorMessage, { color: colors.timestampText }]}>
            {state.error.message}
          </Text>
        </View>
      );
    }

    return (
      <View style={[styles.centered, styles.invertedFix]}>
        <Text style={[styles.emptyText, { color: colors.timestampText }]}>
          {emptyStateTitle}
        </Text>
        {emptyStateSubtitle ? (
          <Text style={[styles.emptySubtitle, { color: colors.timestampText }]}>
            {emptyStateSubtitle}
          </Text>
        ) : null}
      </View>
    );
  }, [state.isInitialLoading, state.error, colors, emptyStateTitle, emptyStateSubtitle]);

  // Lets the app see (or take over) each text message before the kit sends it.
  const handleSendMessage = useCallback(
    async (content: string) => {
      if (onSendMessage) {
        let result: void | boolean;
        try {
          result = await onSendMessage(content);
        } catch {
          return; // the app's handler failed: do not send behind its back
        }
        if (result === false) return;
      }
      await state.sendMessage(content);
    },
    [onSendMessage, state]
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        ref={flatListRef}
        data={state.messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        inverted
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.1}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={
          state.messages.length === 0 ? styles.emptyContainer : styles.listContent
        }
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
      />

      {isUploading && (
        <View style={styles.uploadingRow}>
          <ActivityIndicator size="small" color={colors.linkText} />
          <Text style={[styles.uploadingText, { color: colors.timestampText }]}>Uploading...</Text>
        </View>
      )}

      {!readOnly && fileUploader && enableAttachments && (
        <ChatAttachmentPicker
          visible={showAttachmentPicker}
          onClose={() => setShowAttachmentPicker(false)}
          onAttachmentsSelected={handleAttachmentsSelected}
          options={attachmentOptions}
          maxFileSize={maxFileSize}
          allowedTypes={allowedTypes}
        />
      )}

      {!readOnly && (
        <ChatInputField
          onSendMessage={(content) => { handleSendMessage(content); }}
          onTyping={() => state.publishTyping()}
          replyingTo={state.replyingTo}
          onCancelReply={() => state.setReplyingTo(null)}
          userDisplayNames={userDisplayNames}
          editingMessage={editingMessage}
          onCancelEdit={() => setEditingMessage(null)}
          onEditMessage={(messageId, content) => {
            state.editMessage(messageId, content);
            setEditingMessage(null);
          }}
          onAttachmentPress={fileUploader && enableAttachments ? () => setShowAttachmentPicker(true) : undefined}
          disabled={state.isInitialLoading || isUploading}
          placeholder={placeholder}
        />
      )}

      {/* Context Menu */}
      {showContextMenu && !showReactionPicker && selectedMessage && (
        <MessageContextMenu
          visible={true}
          onClose={() => {
            setShowContextMenu(false);
            setSelectedMessage(null);
          }}
          actions={[
            ...getContextMenuActions(),
            ...(enableReactions ? [{
              id: 'react',
              label: 'Add Reaction',
              icon: '😀',
              preventClose: true,
              onPress: () => {
                // Don't clear selectedMessage — reaction picker needs it
                setShowContextMenu(false);
                setShowReactionPicker(true);
              },
            }] : []),
          ]}
        />
      )}

      {/* Reaction Picker */}
      {showReactionPicker && selectedMessage && (
        <MessageReactionPicker
          visible={true}
          onReactionSelected={handleReactionSelect}
          onClose={() => {
            setShowReactionPicker(false);
            setSelectedMessage(null);
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  uploadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  uploadingText: {
    fontSize: 12,
    marginLeft: 8,
  },
  container: {
    flex: 1,
  },
  listContent: {
    paddingVertical: 8,
  },
  emptyContainer: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  invertedFix: {
    transform: [{ scaleY: -1 }],
  },
  loadingMore: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },
});

export default ChatScreen;
