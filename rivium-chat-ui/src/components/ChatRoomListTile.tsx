import React, { ReactNode } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { format, isToday, isYesterday, differenceInDays } from 'date-fns';
import { useRiviumChatTheme } from '../theme/RiviumChatTheme';
import { Room, Message } from '../state/RiviumChatProvider';
import { PresenceIndicator } from './PresenceIndicator';
import { UnreadBadge } from './UnreadBadge';
import { TypingDots } from './TypingIndicator';

export interface ChatRoomListTileProps {
  room: Room;
  lastMessage?: Message | null;
  unreadCount?: number;
  isMuted?: boolean;
  isPinned?: boolean;
  isTyping?: boolean;
  isOnline?: boolean;
  onPress: () => void;
  avatar?: ReactNode;
  title?: ReactNode;
  subtitle?: ReactNode;
  trailing?: ReactNode;
}

export function ChatRoomListTile({
  room,
  lastMessage,
  unreadCount = 0,
  isMuted = false,
  isPinned = false,
  isTyping = false,
  isOnline = false,
  onPress,
  avatar,
  title,
  subtitle,
  trailing,
}: ChatRoomListTileProps) {
  const { colors, dimensions } = useRiviumChatTheme();

  const formatTimestamp = (isoString: string) => {
    const date = new Date(isoString);
    if (isToday(date)) {
      return format(date, 'HH:mm');
    }
    if (isYesterday(date)) {
      return 'Yesterday';
    }
    if (differenceInDays(new Date(), date) < 7) {
      return format(date, 'EEE');
    }
    return format(date, 'dd/MM/yy');
  };

  const formatLastMessage = (message: Message) => {
    switch (message.type) {
      case 'image':
        return '📷 Photo';
      case 'file':
        return '📎 File';
      case 'system':
        return message.content;
      default:
        return message.content;
    }
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.container,
        isPinned && { backgroundColor: colors.surface },
      ]}
      activeOpacity={0.7}
    >
      {/* Avatar */}
      <View style={styles.avatarContainer}>
        {avatar || (
          <View
            style={[
              styles.defaultAvatar,
              {
                width: dimensions.avatarSize,
                height: dimensions.avatarSize,
                backgroundColor: `${colors.linkText}20`,
              },
            ]}
          >
            <Text style={[styles.avatarText, { color: colors.linkText }]}>
              {(room.name || '?').charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        {isOnline && (
          <View style={styles.presenceContainer}>
            <PresenceIndicator isOnline size={14} />
          </View>
        )}
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Title row */}
        <View style={styles.titleRow}>
          {title || (
            <Text
              style={[
                styles.title,
                unreadCount > 0 && styles.titleUnread,
              ]}
              numberOfLines={1}
            >
              {room.name || 'Chat'}
            </Text>
          )}
          {isPinned && <Text style={styles.icon}>📌</Text>}
          {isMuted && <Text style={styles.icon}>🔕</Text>}
        </View>

        {/* Subtitle */}
        <View style={styles.subtitleRow}>
          {subtitle || (
            isTyping ? (
              <View style={styles.typingRow}>
                <TypingDots dotSize={6} color={colors.typingIndicator} />
                <Text style={[styles.typingText, { color: colors.typingIndicator }]}>
                  typing...
                </Text>
              </View>
            ) : (
              <Text
                style={[
                  styles.subtitle,
                  unreadCount > 0 && styles.subtitleUnread,
                ]}
                numberOfLines={1}
              >
                {lastMessage ? formatLastMessage(lastMessage) : 'No messages yet'}
              </Text>
            )
          )}
        </View>
      </View>

      {/* Trailing */}
      {trailing || (
        <View style={styles.trailing}>
          {lastMessage?.createdAt && (
            <Text
              style={[
                styles.timestamp,
                {
                  color: unreadCount > 0 ? colors.linkText : colors.timestampText,
                },
              ]}
            >
              {formatTimestamp(lastMessage.createdAt)}
            </Text>
          )}
          {unreadCount > 0 && (
            <UnreadBadge
              count={unreadCount}
              backgroundColor={isMuted ? colors.offlineIndicator : undefined}
            />
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

export function ChatRoomListTileSkeleton() {
  const { colors, dimensions } = useRiviumChatTheme();

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.skeletonAvatar,
          {
            width: dimensions.avatarSize,
            height: dimensions.avatarSize,
            backgroundColor: colors.surface,
          },
        ]}
      />
      <View style={styles.content}>
        <View style={[styles.skeletonTitle, { backgroundColor: colors.surface }]} />
        <View style={[styles.skeletonSubtitle, { backgroundColor: colors.surface }]} />
      </View>
      <View style={[styles.skeletonTimestamp, { backgroundColor: colors.surface }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  avatarContainer: {
    position: 'relative',
  },
  defaultAvatar: {
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '600',
  },
  presenceContainer: {
    position: 'absolute',
    bottom: -2,
    right: -2,
  },
  content: {
    flex: 1,
    marginLeft: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    flex: 1,
  },
  titleUnread: {
    fontWeight: '600',
  },
  icon: {
    fontSize: 12,
    marginLeft: 4,
  },
  subtitleRow: {
    marginTop: 2,
  },
  subtitle: {
    fontSize: 14,
    color: '#8E8E93',
  },
  subtitleUnread: {
    color: '#000000',
    fontWeight: '500',
  },
  typingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typingText: {
    fontSize: 14,
    marginLeft: 6,
  },
  trailing: {
    alignItems: 'flex-end',
  },
  timestamp: {
    fontSize: 12,
    marginBottom: 4,
  },
  skeletonAvatar: {
    borderRadius: 20,
  },
  skeletonTitle: {
    width: 120,
    height: 16,
    borderRadius: 4,
  },
  skeletonSubtitle: {
    width: 180,
    height: 12,
    borderRadius: 4,
    marginTop: 8,
  },
  skeletonTimestamp: {
    width: 40,
    height: 12,
    borderRadius: 4,
  },
});

export default ChatRoomListTile;
