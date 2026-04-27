import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';
import { useRiviumChatTheme } from '../theme/RiviumChatTheme';

export interface ReplyMessage {
  /** Unique identifier for the message. */
  id: string;
  /** Message content. */
  content: string;
  /** Sender display name. */
  senderName?: string;
  /** Sender user ID. */
  senderId: string;
  /** First attachment URL (for preview). */
  attachmentUrl?: string;
  /** Attachment type (image, file, etc.). */
  attachmentType?: string;
}

export interface ReplyPreviewProps {
  /** The message being replied to. */
  message: ReplyMessage;
  /** Called when the close button is pressed. */
  onClose?: () => void;
  /** Called when the preview is pressed (to scroll to original). */
  onPress?: () => void;
  /** Whether this is in the input area (vs in a bubble). */
  isInputPreview?: boolean;
  /** Whether this is from the current user. */
  isMe?: boolean;
}

/**
 * A preview component for showing the message being replied to.
 */
export function ReplyPreview({
  message,
  onClose,
  onPress,
  isInputPreview = false,
  isMe = false,
}: ReplyPreviewProps) {
  const { colors } = useRiviumChatTheme();

  const content = (
    <View
      style={[
        styles.container,
        isInputPreview && styles.inputContainer,
        !isInputPreview && {
          backgroundColor: isMe
            ? 'rgba(255, 255, 255, 0.1)'
            : colors.replyBackground,
        },
      ]}
    >
      <View
        style={[
          styles.bar,
          {
            backgroundColor: isMe && !isInputPreview
              ? 'rgba(255, 255, 255, 0.5)'
              : colors.linkText,
          },
        ]}
      />

      <View style={styles.content}>
        <Text
          style={[
            styles.senderName,
            {
              color: isMe && !isInputPreview
                ? 'rgba(255, 255, 255, 0.9)'
                : colors.linkText,
            },
          ]}
          numberOfLines={1}
        >
          {message.senderName || message.senderId}
        </Text>

        <View style={styles.messageRow}>
          {message.attachmentUrl && message.attachmentType === 'image' && (
            <Image
              source={{ uri: message.attachmentUrl }}
              style={styles.thumbnail}
            />
          )}

          {message.attachmentUrl && message.attachmentType !== 'image' && (
            <View style={[styles.fileIcon, { backgroundColor: `${colors.linkText}15` }]}>
              <Text style={styles.fileIconText}>📎</Text>
            </View>
          )}

          <Text
            style={[
              styles.messageContent,
              {
                color: isMe && !isInputPreview
                  ? 'rgba(255, 255, 255, 0.7)'
                  : colors.timestampText,
              },
            ]}
            numberOfLines={isInputPreview ? 1 : 2}
          >
            {message.content || (message.attachmentType ? `[${message.attachmentType}]` : '')}
          </Text>
        </View>
      </View>

      {onClose && (
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text
            style={[
              styles.closeIcon,
              {
                color: isInputPreview
                  ? colors.timestampText
                  : isMe
                  ? 'rgba(255, 255, 255, 0.5)'
                  : colors.timestampText,
              },
            ]}
          >
            ✕
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

/**
 * A compact inline reply indicator shown in message bubbles.
 */
export interface InlineReplyIndicatorProps {
  /** The message being replied to. */
  message: ReplyMessage;
  /** Whether this is from the current user. */
  isMe?: boolean;
  /** Called when pressed to scroll to original message. */
  onPress?: () => void;
}

export function InlineReplyIndicator({
  message,
  isMe = false,
  onPress,
}: InlineReplyIndicatorProps) {
  const { colors } = useRiviumChatTheme();

  const content = (
    <View style={styles.inlineContainer}>
      <View
        style={[
          styles.inlineBar,
          {
            backgroundColor: isMe ? 'rgba(255, 255, 255, 0.5)' : colors.linkText,
          },
        ]}
      />
      <View style={styles.inlineContent}>
        <Text
          style={[
            styles.inlineSender,
            { color: isMe ? 'rgba(255, 255, 255, 0.9)' : colors.linkText },
          ]}
          numberOfLines={1}
        >
          {message.senderName || message.senderId}
        </Text>
        <Text
          style={[
            styles.inlineMessage,
            { color: isMe ? 'rgba(255, 255, 255, 0.6)' : colors.timestampText },
          ]}
          numberOfLines={1}
        >
          {message.content}
        </Text>
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 8,
    overflow: 'hidden',
  },
  inputContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    marginHorizontal: 8,
    marginTop: 8,
  },
  bar: {
    width: 3,
  },
  content: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  thumbnail: {
    width: 32,
    height: 32,
    borderRadius: 4,
    marginRight: 8,
  },
  fileIcon: {
    width: 32,
    height: 32,
    borderRadius: 4,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileIconText: {
    fontSize: 16,
  },
  messageContent: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
  },
  closeButton: {
    padding: 8,
    alignSelf: 'flex-start',
  },
  closeIcon: {
    fontSize: 14,
    fontWeight: '600',
  },
  inlineContainer: {
    flexDirection: 'row',
    marginBottom: 6,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  inlineBar: {
    width: 2,
  },
  inlineContent: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  inlineSender: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 2,
  },
  inlineMessage: {
    fontSize: 11,
    lineHeight: 14,
  },
});

export default ReplyPreview;
