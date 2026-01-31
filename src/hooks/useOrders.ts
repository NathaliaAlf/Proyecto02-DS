// hooks/useOrders.ts
import { useAuth } from '@/context/AuthContext';
import { customerApi } from '@/services/api/customerApi';
import { Order, OrderCreateDTO } from '@/types/customer';
import { useCallback, useState } from 'react';

export function useOrders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadOrders = useCallback(async (limit?: number) => {
    if (!user?.customerId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const result = await customerApi.getCustomerOrders(user.customerId, limit);
      if (result.success) {
        setOrders(result.data || []);
      } else {
        setError(result.error || 'Failed to load orders');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [user?.customerId]);

  const createOrder = useCallback(async (
    orderData: Omit<OrderCreateDTO, 'customerId'>
  ): Promise<Order | null> => {
    if (!user?.customerId) {
      throw new Error('You must be logged in to create an order');
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const fullOrderData: OrderCreateDTO = {
        ...orderData,
        customerId: user.customerId
      };
      
      const result = await customerApi.createOrder(fullOrderData);
      if (result.success && result.data) {
        // Add to orders list
        setOrders(prev => [result.data!, ...prev]);
        return result.data;
      } else {
        throw new Error(result.error || 'Failed to create order');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create order');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user?.customerId]);

  const getOrder = useCallback(async (orderId: string): Promise<Order | null> => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await customerApi.getOrder(orderId);
      if (result.success) {
        return result.data || null;
      } else {
        setError(result.error || 'Failed to load order');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load order');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    orders,
    loading,
    error,
    loadOrders,
    createOrder,
    getOrder
  };
}