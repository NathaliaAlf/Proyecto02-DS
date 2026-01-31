// components/OrderHistory.tsx
import { useOrders } from '@/hooks/useOrders';
import { Order, OrderStatus } from '@/types/customer';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect } from 'react';
import {
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

const STATUS_COLORS: Record<OrderStatus, string> = {
  pending: '#FFA500',
  confirmed: '#2196F3',
  preparing: '#4CAF50',
  ready: '#8BC34A',
  out_for_delivery: '#3F51B5',
  delivered: '#009688',
  cancelled: '#F44336'
};

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  preparing: 'Preparing',
  ready: 'Ready',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled'
};

export function OrderHistory() {
  const { orders, loading, error, loadOrders } = useOrders();

  useEffect(() => {
    loadOrders(10);
  }, []);

  const renderOrderItem = ({ item }: { item: Order }) => (
    <TouchableOpacity style={styles.orderItem}>
      <View style={styles.orderHeader}>
        <View>
          <Text style={styles.orderNumber}>{item.orderNumber}</Text>
          <Text style={styles.restaurantName}>{item.restaurantName}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[item.status] }]}>
          <Text style={styles.statusText}>{STATUS_LABELS[item.status]}</Text>
        </View>
      </View>
      
      <Text style={styles.orderDate}>
        {new Date(item.createdAt).toLocaleDateString()} • {new Date(item.createdAt).toLocaleTimeString()}
      </Text>
      
      <View style={styles.itemsContainer}>
        {item.items.slice(0, 2).map((orderItem, idx) => (
          <Text key={idx} style={styles.itemText}>
            {orderItem.quantity}x {orderItem.plateName}
          </Text>
        ))}
        {item.items.length > 2 && (
          <Text style={styles.moreItemsText}>
            +{item.items.length - 2} more items
          </Text>
        )}
      </View>
      
      <View style={styles.orderFooter}>
        <View style={styles.deliveryInfo}>
          <Ionicons name="location-outline" size={16} color="#666" />
          <Text style={styles.deliveryText}>
            {item.deliveryAddress.address.split(',')[0]}
          </Text>
        </View>
        <Text style={styles.totalAmount}>${item.total.toFixed(2)}</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading && orders.length === 0) {
    return (
      <View style={styles.container}>
        <Text>Loading orders...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => loadOrders(10)}>
          <Text>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (orders.length === 0) {
    return (
      <View style={styles.container}>
        <Ionicons name="receipt-outline" size={64} color="#ccc" />
        <Text style={styles.emptyText}>No orders yet</Text>
        <Text style={styles.emptySubtext}>Your order history will appear here</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Order History</Text>
        <TouchableOpacity onPress={() => loadOrders()}>
          <Text style={styles.viewAll}>View All</Text>
        </TouchableOpacity>
      </View>
      
      <FlatList
        data={orders}
        renderItem={renderOrderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  viewAll: {
    color: '#ff6b35',
    fontSize: 14,
    fontWeight: '600',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  orderItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  orderNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  restaurantName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  orderDate: {
    fontSize: 12,
    color: '#666',
    marginBottom: 12,
  },
  itemsContainer: {
    marginBottom: 12,
  },
  itemText: {
    fontSize: 13,
    color: '#333',
    marginBottom: 2,
  },
  moreItemsText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 4,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 12,
  },
  deliveryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deliveryText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ff6b35',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    color: '#666',
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  errorText: {
    color: '#ff4444',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
});