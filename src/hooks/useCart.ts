// hooks/useCart.ts
import { useAuth } from '@/context/AuthContext';
import { customerApi } from '@/services/api/customerApi';
import { CartItem, ShoppingCart } from '@/types/customer';
import { Ingredient } from '@/types/menu';
import { useCallback, useState } from 'react';

// Define the PlateDetails type for the hook
export interface PlateDetails {
  basePrice: number;
  description: string;
  baseIngredients: Ingredient[];
  sections: Array<{
    id: string;
    name: string;
    required: boolean;
    multiple: boolean;
    ingredientDependent: boolean;
    options: Array<{
      id: string;
      name: string;
      additionalCost: number; // This should be number, not number | undefined
      ingredients?: Ingredient[];
    }>;
  }>;
  customizationState: {
    removedIngredients: string[];
    selectedOptions: Record<string, string[]>;
    quantity: number;
    notes: string;
  };
  currentIngredients: Ingredient[];
}

// Helper function to ensure additionalCost is always a number
function ensureAdditionalCostIsNumber(additionalCost: number | undefined): number {
  return additionalCost || 0;
}

// Helper function to transform plate sections to ensure all types match
function transformPlateSections(sections: Array<{
  id: string;
  name: string;
  required: boolean;
  multiple: boolean;
  ingredientDependent: boolean;
  options: Array<{
    id: string;
    name: string;
    additionalCost: number | undefined;
    ingredients?: Ingredient[];
  }>;
}>): Array<{
  id: string;
  name: string;
  required: boolean;
  multiple: boolean;
  ingredientDependent: boolean;
  options: Array<{
    id: string;
    name: string;
    additionalCost: number;
    ingredients?: Ingredient[];
  }>;
}> {
  return sections.map(section => ({
    id: section.id,
    name: section.name,
    required: section.required,
    multiple: section.multiple,
    ingredientDependent: section.ingredientDependent,
    options: section.options.map(option => ({
      id: option.id,
      name: option.name,
      additionalCost: ensureAdditionalCostIsNumber(option.additionalCost),
      ingredients: option.ingredients
    }))
  }));
}

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

  // Updated addToCart function with plateDetails parameter
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
      ingredientDependent?: boolean;
      optionIngredients?: Ingredient[];
    }>,
    variantId?: string,
    customIngredients?: Ingredient[],
    imageUrl?: string,
    notes?: string,
    plateDetails?: {
      // Accept the more flexible type from your plate data
      basePrice: number;
      description: string;
      baseIngredients: Ingredient[];
      sections: Array<{
        id: string;
        name: string;
        required: boolean;
        multiple: boolean;
        ingredientDependent: boolean;
        options: Array<{
          id: string;
          name: string;
          additionalCost: number | undefined;
          ingredients?: Ingredient[];
        }>;
      }>;
      customizationState: {
        removedIngredients: string[];
        selectedOptions: Record<string, string[]>;
        quantity: number;
        notes: string;
      };
      currentIngredients: Ingredient[];
    }
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
        notes: notes || '',
        // NEW: Include plateDetails if provided, transforming sections to ensure type safety
        plateDetails: plateDetails ? {
          basePrice: plateDetails.basePrice,
          description: plateDetails.description,
          baseIngredients: plateDetails.baseIngredients,
          sections: transformPlateSections(plateDetails.sections),
          customizationState: {
            removedIngredients: plateDetails.customizationState.removedIngredients,
            selectedOptions: plateDetails.customizationState.selectedOptions,
            quantity: plateDetails.customizationState.quantity,
            notes: plateDetails.customizationState.notes
          },
          currentIngredients: plateDetails.currentIngredients
        } : undefined
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

  // NEW: Function to update an existing cart item with new details
  const updateCartItem = useCallback(async (
    itemId: string,
    updates: {
      quantity?: number;
      selectedOptions?: Array<{
        sectionId: string;
        sectionName: string;
        optionId: string;
        optionName: string;
        additionalCost: number;
        ingredientDependent?: boolean;
        optionIngredients?: Ingredient[];
      }>;
      customIngredients?: Ingredient[];
      notes?: string;
      plateDetails?: {
        basePrice: number;
        description: string;
        baseIngredients: Ingredient[];
        sections: Array<{
          id: string;
          name: string;
          required: boolean;
          multiple: boolean;
          ingredientDependent: boolean;
          options: Array<{
            id: string;
            name: string;
            additionalCost: number | undefined;
            ingredients?: Ingredient[];
          }>;
        }>;
        customizationState: {
          removedIngredients: string[];
          selectedOptions: Record<string, string[]>;
          quantity: number;
          notes: string;
        };
        currentIngredients: Ingredient[];
      };
    }
  ) => {
    if (!cart?.id) {
      throw new Error('No active cart found');
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // First, get the current cart to find the item
      const currentCart = cart;
      const itemIndex = currentCart.items.findIndex(item => item.id === itemId);
      
      if (itemIndex === -1) {
        throw new Error('Item not found in cart');
      }
      
      const currentItem = currentCart.items[itemIndex];
      
      // If updating quantity, use the existing API
      if (updates.quantity !== undefined) {
        const result = await customerApi.updateCartItemQuantity(cart.id, itemId, updates.quantity);
        if (result.success) {
          setCart(result.data || null);
          return result.data;
        } else {
          throw new Error(result.error || 'Failed to update item quantity');
        }
      }
      
      // For other updates, we need to remove and re-add the item
      // First remove the item
      const removeResult = await customerApi.removeFromCart(cart.id, itemId);
      if (!removeResult.success) {
        throw new Error('Failed to update item');
      }
      
      // Then add a new item with updated details
      const newItem: Omit<CartItem, 'id' | 'addedAt'> = {
        menuId: currentItem.menuId,
        plateId: currentItem.plateId,
        plateName: currentItem.plateName,
        variantId: currentItem.variantId,
        customIngredients: updates.customIngredients || currentItem.customIngredients,
        selectedOptions: updates.selectedOptions || currentItem.selectedOptions,
        quantity: currentItem.quantity, // Keep current quantity unless specified
        price: currentItem.price,
        imageUrl: currentItem.imageUrl,
        restaurantId: currentItem.restaurantId,
        restaurantName: currentItem.restaurantName,
        notes: updates.notes !== undefined ? updates.notes : currentItem.notes,
        plateDetails: updates.plateDetails ? {
          basePrice: updates.plateDetails.basePrice,
          description: updates.plateDetails.description,
          baseIngredients: updates.plateDetails.baseIngredients,
          sections: transformPlateSections(updates.plateDetails.sections),
          customizationState: {
            removedIngredients: updates.plateDetails.customizationState.removedIngredients,
            selectedOptions: updates.plateDetails.customizationState.selectedOptions,
            quantity: updates.plateDetails.customizationState.quantity,
            notes: updates.plateDetails.customizationState.notes
          },
          currentIngredients: updates.plateDetails.currentIngredients
        } : currentItem.plateDetails
      };
      
      const addResult = await customerApi.addToCart(user!.customerId!, newItem);
      if (addResult.success) {
        setCart(addResult.data || null);
        return addResult.data;
      } else {
        throw new Error(addResult.error || 'Failed to update item');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update item');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [cart?.id, user]);

  // NEW: Function to edit an item (remove and prepare for re-customization)
  const editCartItem = useCallback(async (itemId: string) => {
    if (!cart?.id) {
      throw new Error('No active cart found');
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Get the item to edit
      const item = cart.items.find(i => i.id === itemId);
      if (!item) {
        throw new Error('Item not found in cart');
      }
      
      // Remove the item from cart
      const result = await customerApi.removeFromCart(cart.id, itemId);
      if (result.success) {
        setCart(result.data || null);
        return {
          success: true,
          itemDetails: {
            menuId: item.menuId,
            plateId: item.plateId,
            plateName: item.plateName,
            restaurantId: item.restaurantId,
            restaurantName: item.restaurantName,
            price: item.price,
            quantity: item.quantity,
            selectedOptions: item.selectedOptions,
            variantId: item.variantId,
            customIngredients: item.customIngredients,
            imageUrl: item.imageUrl,
            notes: item.notes,
            plateDetails: item.plateDetails
          }
        };
      } else {
        throw new Error(result.error || 'Failed to edit item');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to edit item');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [cart?.id]);

  // NEW: Function to reconstruct plate state from cart item
  const getReconstructedPlateState = useCallback((cartItem: CartItem) => {
    if (!cartItem.plateDetails) {
      return null;
    }
    
    const { plateDetails } = cartItem;
    
    return {
      plate: {
        id: cartItem.plateId,
        name: cartItem.plateName,
        description: plateDetails.description,
        basePrice: plateDetails.basePrice,
        baseIngredients: plateDetails.baseIngredients,
        imageUrl: cartItem.imageUrl || undefined,
        sections: plateDetails.sections,
      },
      state: {
        selectedOptions: { ...plateDetails.customizationState.selectedOptions },
        removedIngredients: new Set(plateDetails.customizationState.removedIngredients),
        quantity: plateDetails.customizationState.quantity,
        notes: plateDetails.customizationState.notes,
        currentIngredients: plateDetails.currentIngredients,
        
        // Helper methods
        getCurrentIngredients: () => plateDetails.currentIngredients,
        calculateTotalPrice: () => {
          let total = plateDetails.basePrice;
          
          Object.entries(plateDetails.customizationState.selectedOptions).forEach(([sectionId, optionIds]) => {
            const section = plateDetails.sections.find(s => s.id === sectionId);
            if (section) {
              optionIds.forEach(optionId => {
                const option = section.options.find(o => o.id === optionId);
                if (option) {
                  total += option.additionalCost || 0;
                }
              });
            }
          });
          
          return total * plateDetails.customizationState.quantity;
        },
        
        getSelectedOptionDetails: () => {
          const selectedOptionDetails: Array<{
            sectionId: string;
            sectionName: string;
            optionId: string;
            optionName: string;
            additionalCost: number;
            ingredientDependent?: boolean;
            optionIngredients?: Ingredient[];
          }> = [];
          
          Object.entries(plateDetails.customizationState.selectedOptions).forEach(([sectionId, optionIds]) => {
            const section = plateDetails.sections.find(s => s.id === sectionId);
            if (section) {
              optionIds.forEach(optionId => {
                const option = section.options.find(o => o.id === optionId);
                if (option) {
                  selectedOptionDetails.push({
                    sectionId,
                    sectionName: section.name,
                    optionId,
                    optionName: option.name,
                    additionalCost: option.additionalCost || 0,
                    ingredientDependent: section.ingredientDependent,
                    optionIngredients: option.ingredients || []
                  });
                }
              });
            }
          });
          
          return selectedOptionDetails;
        }
      }
    };
  }, []);

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
    clearCart,
    updateCartItem,
    editCartItem,
    getReconstructedPlateState
  };
}