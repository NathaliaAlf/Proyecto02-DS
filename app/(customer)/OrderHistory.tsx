// components/OrderHistory.tsx
import { useOrders } from '@/hooks/useOrders';
import { Order } from '@/types/customer';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect } from 'react';
import {
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  preparing: 'Preparing',
  ready: 'Ready',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Completed', // Matched "Completed" from screenshot
  cancelled: 'Cancelled'
};

export default function OrderHistory() {
  const { orders, loading, error, loadOrders } = useOrders();
  const router = useRouter();

  useEffect(() => {
    loadOrders(10);
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    // Formats to "Jan 31"
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const renderOrderItem = ({ item }: { item: Order }) => {
    const imageSource = { uri: 'https://via.placeholder.com/150' };

    return (
        <TouchableOpacity
            style={styles.itemContainer}
            onPress={() => router.push({ pathname: '/(customer)/OrderHistoryDetail', params: { orderId: item.orderId } })}
        >
          {/* Left: Image */}
          <Image source={imageSource} style={styles.itemImage} />

          {/* Middle: Info */}
          <View style={styles.infoContainer}>
            {/* Using clientName as main title */}
            <Text style={styles.mainTitle} numberOfLines={1}>
              {item.clientName}
            </Text>

            {/* Location or Secondary Info (using address) */}
            <Text style={styles.subTitle} numberOfLines={1}>
              {item.address}
            </Text>

            {/* Details: Items • Price */}
            <Text style={styles.detailsText}>
              {item.plates.length} {item.plates.length === 1 ? 'item' : 'items'} • CRC {item.totalAmount.toLocaleString('en-CR', { minimumFractionDigits: 2 })}
            </Text>

            {/* Date • Status */}
            <Text style={styles.statusLine}>
              {formatDate(item.createdAt)} • {STATUS_LABELS[item.status] || item.status}
            </Text>
          </View>

          {/* Right: Reorder Button */}
          <TouchableOpacity style={styles.reorderButton}>
            <Text style={styles.reorderText}>Reorder</Text>
          </TouchableOpacity>
        </TouchableOpacity>
    );
  };

  if (loading && orders.length === 0) {
    return (
        <View style={styles.centerContainer}>
          <Text>Loading orders...</Text>
        </View>
    );
  }

  if (error) {
    return (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => loadOrders(10)}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
    );
  }

  return (
      <View style={styles.container}>
        {/* Header specifically styled per Figma specs */}
        <View style={styles.headerContainer}>
          <Text style={styles.headerTitle}>Orders</Text>
        </View>

        <FlatList
            data={orders}
            renderItem={renderOrderItem}
            keyExtractor={item => item.orderId}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff', // White background
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  // Header Typography per Screenshot 2 settings
  headerContainer: {
    paddingHorizontal: 20,
    paddingTop: 60, // Adjust for status bar
    paddingBottom: 20,
    backgroundColor: '#fff',
  },
  headerTitle: {
    fontFamily: 'Inter', // Ensure Inter font is loaded in your project
    fontWeight: '700',   // Bold
    fontSize: 32,
    lineHeight: 32,      // 100% line height
    color: '#000000',
  },
  // List Styles
  listContent: {
    paddingBottom: 20,
  },
  itemContainer: {
    flexDirection: 'row',
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: 30, // Circular image
    backgroundColor: '#eee',
    marginRight: 16,
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  mainTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    marginBottom: 2,
    fontFamily: 'Inter',
  },
  subTitle: {
    fontSize: 16,
    fontWeight: '700', // The screenshot has the second line also bold/dark
    color: '#000',
    marginBottom: 4,
    fontFamily: 'Inter',
  },
  detailsText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
    fontFamily: 'Inter',
  },
  statusLine: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Inter',
  },
  // Reorder Button
  reorderButton: {
    backgroundColor: '#F2F2F2', // Light gray background
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginLeft: 8,
  },
  reorderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    fontFamily: 'Inter',
  },
  separator: {
    height: 1,
    backgroundColor: '#EEEEEE',
    marginLeft: 96, // Indent separator to align with text, optional
  },
  errorText: {
    color: 'red',
    marginBottom: 10,
  },
  retryText: {
    color: '#007AFF',
    fontWeight: '600',
  }
});