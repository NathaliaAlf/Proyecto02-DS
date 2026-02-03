// app/(customer)/OrderHistoryDetail.tsx
import { useOrders } from '@/hooks/useOrders';
import { Order } from '@/types/customer';
import { useLocalSearchParams, Stack } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';

export default function OrderHistoryDetail() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const { getOrder, loading, error } = useOrders();
  const [order, setOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (orderId) {
      loadOrderDetails(orderId);
    }
  }, [orderId]);

  const loadOrderDetails = async (id: string) => {
    const data = await getOrder(id);
    if (data) {
      setOrder(data);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.centerContainer}>
        <Text>Order not found</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Order Details' }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        
        {/* Header Info */}
        <View style={styles.section}>
          <Text style={styles.label}>Order ID:</Text>
          <Text style={styles.value}>{order.orderId}</Text>
          
          <Text style={styles.label}>Date:</Text>
          <Text style={styles.value}>{formatDate(order.createdAt)}</Text>
          
          <Text style={styles.label}>Status:</Text>
          <Text style={styles.value}>{order.status}</Text>
        </View>

        {/* Customer Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer Info</Text>
          <Text style={styles.label}>Name:</Text>
          <Text style={styles.value}>{order.clientName}</Text>
          
          <Text style={styles.label}>Address:</Text>
          <Text style={styles.value}>{order.address}</Text>
        </View>

        {/* Plates */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Items</Text>
          {order.plates.map((plate, index) => (
            <View key={`${plate.id}-${index}`} style={styles.plateContainer}>
              <View style={styles.plateHeader}>
                <Text style={styles.plateName}>{plate.name}</Text>
                <Text style={styles.platePrice}>CRC {plate.basePrice}</Text>
              </View>
              <Text style={styles.plateDescription}>{plate.description}</Text>

              {/* Base Ingredients */}
              {plate.baseIngredients && plate.baseIngredients.length > 0 && (
                <View style={styles.ingredientsContainer}>
                  <Text style={styles.subHeader}>Base Ingredients:</Text>
                  <Text style={styles.ingredientText}>
                    {plate.baseIngredients.join(', ')}
                  </Text>
                </View>
              )}

              {/* Optional Ingredients */}
              {plate.optionalIngredients && plate.optionalIngredients.length > 0 && (
                <View style={styles.ingredientsContainer}>
                  <Text style={styles.subHeader}>Optional Ingredients:</Text>
                  <Text style={styles.ingredientText}>
                    {plate.optionalIngredients.join(', ')}
                  </Text>
                </View>
              )}

              {/* Sections / Customizations */}
              {plate.section && plate.section.map((sec) => (
                <View key={sec.id} style={styles.sectionContainer}>
                  <Text style={styles.subHeader}>{sec.name}:</Text>
                  {sec.options.map((opt) => (
                    <View key={opt.id} style={styles.optionRow}>
                      <Text style={styles.optionName}>{opt.name}</Text>
                      {opt.extraPrice > 0 && (
                        <Text style={styles.optionPrice}>+ CRC {opt.extraPrice}</Text>
                      )}
                    </View>
                  ))}
                </View>
              ))}
            </View>
          ))}
        </View>

        {/* Total */}
        <View style={styles.totalSection}>
          <Text style={styles.totalLabel}>Total Amount</Text>
          <Text style={styles.totalValue}>CRC {order.totalAmount.toLocaleString('en-CR', { minimumFractionDigits: 2 })}</Text>
        </View>

      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    color: '#333',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 8,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  value: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
  },
  plateContainer: {
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingBottom: 16,
  },
  plateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  plateName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  platePrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  plateDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  ingredientsContainer: {
    marginTop: 8,
  },
  subHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: '#444',
    marginBottom: 4,
  },
  ingredientText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  sectionContainer: {
    marginTop: 8,
    backgroundColor: '#f9f9f9',
    padding: 8,
    borderRadius: 8,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  optionName: {
    fontSize: 14,
    color: '#555',
  },
  optionPrice: {
    fontSize: 14,
    color: '#555',
    fontWeight: '500',
  },
  totalSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#007AFF',
  },
  errorText: {
    color: 'red',
    fontSize: 16,
  },
});