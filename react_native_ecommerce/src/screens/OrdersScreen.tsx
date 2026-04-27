import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SafeAreaView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { RiviumChatClient } from '@rivium/react-native-chat';
import { DemoUser, Order, MockOrders, OrderStatus } from '../models/types';
import { OrderListCard } from '../components/OrderListCard';

interface OrdersScreenProps {
  currentUser: DemoUser;
  client: RiviumChatClient;
  onOrderTap: (order: Order) => void;
  onLogout: () => void;
}

type FilterOption = 'all' | OrderStatus;

const filterOptions: { key: FilterOption; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'shipped', label: 'Shipped' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'cancelled', label: 'Cancelled' },
];

export function OrdersScreen({
  currentUser,
  client,
  onOrderTap,
  onLogout,
}: OrdersScreenProps) {
  const [selectedFilter, setSelectedFilter] = useState<FilterOption>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const observedRoomIds = useRef<string[]>([]);

  // Fetch unread summary and re-observe all rooms
  const fetchUnreadAndObserve = useCallback(async () => {
    try {
      // Fetch unread counts
      const summary = await client.getUnreadSummary();
      const counts: Record<string, number> = {};
      for (const room of (summary as any).rooms ?? []) {
        if (room.externalId) {
          counts[room.externalId] = room.unreadCount;
        }
      }
      setUnreadCounts(counts);

      // Re-observe all rooms (subscriptions may have been killed by OrderChatScreen)
      const rooms = await client.listRooms();
      const roomIds: string[] = [];
      for (const room of rooms) {
        client.observeRoom(room.id);
        roomIds.push(room.id);
      }
      observedRoomIds.current = roomIds;
    } catch (err) {
      console.error('Failed to fetch unread/observe:', err);
    }
  }, [client]);

  useEffect(() => {
    fetchUnreadAndObserve();

    // Listen for new messages to update unread counts in real-time
    const unsubMessage = client.onMessage((event: any) => {
      if (event.message.senderUserId !== currentUser.id) {
        fetchUnreadAndObserve();
      }
    });

    return () => {
      unsubMessage();
    };
  }, [client, currentUser.id, fetchUnreadAndObserve]);

  // Re-observe rooms and refresh unread when component mounts
  // (replaces useFocusEffect since we're using state-based navigation)
  useEffect(() => {
    fetchUnreadAndObserve();
  }, [fetchUnreadAndObserve]);

  // Filter orders based on user role and selected filter
  const filteredOrders = MockOrders.filter((order) => {
    const isUserOrder =
      currentUser.role === 'buyer'
        ? order.buyerId === currentUser.id
        : order.sellerId === currentUser.id;

    if (!isUserOrder) return false;

    if (selectedFilter === 'all') return true;
    return order.status === selectedFilter;
  });

  const handleOrderTap = useCallback((order: Order) => {
    // Clear unread count for this order when opening chat
    setUnreadCounts((prev) => ({ ...prev, [order.id]: 0 }));
    onOrderTap(order);
  }, [onOrderTap]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchUnreadAndObserve().finally(() => setRefreshing(false));
  }, [fetchUnreadAndObserve]);

  const renderFilterChip = ({ key, label }: { key: FilterOption; label: string }) => {
    const isSelected = selectedFilter === key;
    return (
      <TouchableOpacity
        key={key}
        style={[styles.filterChip, isSelected && styles.filterChipSelected]}
        onPress={() => setSelectedFilter(key)}
        activeOpacity={0.7}
      >
        <Text style={[styles.filterChipText, isSelected && styles.filterChipTextSelected]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateIcon}>📦</Text>
      <Text style={styles.emptyStateTitle}>No Orders Found</Text>
      <Text style={styles.emptyStateSubtitle}>
        {selectedFilter === 'all'
          ? 'You don\'t have any orders yet'
          : `No ${selectedFilter} orders`}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.userInfo}>
            <Text style={styles.welcomeText}>Welcome back,</Text>
            <Text style={styles.userName}>{currentUser.name}</Text>
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.roleTag}>
          {currentUser.role === 'buyer' ? '🛒 Buyer' : '🏪 Seller'}
        </Text>
      </View>

      <View style={styles.filterContainer}>
        <View style={styles.filterList}>
          {filterOptions.map((item) => renderFilterChip(item))}
        </View>
      </View>

      <FlatList
        data={filteredOrders}
        renderItem={({item: order}) => (
          <OrderListCard
            order={order}
            onPress={() => handleOrderTap(order)}
            unreadCount={unreadCounts[order.id] ?? 0}
          />
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.orderList}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#007AFF"
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  userInfo: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 14,
    color: '#8E8E93',
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1C1C1E',
    marginTop: 2,
  },
  roleTag: {
    fontSize: 14,
    color: '#6E6E73',
    marginTop: 4,
  },
  logoutButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
  },
  logoutButtonText: {
    fontSize: 14,
    color: '#FF3B30',
    fontWeight: '500',
  },
  filterContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  filterList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  filterChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#F2F2F7',
    borderRadius: 20,
    marginHorizontal: 4,
  },
  filterChipSelected: {
    backgroundColor: '#007AFF',
  },
  filterChipText: {
    fontSize: 14,
    color: '#6E6E73',
    fontWeight: '500',
  },
  filterChipTextSelected: {
    color: '#FFFFFF',
  },
  orderList: {
    paddingBottom: 16,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 15,
    color: '#8E8E93',
    textAlign: 'center',
  },
});

export default OrdersScreen;
