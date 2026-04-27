import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
  FlatList,
} from 'react-native';
import { useRiviumChatTheme } from '../theme/RiviumChatTheme';

export interface MessageReactionPickerProps {
  /** Whether the picker is visible. */
  visible: boolean;
  /** Called when a reaction is selected. */
  onReactionSelected: (emoji: string) => void;
  /** Called when the picker is closed. */
  onClose: () => void;
  /** The currently selected reaction (if any). */
  selectedReaction?: string;
  /** Custom list of reactions to show. */
  reactions?: string[];
  /** Title to show above the picker. */
  title?: string;
}

const DEFAULT_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏', '🎉', '🔥'];

/**
 * A reaction picker component for adding emoji reactions to messages.
 */
export function MessageReactionPicker({
  visible,
  onReactionSelected,
  onClose,
  selectedReaction,
  reactions = DEFAULT_REACTIONS,
  title = 'Add Reaction',
}: MessageReactionPickerProps) {
  const { colors } = useRiviumChatTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={[styles.pickerContainer, { backgroundColor: colors.otherMessageBubble }]}>
          <Text style={[styles.title, { color: colors.otherMessageText }]}>{title}</Text>

          <View style={styles.reactionsGrid}>
            {reactions.map((emoji) => (
              <TouchableOpacity
                key={emoji}
                style={[
                  styles.reactionButton,
                  selectedReaction === emoji && {
                    backgroundColor: `${colors.linkText}20`,
                  },
                ]}
                onPress={() => {
                  onReactionSelected(emoji);
                  onClose();
                }}
              >
                <Text style={styles.reactionEmoji}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}

/**
 * Inline quick reaction bar that appears near a message.
 */
export interface QuickReactionBarProps {
  /** Called when a reaction is selected. */
  onReactionSelected: (emoji: string) => void;
  /** List of quick reactions to show. */
  reactions?: string[];
  /** The currently selected reaction (if any). */
  selectedReaction?: string;
}

export function QuickReactionBar({
  onReactionSelected,
  reactions = ['👍', '❤️', '😂', '😮', '😢', '🙏'],
  selectedReaction,
}: QuickReactionBarProps) {
  const { colors } = useRiviumChatTheme();

  return (
    <View style={[styles.quickBarContainer, { backgroundColor: colors.otherMessageBubble }]}>
      {reactions.map((emoji) => (
        <TouchableOpacity
          key={emoji}
          style={[
            styles.quickReactionButton,
            selectedReaction === emoji && {
              backgroundColor: `${colors.linkText}20`,
            },
          ]}
          onPress={() => onReactionSelected(emoji)}
        >
          <Text style={styles.quickReactionEmoji}>{emoji}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerContainer: {
    width: '80%',
    maxWidth: 320,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
  },
  reactionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  reactionButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 4,
  },
  reactionEmoji: {
    fontSize: 28,
  },
  quickBarContainer: {
    flexDirection: 'row',
    borderRadius: 24,
    paddingHorizontal: 8,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  quickReactionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 2,
  },
  quickReactionEmoji: {
    fontSize: 20,
  },
});

export default MessageReactionPicker;
