import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Pressable,
} from 'react-native';
import { format } from 'date-fns';
import { useRiviumChatTheme } from '../theme/RiviumChatTheme';
import { Message } from '../state/RiviumChatProvider';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export interface ChatMessageBubbleProps {
  message: Message;
  isMe: boolean;
  isRead?: boolean;
  showAvatar?: boolean;
  otherUserName?: string;
  mentionDisplayNames?: Record<string, string>;
  onRetry?: () => void;
  onReactionTap?: (emoji: string) => void;
  onLongPress?: () => void;
  onImagePress?: (url: string) => void;
}

export function ChatMessageBubble({
  message,
  isMe,
  isRead = false,
  showAvatar = true,
  otherUserName,
  mentionDisplayNames = {},
  onRetry,
  onReactionTap,
  onLongPress,
  onImagePress,
}: ChatMessageBubbleProps) {
  const { colors, dimensions } = useRiviumChatTheme();

  if (message.isDeleted) {
    return (
      <View style={[styles.container, isMe ? styles.containerMe : styles.containerOther]}>
        <View
          style={[
            styles.deletedBubble,
            { borderRadius: dimensions.messageBubbleRadius },
          ]}
        >
          <Text style={styles.deletedText}>This message was deleted</Text>
        </View>
      </View>
    );
  }

  const timestamp = format(new Date(message.createdAt), 'HH:mm');
  const maxWidth = SCREEN_WIDTH * dimensions.maxBubbleWidthRatio;

  const bubbleColor = message.isFailed
    ? `${colors.failedMessage}33`
    : message.isPending
    ? isMe
      ? `${colors.myMessageBubble}99`
      : colors.otherMessageBubble
    : isMe
    ? colors.myMessageBubble
    : colors.otherMessageBubble;

  const textColor = isMe ? colors.myMessageText : colors.otherMessageText;

  // Group reactions by emoji
  const groupedReactions = (message.reactions ?? []).reduce((acc, reaction) => {
    acc[reaction.emoji] = (acc[reaction.emoji] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <View style={[styles.container, isMe ? styles.containerMe : styles.containerOther]}>
      {/* Avatar for other users */}
      {!isMe && showAvatar && (
        <View
          style={[
            styles.avatar,
            {
              width: dimensions.smallAvatarSize,
              height: dimensions.smallAvatarSize,
              backgroundColor: `${colors.linkText}20`,
            },
          ]}
        >
          <Text style={[styles.avatarText, { color: colors.linkText }]}>
            {(otherUserName || 'U').charAt(0).toUpperCase()}
          </Text>
        </View>
      )}
      {!isMe && !showAvatar && (
        <View style={{ width: dimensions.smallAvatarSize + 8 }} />
      )}

      <View style={[styles.bubbleContainer, isMe ? styles.bubbleContainerMe : styles.bubbleContainerOther]}>
        {/* Reply preview */}
        {message.replyTo && (
          <View
            style={[
              styles.replyPreview,
              { backgroundColor: colors.replyBackground, borderRadius: 8 },
            ]}
          >
            <View
              style={[
                styles.replyBar,
                { backgroundColor: isMe ? colors.myMessageBubble : colors.linkText },
              ]}
            />
            <View style={styles.replyContent}>
              <Text
                style={[
                  styles.replyName,
                  { color: isMe ? colors.myMessageBubble : colors.linkText },
                ]}
                numberOfLines={1}
              >
                {mentionDisplayNames[message.replyTo.senderUserId] || message.replyTo.senderUserId}
              </Text>
              <Text style={styles.replyText} numberOfLines={2}>
                {message.replyTo.content}
              </Text>
            </View>
          </View>
        )}

        {/* Message bubble */}
        <Pressable
          onLongPress={onLongPress}
          style={[
            styles.bubble,
            {
              backgroundColor: bubbleColor,
              borderRadius: dimensions.messageBubbleRadius,
              padding: dimensions.messagePadding,
              maxWidth,
            },
          ]}
        >
          {/* Image attachments */}
          {(message.attachments ?? [])
            .filter((a) => a.mimeType?.startsWith('image/'))
            .map((attachment, idx) => (
              <TouchableOpacity
                key={idx}
                onPress={() => onImagePress?.(attachment.url)}
                activeOpacity={0.8}
              >
                <Image
                  source={{ uri: attachment.url }}
                  style={[
                    styles.image,
                    {
                      width: dimensions.imagePreviewSize,
                      height: dimensions.imagePreviewSize,
                    },
                  ]}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            ))}

          {/* File attachments */}
          {(message.attachments ?? [])
            .filter((a) => !a.mimeType?.startsWith('image/'))
            .map((attachment, idx) => (
              <View
                key={idx}
                style={[
                  styles.fileChip,
                  {
                    backgroundColor: isMe
                      ? `${colors.myMessageText}1a`
                      : colors.replyBackground,
                  },
                ]}
              >
                <Text style={styles.fileIcon}>📎</Text>
                <View style={styles.fileInfo}>
                  <Text
                    style={[styles.fileName, { color: textColor }]}
                    numberOfLines={1}
                  >
                    {attachment.name || 'File'}
                  </Text>
                  {attachment.size && (
                    <Text
                      style={[
                        styles.fileSize,
                        {
                          color: isMe
                            ? `${colors.myMessageText}b3`
                            : colors.timestampText,
                        },
                      ]}
                    >
                      {formatFileSize(attachment.size)}
                    </Text>
                  )}
                </View>
              </View>
            ))}

          {/* Message content */}
          {message.content ? (
            <Text style={[styles.messageText, { color: textColor }]}>
              {message.content}
            </Text>
          ) : null}

          {/* Timestamp and status */}
          <View style={styles.metaRow}>
            {message.isEdited && (
              <Text
                style={[styles.editedText, { color: colors.timestampText }]}
              >
                edited
              </Text>
            )}
            <Text
              style={[
                styles.timestamp,
                {
                  color: isMe ? `${colors.myMessageText}b3` : colors.timestampText,
                },
              ]}
            >
              {timestamp}
            </Text>
            {isMe && (
              <StatusIndicator
                message={message}
                isRead={isRead}
                colors={colors}
                onRetry={onRetry}
              />
            )}
          </View>
        </Pressable>

        {/* Reactions */}
        {Object.keys(groupedReactions).length > 0 && (
          <View style={styles.reactionsContainer}>
            {Object.entries(groupedReactions).map(([emoji, count]) => (
              <TouchableOpacity
                key={emoji}
                onPress={() => onReactionTap?.(emoji)}
                style={[
                  styles.reactionPill,
                  { borderRadius: dimensions.reactionPillRadius },
                ]}
              >
                <Text style={styles.reactionEmoji}>{emoji}</Text>
                {count > 1 && (
                  <Text style={styles.reactionCount}>{count}</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

function StatusIndicator({
  message,
  isRead,
  colors,
  onRetry,
}: {
  message: Message;
  isRead: boolean;
  colors: any;
  onRetry?: () => void;
}) {
  if (message.isFailed) {
    return (
      <View style={styles.statusRow}>
        <Text style={[styles.statusIcon, { color: colors.failedMessage }]}>⚠</Text>
        {onRetry && (
          <TouchableOpacity onPress={onRetry}>
            <Text style={[styles.retryText, { color: colors.failedMessage }]}>
              Retry
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  if (message.isPending) {
    return <Text style={[styles.statusIcon, { color: `${colors.myMessageText}b3` }]}>⏱</Text>;
  }

  if (isRead) {
    return <Text style={[styles.statusIcon, { color: '#FFFFFF' }]}>✓✓</Text>;
  }

  return <Text style={[styles.statusIcon, { color: `${colors.myMessageText}66` }]}>✓</Text>;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${Math.round(bytes / (1024 * 1024))} MB`;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignItems: 'flex-end',
  },
  containerMe: {
    justifyContent: 'flex-end',
  },
  containerOther: {
    justifyContent: 'flex-start',
  },
  avatar: {
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  avatarText: {
    fontSize: 10,
    fontWeight: '600',
  },
  bubbleContainer: {
    maxWidth: '75%',
  },
  bubbleContainerMe: {
    alignItems: 'flex-end',
  },
  bubbleContainerOther: {
    alignItems: 'flex-start',
  },
  bubble: {
    overflow: 'hidden',
  },
  deletedBubble: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  deletedText: {
    fontStyle: 'italic',
    color: '#8E8E93',
  },
  replyPreview: {
    flexDirection: 'row',
    padding: 8,
    marginBottom: 4,
  },
  replyBar: {
    width: 3,
    borderRadius: 2,
    marginRight: 8,
  },
  replyContent: {
    flex: 1,
  },
  replyName: {
    fontSize: 12,
    fontWeight: '500',
  },
  replyText: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  image: {
    borderRadius: 8,
    marginBottom: 4,
  },
  fileChip: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    marginBottom: 4,
  },
  fileIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 12,
  },
  fileSize: {
    fontSize: 10,
    marginTop: 2,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  editedText: {
    fontSize: 10,
    fontStyle: 'italic',
    marginRight: 4,
  },
  timestamp: {
    fontSize: 10,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 4,
  },
  statusIcon: {
    fontSize: 10,
    marginLeft: 4,
  },
  retryText: {
    fontSize: 10,
    marginLeft: 4,
    fontWeight: '500',
  },
  reactionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  reactionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 4,
    marginBottom: 4,
  },
  reactionEmoji: {
    fontSize: 14,
  },
  reactionCount: {
    fontSize: 10,
    color: '#666',
    marginLeft: 4,
  },
});

export default ChatMessageBubble;
