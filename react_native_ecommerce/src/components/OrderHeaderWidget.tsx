import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import {
  Order,
  formatCurrency,
  getStatusColor,
  getStatusDisplayName,
} from '../models/types';

interface OrderHeaderWidgetProps {
  order: Order;
}

export function OrderHeaderWidget({ order }: OrderHeaderWidgetProps) {
  const statusColor = getStatusColor(order.status);
  const primaryImage = order.items[0]?.imageUrl;

  return (
    <View style={styles.container}>
      {primaryImage ? (
        <Image source={{ uri: primaryImage }} style={styles.image} />
      ) : (
        <View style={[styles.image, styles.imagePlaceholder]}>
          <Text style={styles.placeholderIcon}>📦</Text>
        </View>
      )}

      <View style={styles.content}>
        <Text style={styles.orderNumber}>{order.orderNumber}</Text>
        <Text style={styles.itemCount}>
          {order.items.length} item{order.items.length > 1 ? 's' : ''} •{' '}
          {formatCurrency(order.totalAmount)}
        </Text>

        <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>
            {getStatusDisplayName(order.status)}
          </Text>
        </View>
      </View>

      {order.trackingNumber && order.status === 'shipped' && (
        <View style={styles.trackingInfo}>
          <Text style={[styles.trackingIcon, { color: statusColor }]}>📦</Text>
          <Text style={[styles.trackingText, { color: statusColor }]}>In Transit</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F5F5F5',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  image: {
    width: 56,
    height: 56,
    borderRadius: 8,
  },
  imagePlaceholder: {
    backgroundColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderIcon: {
    fontSize: 24,
  },
  content: {
    flex: 1,
    marginLeft: 12,
  },
  orderNumber: {
    fontSize: 14,
    fontWeight: '700',
  },
  itemCount: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  trackingInfo: {
    alignItems: 'center',
  },
  trackingIcon: {
    fontSize: 16,
  },
  trackingText: {
    fontSize: 10,
    marginTop: 2,
  },
});

export default OrderHeaderWidget;
