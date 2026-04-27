import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Text,
  KeyboardAvoidingView,
  Platform,
  FlatList,
} from 'react-native';
import { RiviumChatClient, type Message } from '@rivium/react-native-chat';
import {
  ChatScreen,
  RiviumChatProvider,
  RiviumChatThemeProvider,
  PresenceIndicator,
  MessageSearchBar,
  ChatMessageBubble,
  TypingDots,
} from '@rivium/react-native-chat-ui';
import { DemoUser, Order, getOtherUser } from '../models/types';
import { OrderHeaderWidget } from '../components/OrderHeaderWidget';
import { PinnedMessagesSheet } from '../components/PinnedMessagesSheet';

interface OrderChatScreenProps {
  order: Order;
  currentUser: DemoUser;
  client: RiviumChatClient;
  onBack: () => void;
}

export function OrderChatScreen({
  order,
  currentUser,
  client,
  onBack,
}: OrderChatScreenProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showPinnedMessages, setShowPinnedMessages] = useState(false);
  const [isOtherUserOnline, setIsOtherUserOnline] = useState(false);
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Message[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchIndex, setSearchIndex] = useState(0);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Use order.id as the external room ID (matches web SDK format)
  const roomId = order.id;
  const otherUser = getOtherUser(currentUser.id);

  const [actualRoomId, setActualRoomId] = useState<string | null>(null);

  useEffect(() => {
    // Subscribe to connection state
    const handleConnectionState = (event: { state: string }) => {
      setIsConnected(event.state === 'connected');
    };

    // Subscribe to presence changes
    const handlePresenceChange = (event: { userId: string; isOnline: boolean; roomId: string }) => {
      if (event.userId === otherUser.id) {
        setIsOtherUserOnline(event.isOnline);
      }
    };

    // Subscribe to typing events with auto-clear timeout
    let typingTimeout: NodeJS.Timeout | null = null;
    const handleTyping = (event: { userId: string; isTyping: boolean; roomId: string }) => {
      if (event.userId === otherUser.id) {
        setIsOtherUserTyping(event.isTyping);
        if (typingTimeout) clearTimeout(typingTimeout);
        if (event.isTyping) {
          typingTimeout = setTimeout(() => setIsOtherUserTyping(false), 3000);
        }
      }
    };

    client.on('connectionState', handleConnectionState);
    client.on('presence', handlePresenceChange);
    client.on('typing', handleTyping);

    // Check current connection state
    setIsConnected(client.isConnected);

    // Ensure we're connected
    client.connect();

    // Find or create the room on the server, then subscribe
    let serverRoomId: string | null = null;
    client
      .findOrCreateRoom(roomId, [
        { externalUserId: currentUser.id, displayName: currentUser.name },
        { externalUserId: otherUser.id, displayName: otherUser.name },
      ], { orderId: order.id, orderNumber: order.orderNumber })
      .then((room) => {
        serverRoomId = room.id;
        setActualRoomId(room.id);
        client.subscribeToRoom(room.id);
        loadPresence(room.id);
      })
      .catch((err) => {
        console.error('Failed to find/create room:', err);
        // Fallback: try subscribing with the external ID directly
        setActualRoomId(roomId);
        client.subscribeToRoom(roomId);
      });

    return () => {
      if (typingTimeout) clearTimeout(typingTimeout);
      client.off('connectionState', handleConnectionState);
      client.off('presence', handlePresenceChange);
      client.off('typing', handleTyping);
      if (serverRoomId) {
        client.leaveRoom(serverRoomId);
      }
    };
  }, [client, roomId, otherUser.id]);

  const loadPresence = async (rid: string) => {
    try {
      const onlineUsers = await client.getRoomPresence(rid);
      setIsOtherUserOnline(onlineUsers.includes(otherUser.id));
    } catch (error) {
      console.error('Failed to load presence:', error);
    }
  };

  const handleSendMessage = useCallback(
    async (content: string) => {
      if (!actualRoomId) return;
      try {
        await client.sendMessage(actualRoomId, content);
      } catch (error) {
        console.error('Failed to send message:', error);
      }
    },
    [client, actualRoomId]
  );

  const handleSearch = useCallback(
    async (query: string) => {
      setSearchQuery(query);

      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      if (!query.trim()) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);

      // Debounce search
      searchTimeoutRef.current = setTimeout(async () => {
        try {
          const result = await client.searchMessages(actualRoomId!, query, { limit: 50 });
          setSearchResults(result.messages || []);
          setSearchIndex(0);
        } catch (error) {
          console.error('Search failed:', error);
          setSearchResults([]);
        } finally {
          setIsSearching(false);
        }
      }, 300);
    },
    [client, actualRoomId]
  );

  const handleSearchClose = () => {
    setShowSearch(false);
    setSearchQuery('');
    setSearchResults([]);
    setSearchIndex(0);
  };

  const handlePreviousResult = () => {
    if (searchIndex > 0) {
      setSearchIndex(searchIndex - 1);
    }
  };

  const handleNextResult = () => {
    if (searchIndex < searchResults.length - 1) {
      setSearchIndex(searchIndex + 1);
    }
  };

  const renderSearchResults = () => {
    if (searchResults.length === 0) {
      return (
        <View style={styles.searchEmptyContainer}>
          <Text style={styles.searchEmptyIcon}>🔍</Text>
          <Text style={styles.searchEmptyTitle}>No messages found</Text>
          <Text style={styles.searchEmptySubtitle}>Try a different search term</Text>
        </View>
      );
    }

    return (
      <FlatList
        data={searchResults}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => {
          const isMe = item.senderId === currentUser.id;
          return (
            <View
              style={[
                styles.searchResultItem,
                index === searchIndex && styles.searchResultHighlighted,
              ]}
            >
              <ChatMessageBubble
                message={item}
                isMe={isMe}
                showAvatar={!isMe}
              />
            </View>
          );
        }}
        contentContainerStyle={styles.searchResultsList}
      />
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backIcon}>‹</Text>
          <Text style={styles.backText}>Orders</Text>
        </TouchableOpacity>

        <View style={styles.headerRight}>
          {/* User info with presence */}
          <View style={styles.userInfo}>
            <View style={styles.userAvatarContainer}>
              <View style={styles.userAvatar}>
                <Text style={styles.userAvatarText}>
                  {otherUser.name[0].toUpperCase()}
                </Text>
              </View>
              <View style={styles.presenceIndicatorContainer}>
                <PresenceIndicator isOnline={isOtherUserOnline} size={10} />
              </View>
            </View>
            <View style={styles.userDetails}>
              <Text style={styles.userName} numberOfLines={1}>
                {otherUser.name}
              </Text>
              {isOtherUserTyping ? (
                <View style={styles.typingContainer}>
                  <Text style={styles.typingText}>typing</Text>
                  <TypingDots color="#007AFF" dotSize={4} />
                </View>
              ) : (
                <Text style={styles.userStatus}>
                  {isOtherUserOnline ? 'Online' : 'Offline'}
                </Text>
              )}
            </View>
          </View>

          {/* Action buttons */}
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => setShowSearch(!showSearch)}
            >
              <Text style={styles.headerButtonIcon}>🔍</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => setShowPinnedMessages(true)}
            >
              <Text style={styles.headerButtonIcon}>📌</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Search bar */}
      {showSearch && (
        <MessageSearchBar
          onSearch={handleSearch}
          onClose={handleSearchClose}
          totalResults={searchResults.length}
          currentIndex={searchIndex}
          isLoading={isSearching}
          onPrevious={handlePreviousResult}
          onNext={handleNextResult}
          placeholder="Search messages..."
        />
      )}

      <OrderHeaderWidget order={order} />

      {/* Main content - either search results or chat */}
      <KeyboardAvoidingView
        style={styles.chatContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {showSearch && searchQuery.trim() ? (
          renderSearchResults()
        ) : actualRoomId ? (
          <RiviumChatProvider client={client} autoConnect={false}>
            <RiviumChatThemeProvider>
              <ChatScreen
                roomId={actualRoomId}
                currentUserId={currentUser.id}
                placeholder={
                  currentUser.role === 'buyer'
                    ? 'Ask about your order...'
                    : 'Reply to customer...'
                }
                showTypingIndicator
                showReadReceipts
                enableReactions
                enableReplies
                enableAttachments
                enablePinning
                onSendMessage={handleSendMessage}
                emptyStateTitle="Start the conversation"
                emptyStateSubtitle={
                  currentUser.role === 'buyer'
                    ? 'Ask questions about your order, request updates, or report issues'
                    : 'Respond to customer inquiries and provide order updates'
                }
              />
            </RiviumChatThemeProvider>
          </RiviumChatProvider>
        ) : null}
      </KeyboardAvoidingView>

      {/* Connection banner */}
      {!isConnected && (
        <View style={styles.connectionBanner}>
          <Text style={styles.connectionText}>Connecting...</Text>
        </View>
      )}

      {/* Pinned Messages Sheet */}
      {actualRoomId && (
        <PinnedMessagesSheet
          visible={showPinnedMessages}
          onClose={() => setShowPinnedMessages(false)}
          roomId={actualRoomId}
          currentUserId={currentUser.id}
          client={client}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  backIcon: {
    fontSize: 32,
    color: '#007AFF',
    marginRight: 4,
    marginTop: -4,
  },
  backText: {
    fontSize: 17,
    color: '#007AFF',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-end',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  userAvatarContainer: {
    position: 'relative',
    marginRight: 8,
  },
  userAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#5856D6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatarText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  presenceIndicatorContainer: {
    position: 'absolute',
    right: -2,
    bottom: -2,
  },
  userDetails: {
    maxWidth: 100,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
  },
  userStatus: {
    fontSize: 12,
    color: '#8E8E93',
  },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typingText: {
    fontSize: 12,
    color: '#007AFF',
    fontStyle: 'italic',
    marginRight: 4,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    padding: 8,
    marginLeft: 4,
  },
  headerButtonIcon: {
    fontSize: 20,
  },
  chatContainer: {
    flex: 1,
  },
  connectionBanner: {
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    backgroundColor: '#FF9500',
    paddingVertical: 8,
    alignItems: 'center',
  },
  connectionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  searchResultsList: {
    padding: 16,
  },
  searchResultItem: {
    marginBottom: 8,
    borderRadius: 8,
    padding: 4,
  },
  searchResultHighlighted: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
  },
  searchEmptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  searchEmptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  searchEmptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  searchEmptySubtitle: {
    fontSize: 15,
    color: '#8E8E93',
    textAlign: 'center',
  },
});

export default OrderChatScreen;
