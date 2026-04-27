import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { RiviumChatClient, type Message } from '@rivium/react-native-chat';
import { ChatMessageBubble } from '@rivium/react-native-chat-ui';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface PinnedMessagesSheetProps {
  visible: boolean;
  onClose: () => void;
  roomId: string;
  currentUserId: string;
  client: RiviumChatClient;
}

export function PinnedMessagesSheet({
  visible,
  onClose,
  roomId,
  currentUserId,
  client,
}: PinnedMessagesSheetProps) {
  const [pinnedMessages, setPinnedMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPinnedMessages = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const messages = await client.getPinnedMessages(roomId);
      setPinnedMessages(messages);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load pinned messages');
    } finally {
      setIsLoading(false);
    }
  }, [client, roomId]);

  useEffect(() => {
    if (visible) {
      loadPinnedMessages();
    }
  }, [visible, loadPinnedMessages]);

  const handleUnpin = async (messageId: string) => {
    try {
      await client.unpinMessage(roomId, messageId);
      setPinnedMessages((prev) => prev.filter((m) => m.id !== messageId));
    } catch (e) {
      console.error('Failed to unpin message:', e);
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(date));
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isMe = item.senderId === currentUserId;

    return (
      <View style={styles.messageCard}>
        <View style={styles.messageHeader}>
          <View style={styles.avatarContainer}>
            <View
              style={[
                styles.avatar,
                { backgroundColor: isMe ? '#007AFF' : '#5856D6' },
              ]}
            >
              <Text style={styles.avatarText}>
                {isMe ? 'You' : (item.senderId?.[0] || '?').toUpperCase()}
              </Text>
            </View>
            <Text style={styles.senderName}>
              {isMe ? 'You' : item.senderId}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.unpinButton}
            onPress={() => handleUnpin(item.id)}
          >
            <Text style={styles.unpinIcon}>📌</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.messageContent}>{item.content}</Text>

        {item.attachments && item.attachments.length > 0 && (
          <View style={styles.attachmentsRow}>
            <Text style={styles.attachmentIcon}>📎</Text>
            <Text style={styles.attachmentText}>
              {item.attachments.length} attachment(s)
            </Text>
          </View>
        )}

        {item.pinnedAt && (
          <Text style={styles.pinnedDate}>
            Pinned on {formatDate(item.pinnedAt)}
          </Text>
        )}
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>📌</Text>
      <Text style={styles.emptyTitle}>No pinned messages</Text>
      <Text style={styles.emptySubtitle}>
        Long-press any message and select "Pin" to pin it here
      </Text>
    </View>
  );

  const renderError = () => (
    <View style={styles.errorContainer}>
      <Text style={styles.errorIcon}>⚠️</Text>
      <Text style={styles.errorTitle}>Failed to load pinned messages</Text>
      <Text style={styles.errorMessage}>{error}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={loadPinnedMessages}>
        <Text style={styles.retryText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          {/* Handle */}
          <View style={styles.handleContainer}>
            <View style={styles.handle} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.headerIcon}>📌</Text>
              <Text style={styles.headerTitle}>Pinned Messages</Text>
            </View>
            {pinnedMessages.length > 0 && (
              <Text style={styles.headerCount}>{pinnedMessages.length}</Text>
            )}
          </View>

          <View style={styles.divider} />

          {/* Content */}
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
            </View>
          ) : error ? (
            renderError()
          ) : pinnedMessages.length === 0 ? (
            renderEmpty()
          ) : (
            <FlatList
              data={pinnedMessages}
              renderItem={renderMessage}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: SCREEN_HEIGHT * 0.7,
    minHeight: SCREEN_HEIGHT * 0.4,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#E5E5EA',
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  headerCount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E5EA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  listContent: {
    padding: 16,
  },
  separator: {
    height: 12,
  },
  messageCard: {
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 12,
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  avatarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  senderName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
  },
  unpinButton: {
    padding: 4,
  },
  unpinIcon: {
    fontSize: 16,
  },
  messageContent: {
    fontSize: 15,
    color: '#000000',
    lineHeight: 20,
  },
  attachmentsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  attachmentIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  attachmentText: {
    fontSize: 13,
    color: '#8E8E93',
  },
  pinnedDate: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#8E8E93',
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default PinnedMessagesSheet;
