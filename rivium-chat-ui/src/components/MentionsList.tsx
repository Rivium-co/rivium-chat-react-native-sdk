import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Image,
} from 'react-native';
import { useRiviumChatTheme } from '../theme/RiviumChatTheme';

export interface MentionUser {
  /** Unique identifier for the user. */
  id: string;
  /** Display name of the user. */
  displayName: string;
  /** Optional avatar URL. */
  avatarUrl?: string;
  /** Optional online status. */
  isOnline?: boolean;
}

export interface MentionsListProps {
  /** List of users to show in the suggestions. */
  users: MentionUser[];
  /** Called when a user is selected. */
  onUserSelected: (user: MentionUser) => void;
  /** Current search query (text after @). */
  searchQuery?: string;
  /** Whether the list is visible. */
  visible?: boolean;
  /** Maximum number of suggestions to show. */
  maxSuggestions?: number;
  /** Custom empty state message. */
  emptyMessage?: string;
}

/**
 * A dropdown list of users for @mention autocomplete.
 */
export function MentionsList({
  users,
  onUserSelected,
  searchQuery = '',
  visible = true,
  maxSuggestions = 5,
  emptyMessage = 'No users found',
}: MentionsListProps) {
  const { colors } = useRiviumChatTheme();

  if (!visible) return null;

  // Filter users based on search query
  const filteredUsers = users
    .filter((user) =>
      user.displayName.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .slice(0, maxSuggestions);

  if (filteredUsers.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.otherMessageBubble }]}>
        <Text style={[styles.emptyText, { color: colors.timestampText }]}>
          {emptyMessage}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.otherMessageBubble }]}>
      <FlatList
        data={filteredUsers}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.userItem}
            onPress={() => onUserSelected(item)}
          >
            {item.avatarUrl ? (
              <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: `${colors.linkText}20` }]}>
                <Text style={[styles.avatarText, { color: colors.linkText }]}>
                  {item.displayName.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}

            <View style={styles.userInfo}>
              <Text style={[styles.userName, { color: colors.otherMessageText }]}>
                {item.displayName}
              </Text>
              <Text style={[styles.userHandle, { color: colors.timestampText }]}>
                @{item.id}
              </Text>
            </View>

            {item.isOnline && (
              <View style={styles.onlineIndicator} />
            )}
          </TouchableOpacity>
        )}
        scrollEnabled={filteredUsers.length > 3}
        style={{ maxHeight: 200 }}
      />
    </View>
  );
}

/**
 * Inline mention chip that appears in the text.
 */
export interface MentionChipProps {
  /** Display name to show. */
  displayName: string;
  /** Called when the chip is pressed. */
  onPress?: () => void;
  /** Whether this is the current user. */
  isCurrentUser?: boolean;
}

export function MentionChip({
  displayName,
  onPress,
  isCurrentUser = false,
}: MentionChipProps) {
  const { colors } = useRiviumChatTheme();

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      style={[
        styles.mentionChip,
        {
          backgroundColor: isCurrentUser
            ? `${colors.linkText}30`
            : `${colors.linkText}15`,
        },
      ]}
    >
      <Text style={[styles.mentionChipText, { color: colors.linkText }]}>
        @{displayName}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '600',
  },
  userInfo: {
    flex: 1,
    marginLeft: 10,
  },
  userName: {
    fontSize: 14,
    fontWeight: '500',
  },
  userHandle: {
    fontSize: 12,
    marginTop: 2,
  },
  onlineIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#34C759',
    marginLeft: 8,
  },
  emptyText: {
    padding: 16,
    textAlign: 'center',
    fontSize: 14,
  },
  mentionChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  mentionChipText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

export default MentionsList;
