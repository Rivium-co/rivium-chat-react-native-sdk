import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Keyboard,
} from 'react-native';
import { useRiviumChatTheme } from '../theme/RiviumChatTheme';
import { Message } from '../state/RiviumChatProvider';

export interface ChatInputFieldProps {
  onSendMessage: (content: string) => void;
  onTyping?: () => void;
  replyingTo?: Message | null;
  onCancelReply?: () => void;
  editingMessage?: Message | null;
  onCancelEdit?: () => void;
  onEditMessage?: (messageId: string, content: string) => void;
  onAttachmentPress?: () => void;
  onEmojiPress?: () => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInputField({
  onSendMessage,
  onTyping,
  replyingTo,
  onCancelReply,
  editingMessage,
  onCancelEdit,
  onEditMessage,
  onAttachmentPress,
  onEmojiPress,
  disabled = false,
  placeholder = 'Type a message...',
}: ChatInputFieldProps) {
  const [text, setText] = useState('');
  const inputRef = useRef<TextInput>(null);
  const prevEditingRef = useRef<string | null>(null);
  const { colors, dimensions } = useRiviumChatTheme();

  // When editing starts, populate the text field
  useEffect(() => {
    if (editingMessage && editingMessage.id !== prevEditingRef.current) {
      setText(editingMessage.content);
      prevEditingRef.current = editingMessage.id;
      inputRef.current?.focus();
    } else if (!editingMessage) {
      prevEditingRef.current = null;
    }
  }, [editingMessage]);

  const handleChangeText = (value: string) => {
    setText(value);
    if (value && !editingMessage) {
      onTyping?.();
    }
  };

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;

    if (editingMessage && onEditMessage) {
      onEditMessage(editingMessage.id, trimmed);
      onCancelEdit?.();
    } else {
      onSendMessage(trimmed);
    }
    setText('');
  };

  const handleCancel = () => {
    if (editingMessage) {
      onCancelEdit?.();
      setText('');
    } else if (replyingTo) {
      onCancelReply?.();
    }
  };

  const isEditing = !!editingMessage;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Reply preview */}
      {replyingTo && !isEditing && (
        <View style={[styles.previewBar, { backgroundColor: colors.replyBackground }]}>
          <View style={[styles.previewAccent, { backgroundColor: colors.linkText }]} />
          <View style={styles.previewContent}>
            <Text style={[styles.previewLabel, { color: colors.linkText }]}>
              Replying to {replyingTo.senderUserId}
            </Text>
            <Text style={styles.previewText} numberOfLines={1}>
              {replyingTo.content}
            </Text>
          </View>
          <TouchableOpacity onPress={handleCancel} style={styles.cancelButton}>
            <Text style={styles.cancelIcon}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Edit preview */}
      {isEditing && (
        <View style={[styles.previewBar, { backgroundColor: colors.replyBackground }]}>
          <View style={[styles.previewAccent, { backgroundColor: '#FF9500' }]} />
          <View style={styles.previewContent}>
            <Text style={[styles.previewLabel, { color: '#FF9500' }]}>
              ✏️ Editing message
            </Text>
            <Text style={styles.previewText} numberOfLines={1}>
              {editingMessage!.content}
            </Text>
          </View>
          <TouchableOpacity onPress={handleCancel} style={styles.cancelButton}>
            <Text style={styles.cancelIcon}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Input bar */}
      <View style={[styles.inputBar, { borderTopColor: colors.border }]}>
        {/* Attachment button */}
        {onAttachmentPress && !isEditing && (
          <TouchableOpacity
            onPress={onAttachmentPress}
            disabled={disabled}
            style={styles.iconButton}
          >
            <Text style={[styles.iconText, disabled && styles.disabled]}>📎</Text>
          </TouchableOpacity>
        )}

        {/* Text input container */}
        <View
          style={[
            styles.inputContainer,
            {
              backgroundColor: colors.surface,
              borderRadius: dimensions.inputFieldRadius,
            },
          ]}
        >
          <TextInput
            ref={inputRef}
            value={text}
            onChangeText={handleChangeText}
            placeholder={isEditing ? 'Edit message...' : placeholder}
            placeholderTextColor={colors.timestampText}
            editable={!disabled}
            multiline
            maxLength={4000}
            style={[
              styles.textInput,
              { color: colors.otherMessageText },
            ]}
          />
        </View>

        {/* Send button */}
        <TouchableOpacity
          onPress={handleSend}
          disabled={disabled || !text.trim()}
          style={[
            styles.sendButton,
            {
              backgroundColor: text.trim()
                ? (isEditing ? '#FF9500' : colors.myMessageBubble)
                : colors.offlineIndicator,
            },
          ]}
        >
          <Text style={styles.sendIcon}>{isEditing ? '✓' : '↑'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  previewBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  previewAccent: {
    width: 3,
    height: 40,
    borderRadius: 2,
    marginRight: 12,
  },
  previewContent: {
    flex: 1,
  },
  previewLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  previewText: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  cancelButton: {
    padding: 8,
  },
  cancelIcon: {
    fontSize: 14,
    color: '#8E8E93',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  iconButton: {
    padding: 8,
  },
  iconText: {
    fontSize: 22,
  },
  disabled: {
    opacity: 0.5,
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    maxHeight: 100,
    paddingTop: 0,
    paddingBottom: 0,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendIcon: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

export default ChatInputField;
