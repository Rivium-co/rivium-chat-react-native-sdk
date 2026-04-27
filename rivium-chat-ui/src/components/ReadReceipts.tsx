import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
} from 'react-native';
import { useRiviumChatTheme } from '../theme/RiviumChatTheme';

export interface ReadReceiptUser {
  /** Unique identifier for the user. */
  id: string;
  /** Display name of the user. */
  displayName?: string;
  /** Avatar URL. */
  avatarUrl?: string;
}

export interface ReadReceiptsProps {
  /** List of users who have read the message. */
  readers: ReadReceiptUser[];
  /** Maximum number of avatars to display before collapsing. */
  maxAvatars?: number;
  /** Size of the avatar circles. */
  avatarSize?: number;
  /** Whether to show reader names on hover/press. */
  showNames?: boolean;
}

/**
 * Displays read receipts as a row of overlapping avatars.
 */
export function ReadReceipts({
  readers,
  maxAvatars = 3,
  avatarSize = 16,
  showNames = false,
}: ReadReceiptsProps) {
  const { colors } = useRiviumChatTheme();

  if (readers.length === 0) return null;

  const displayedReaders = readers.slice(0, maxAvatars);
  const remainingCount = readers.length - maxAvatars;

  return (
    <View style={styles.container}>
      {displayedReaders.map((reader, index) => (
        <View
          key={reader.id}
          style={[
            styles.avatarWrapper,
            {
              marginLeft: index > 0 ? -avatarSize / 3 : 0,
              zIndex: displayedReaders.length - index,
            },
          ]}
        >
          {reader.avatarUrl ? (
            <Image
              source={{ uri: reader.avatarUrl }}
              style={[
                styles.avatar,
                {
                  width: avatarSize,
                  height: avatarSize,
                  borderRadius: avatarSize / 2,
                },
              ]}
            />
          ) : (
            <View
              style={[
                styles.avatarPlaceholder,
                {
                  width: avatarSize,
                  height: avatarSize,
                  borderRadius: avatarSize / 2,
                  backgroundColor: `${colors.linkText}30`,
                },
              ]}
            >
              <Text
                style={[
                  styles.avatarText,
                  { fontSize: avatarSize * 0.5, color: colors.linkText },
                ]}
              >
                {(reader.displayName || 'U').charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </View>
      ))}

      {remainingCount > 0 && (
        <View
          style={[
            styles.countBadge,
            {
              marginLeft: -avatarSize / 3,
              width: avatarSize,
              height: avatarSize,
              borderRadius: avatarSize / 2,
              backgroundColor: colors.timestampText,
            },
          ]}
        >
          <Text style={[styles.countText, { fontSize: avatarSize * 0.5 }]}>
            +{remainingCount}
          </Text>
        </View>
      )}

      {showNames && readers.length === 1 && (
        <Text style={[styles.singleName, { color: colors.timestampText }]}>
          {readers[0].displayName || 'Read'}
        </Text>
      )}
    </View>
  );
}

/**
 * Simple checkmark-based read receipt indicator.
 */
export interface ReadStatusProps {
  /** Whether the message has been sent. */
  isSent?: boolean;
  /** Whether the message has been delivered. */
  isDelivered?: boolean;
  /** Whether the message has been read. */
  isRead?: boolean;
  /** Color for unread state. */
  unreadColor?: string;
  /** Color for read state. */
  readColor?: string;
  /** Size of the checkmarks. */
  size?: number;
}

export function ReadStatus({
  isSent = true,
  isDelivered = false,
  isRead = false,
  unreadColor,
  readColor,
  size = 12,
}: ReadStatusProps) {
  const { colors } = useRiviumChatTheme();

  const color = isRead
    ? readColor || colors.readReceipt
    : unreadColor || colors.timestampText;

  if (!isSent) {
    return (
      <Text style={[styles.status, { fontSize: size, color }]}>⏱</Text>
    );
  }

  if (isRead) {
    return (
      <Text style={[styles.status, { fontSize: size, color }]}>✓✓</Text>
    );
  }

  if (isDelivered) {
    return (
      <Text style={[styles.status, { fontSize: size, color }]}>✓✓</Text>
    );
  }

  return (
    <Text style={[styles.status, { fontSize: size, color }]}>✓</Text>
  );
}

/**
 * Detailed read receipt list (for showing who read a message).
 */
export interface ReadReceiptListProps {
  /** List of users who have read the message with timestamps. */
  readers: Array<ReadReceiptUser & { readAt: Date }>;
  /** Title to show above the list. */
  title?: string;
}

export function ReadReceiptList({
  readers,
  title = 'Read by',
}: ReadReceiptListProps) {
  const { colors } = useRiviumChatTheme();

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <View style={styles.listContainer}>
      <Text style={[styles.listTitle, { color: colors.timestampText }]}>
        {title}
      </Text>

      {readers.map((reader) => (
        <View key={reader.id} style={styles.listItem}>
          {reader.avatarUrl ? (
            <Image source={{ uri: reader.avatarUrl }} style={styles.listAvatar} />
          ) : (
            <View style={[styles.listAvatarPlaceholder, { backgroundColor: `${colors.linkText}20` }]}>
              <Text style={[styles.listAvatarText, { color: colors.linkText }]}>
                {(reader.displayName || 'U').charAt(0).toUpperCase()}
              </Text>
            </View>
          )}

          <View style={styles.listInfo}>
            <Text style={[styles.listName, { color: colors.otherMessageText }]}>
              {reader.displayName || reader.id}
            </Text>
            <Text style={[styles.listTime, { color: colors.timestampText }]}>
              {formatTime(reader.readAt)}
            </Text>
          </View>

          <Text style={[styles.listCheck, { color: colors.readReceipt }]}>✓✓</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrapper: {
    borderWidth: 1,
    borderColor: '#fff',
    borderRadius: 100,
  },
  avatar: {
    backgroundColor: '#E0E0E0',
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontWeight: '600',
  },
  countBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#fff',
  },
  countText: {
    color: '#fff',
    fontWeight: '600',
  },
  singleName: {
    marginLeft: 4,
    fontSize: 10,
  },
  status: {
    fontWeight: '600',
  },
  listContainer: {
    paddingVertical: 8,
  },
  listTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  listAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  listAvatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listAvatarText: {
    fontSize: 14,
    fontWeight: '600',
  },
  listInfo: {
    flex: 1,
    marginLeft: 12,
  },
  listName: {
    fontSize: 14,
    fontWeight: '500',
  },
  listTime: {
    fontSize: 12,
    marginTop: 2,
  },
  listCheck: {
    fontSize: 14,
    marginLeft: 8,
  },
});

export default ReadReceipts;
