import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Pressable,
  Dimensions,
} from 'react-native';
import {
  Order,
  formatCurrency,
  getStatusColor,
  getStatusDisplayName,
  formatDate,
} from '../models/types';

interface OrderListCardProps {
  order: Order;
  onPress: () => void;
  unreadCount?: number;
}

const { width } = Dimensions.get('window');

export function OrderListCard({ order, onPress, unreadCount = 0 }: OrderListCardProps) {
  const statusColor = getStatusColor(order.status);
  const primaryImage = order.items[0]?.imageUrl;

  return (
    <Pressable style={({pressed}) => [styles.container, pressed && {opacity: 0.7}]} onPress={onPress}>
      <View style={styles.imageContainer}>
        {primaryImage ? (
          <Image source={{ uri: primaryImage }} style={styles.image} />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]}>
            <Text style={styles.placeholderIcon}>📦</Text>
          </View>
        )}
        {order.items.length > 1 && (
          <View style={styles.itemCountBadge}>
            <Text style={styles.itemCountText}>+{order.items.length - 1}</Text>
          </View>
        )}
      </View>

      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.orderNumber} numberOfLines={1}>
            {order.orderNumber}
          </Text>
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </Text>
            </View>
          )}
        </View>

        <Text style={styles.itemNames} numberOfLines={1}>
          {order.items.map((item) => item.name).join(', ')}
        </Text>

        <View style={styles.footer}>
          <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {getStatusDisplayName(order.status)}
            </Text>
          </View>
          <Text style={styles.amount}>{formatCurrency(order.totalAmount)}</Text>
        </View>

        <Text style={styles.date}>{formatDate(order.createdAt)}</Text>
      </View>

      <View style={styles.chevron}>
        <Text style={styles.chevronIcon}>›</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  imageContainer: {
    position: 'relative',
  },
  image: {
    width: 64,
    height: 64,
    borderRadius: 8,
  },
  imagePlaceholder: {
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderIcon: {
    fontSize: 28,
  },
  itemCountBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: '#007AFF',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  itemCountText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    marginLeft: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  orderNumber: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1C1C1E',
    flex: 1,
  },
  unreadBadge: {
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
    marginLeft: 8,
  },
  unreadText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  itemNames: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 2,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  amount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
    marginLeft: 8,
  },
  date: {
    fontSize: 11,
    color: '#C7C7CC',
    marginTop: 4,
  },
  chevron: {
    marginLeft: 8,
  },
  chevronIcon: {
    fontSize: 24,
    color: '#C7C7CC',
  },
});

export default OrderListCard;
