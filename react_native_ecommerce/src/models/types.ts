/** User role in the e-commerce system. */
export type UserRole = 'buyer' | 'seller';

/** Demo user for the e-commerce example. */
export interface DemoUser {
  id: string;
  name: string;
  role: UserRole;
  avatarUrl?: string;
}

/** Order status in the e-commerce system. */
export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

/** Order item. */
export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  imageUrl?: string;
}

/** E-commerce order. */
export interface Order {
  id: string;
  orderNumber: string;
  buyerId: string;
  sellerId: string;
  status: OrderStatus;
  items: OrderItem[];
  totalAmount: number;
  createdAt: Date;
  trackingNumber?: string;
}

/** Demo users for the example app. */
export const DemoUsers: Record<'buyer' | 'seller', DemoUser> = {
  buyer: {
    id: 'buyer-001',
    name: 'Alex Thompson',
    role: 'buyer',
    avatarUrl: 'https://i.pravatar.cc/150?u=buyer-001',
  },
  seller: {
    id: 'seller-001',
    name: 'TechStore',
    role: 'seller',
    avatarUrl: 'https://i.pravatar.cc/150?u=seller-001',
  },
};

/** Get the other user in the conversation. */
export function getOtherUser(currentUserId: string): DemoUser {
  return currentUserId === DemoUsers.buyer.id
    ? DemoUsers.seller
    : DemoUsers.buyer;
}

/** Mock orders for the example. */
export const MockOrders: Order[] = [
  {
    id: 'order-001',
    orderNumber: 'ORD-2024-001',
    buyerId: DemoUsers.buyer.id,
    sellerId: DemoUsers.seller.id,
    status: 'shipped',
    items: [
      {
        id: 'item-001',
        name: 'Wireless Bluetooth Headphones',
        quantity: 1,
        price: 79.99,
        imageUrl: 'https://picsum.photos/seed/headphones/200',
      },
    ],
    totalAmount: 79.99,
    createdAt: new Date('2024-01-15'),
    trackingNumber: 'TRK123456789',
  },
  {
    id: 'order-002',
    orderNumber: 'ORD-2024-002',
    buyerId: DemoUsers.buyer.id,
    sellerId: DemoUsers.seller.id,
    status: 'delivered',
    items: [
      {
        id: 'item-002',
        name: 'USB-C Charging Cable (2-Pack)',
        quantity: 2,
        price: 12.99,
        imageUrl: 'https://picsum.photos/seed/cable/200',
      },
      {
        id: 'item-003',
        name: 'Phone Case - Clear',
        quantity: 1,
        price: 19.99,
        imageUrl: 'https://picsum.photos/seed/case/200',
      },
    ],
    totalAmount: 45.97,
    createdAt: new Date('2024-01-10'),
  },
  {
    id: 'order-003',
    orderNumber: 'ORD-2024-003',
    buyerId: DemoUsers.buyer.id,
    sellerId: DemoUsers.seller.id,
    status: 'pending',
    items: [
      {
        id: 'item-004',
        name: 'Wireless Mouse',
        quantity: 1,
        price: 34.99,
        imageUrl: 'https://picsum.photos/seed/mouse/200',
      },
    ],
    totalAmount: 34.99,
    createdAt: new Date('2024-01-20'),
  },
];

/** Get orders for a specific user. */
export function getOrdersForUser(userId: string): Order[] {
  return MockOrders.filter(
    (order) => order.buyerId === userId || order.sellerId === userId
  );
}

/** Get order by ID. */
export function getOrderById(orderId: string): Order | undefined {
  return MockOrders.find((order) => order.id === orderId);
}

/** Get status color. */
export function getStatusColor(status: OrderStatus): string {
  switch (status) {
    case 'pending':
      return '#FF9500';
    case 'confirmed':
      return '#007AFF';
    case 'shipped':
      return '#5856D6';
    case 'delivered':
      return '#34C759';
    case 'cancelled':
      return '#FF3B30';
    default:
      return '#8E8E93';
  }
}

/** Get status display name. */
export function getStatusDisplayName(status: OrderStatus): string {
  switch (status) {
    case 'pending':
      return 'Pending';
    case 'confirmed':
      return 'Confirmed';
    case 'shipped':
      return 'Shipped';
    case 'delivered':
      return 'Delivered';
    case 'cancelled':
      return 'Cancelled';
    default:
      return status;
  }
}

/** Format currency. */
export function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

/** Format date for display. */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
