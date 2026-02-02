// hooks/useCart.ts
import { useAuth } from '@/context/AuthContext';
import { customerApi } from '@/services/api/customerApi';
import { CartItem, ShoppingCart } from '@/types/customer';
import { Ingredient } from '@/types/menu';
import { useCallback, useState } from 'react';

export function useCart() {
  const { user } = useAuth();
  const [cart, setCart] = useState<ShoppingCart | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCart = useCallback(async () => {
    if (!user?.customerId) {
      console.log('No customerId found, user:', user);
      return null;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      console.log('Loading cart for customerId:', user.customerId);
      
      const result = await customerApi.getShoppingCart(user.customerId);
      console.log('Cart load result:', result);
      
      if (result.success) {
        setCart(result.data || null);
        return result.data || null;
      } else {
        const errorMsg = result.error || 'Failed to load cart';
        setError(errorMsg);
        console.error('Cart load failed:', errorMsg);
        return null;
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load cart';
      setError(errorMsg);
      console.error('Cart load error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [user?.customerId]);

  const addToCart = useCallback(async (
    menuId: string,
    plateId: string,
    plateName: string,
    restaurantId: string,
    restaurantName: string,
    price: number,
    quantity: number,
    selectedOptions: Array<{
      sectionId: string;
      sectionName: string;
      optionId: string;
      optionName: string;
      additionalCost: number;
    }>,
    variantId?: string,
    customIngredients?: Ingredient[],
    imageUrl?: string,
    notes?: string
  ) => {
    // Check if user is logged in and is a customer
    if (!user) {
      throw new Error('You must be logged in to add items to cart');
    }
    
    if (user.userType !== 'customer') {
      throw new Error('Only customer accounts can add items to cart');
    }
    
    if (!user.customerId) {
      throw new Error('Customer profile not found. Please contact support.');
    }

    try {
      setLoading(true);
      setError(null);
      
      const cartItem: Omit<CartItem, 'id' | 'addedAt'> = {
        menuId,
        plateId,
        plateName,
        variantId,
        customIngredients,
        selectedOptions,
        quantity,
        price,
        imageUrl,
        restaurantId,
        restaurantName,
        notes: notes || ''
      };
      
      const result = await customerApi.addToCart(user.customerId, cartItem);
      if (result.success) {
        setCart(result.data || null);
        return result.data;
      } else {
        throw new Error(result.error || 'Failed to add to cart');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add to cart');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const updateItemQuantity = useCallback(async (
    itemId: string,
    quantity: number
  ) => {
    if (!cart?.id) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const result = await customerApi.updateCartItemQuantity(cart.id, itemId, quantity);
      if (result.success) {
        setCart(result.data || null);
      } else {
        setError(result.error || 'Failed to update item');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update item');
    } finally {
      setLoading(false);
    }
  }, [cart?.id]);

  const removeFromCart = useCallback(async (itemId: string) => {
    if (!cart?.id) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const result = await customerApi.removeFromCart(cart.id, itemId);
      if (result.success) {
        setCart(result.data || null);
      } else {
        setError(result.error || 'Failed to remove item');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove item');
    } finally {
      setLoading(false);
    }
  }, [cart?.id]);

  const clearCart = useCallback(async () => {
    if (!cart?.id) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const result = await customerApi.clearCart(cart.id);
      if (result.success) {
        setCart(null);
      } else {
        setError(result.error || 'Failed to clear cart');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear cart');
    } finally {
      setLoading(false);
    }
  }, [cart?.id]);

  return {
    cart,
    loading,
    error,
    loadCart,
    addToCart,
    updateItemQuantity,
    removeFromCart,
    clearCart
  };
}