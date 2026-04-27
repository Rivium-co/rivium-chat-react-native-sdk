import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
} from 'react-native';
import { useRiviumChatTheme } from '../theme/RiviumChatTheme';

export interface MessageAction {
  /** Unique identifier for the action. */
  id: string;
  /** Display label for the action. */
  label: string;
  /** Icon to show (emoji or text). */
  icon?: string;
  /** Whether this is a destructive action (shown in red). */
  destructive?: boolean;
  /** Whether this action is currently disabled. */
  disabled?: boolean;
  /** Called when this action is selected. */
  onPress: () => void;
  /** If true, don't auto-close the menu after pressing. */
  preventClose?: boolean;
}

export interface MessageContextMenuProps {
  /** Whether the menu is visible. */
  visible: boolean;
  /** Called when the menu is closed. */
  onClose: () => void;
  /** List of actions to show in the menu. */
  actions: MessageAction[];
  /** Optional header content to show above actions. */
  header?: React.ReactNode;
}

/**
 * A context menu for message actions like reply, copy, delete, etc.
 */
export function MessageContextMenu({
  visible,
  onClose,
  actions,
  header,
}: MessageContextMenuProps) {
  const { colors } = useRiviumChatTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={[styles.menuContainer, { backgroundColor: colors.otherMessageBubble }]}>
          {header}

          {actions.map((action, index) => (
            <TouchableOpacity
              key={action.id}
              style={[
                styles.menuItem,
                index < actions.length - 1 && styles.menuItemBorder,
                action.disabled && styles.menuItemDisabled,
              ]}
              onPress={() => {
                if (!action.disabled) {
                  action.onPress();
                  if (!action.preventClose) {
                    onClose();
                  }
                }
              }}
              disabled={action.disabled}
            >
              {action.icon && (
                <Text style={styles.menuItemIcon}>{action.icon}</Text>
              )}
              <Text
                style={[
                  styles.menuItemLabel,
                  { color: colors.otherMessageText },
                  action.destructive && styles.menuItemDestructive,
                  action.disabled && styles.menuItemLabelDisabled,
                ]}
              >
                {action.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Pressable>
    </Modal>
  );
}

/**
 * Creates a standard set of message actions.
 */
export function createMessageActions(options: {
  onReply?: () => void;
  onCopy?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onPin?: () => void;
  onUnpin?: () => void;
  onForward?: () => void;
  isOwner?: boolean;
  isPinned?: boolean;
}): MessageAction[] {
  const actions: MessageAction[] = [];

  if (options.onReply) {
    actions.push({
      id: 'reply',
      label: 'Reply',
      icon: '↩️',
      onPress: options.onReply,
    });
  }

  if (options.onCopy) {
    actions.push({
      id: 'copy',
      label: 'Copy',
      icon: '📋',
      onPress: options.onCopy,
    });
  }

  if (options.onForward) {
    actions.push({
      id: 'forward',
      label: 'Forward',
      icon: '↗️',
      onPress: options.onForward,
    });
  }

  if (options.isPinned && options.onUnpin) {
    actions.push({
      id: 'unpin',
      label: 'Unpin',
      icon: '📌',
      onPress: options.onUnpin,
    });
  } else if (!options.isPinned && options.onPin) {
    actions.push({
      id: 'pin',
      label: 'Pin',
      icon: '📌',
      onPress: options.onPin,
    });
  }

  if (options.isOwner && options.onEdit) {
    actions.push({
      id: 'edit',
      label: 'Edit',
      icon: '✏️',
      onPress: options.onEdit,
    });
  }

  if (options.isOwner && options.onDelete) {
    actions.push({
      id: 'delete',
      label: 'Delete',
      icon: '🗑️',
      destructive: true,
      onPress: options.onDelete,
    });
  }

  return actions;
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContainer: {
    width: '80%',
    maxWidth: 300,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  menuItemBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  menuItemDisabled: {
    opacity: 0.5,
  },
  menuItemIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  menuItemLabel: {
    fontSize: 16,
    flex: 1,
  },
  menuItemDestructive: {
    color: '#FF3B30',
  },
  menuItemLabelDisabled: {
    color: '#8E8E93',
  },
});

export default MessageContextMenu;
