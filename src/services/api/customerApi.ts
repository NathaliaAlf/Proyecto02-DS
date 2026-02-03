// api/customerApi.ts
import { db } from '@/config/firebase';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  updateDoc,
  where
} from 'firebase/firestore';

import {
  AddDeliveryAddressDTO,
  CartItem,
  Customer,
  CustomerCreateDTO,
  CustomerUpdateDTO,
  DeliveryAddress,
  Order,
  OrderCreateDTO,
  OrderUpdateDTO,
  ShoppingCart
} from '@/types/customer';

const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

const generateCartItemId = (): string => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `cartitem_${timestamp}_${random}`;
};


export const customerApi = {
  // ========== CUSTOMER CRUD ==========
  
  // Get customer by ID
  async getCustomer(id: string): Promise<{ success: boolean; data?: Customer; error?: string }> {
    try {
      const customerRef = doc(db, 'customers', id);
      const customerSnap = await getDoc(customerRef);
      
      if (customerSnap.exists()) {
        const customerData = customerSnap.data();
        const customer: Customer = {
          id: customerSnap.id,
          uid: customerData.uid,
          email: customerData.email,
          name: customerData.name,
          phone: customerData.phone,
          address: customerData.address,
          deliveryAddresses: customerData.deliveryAddresses || [],
          dietaryPreferences: customerData.dietaryPreferences || [],
          allergies: customerData.allergies || [],
          favoriteRestaurants: customerData.favoriteRestaurants || [],
          createdAt: customerData.createdAt,
          updatedAt: customerData.updatedAt
        };
        
        return { success: true, data: customer };
      } else {
        return { success: false, error: 'Customer not found' };
      }
    } catch (error) {
      console.error('Error getting customer:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get customer' 
      };
    }
  },

  // Get customer by UID
  async getCustomerByUid(uid: string): Promise<{ success: boolean; data?: Customer; error?: string }> {
    try {
      const customersRef = collection(db, 'customers');
      const q = query(customersRef, where('uid', '==', uid), limit(1));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const docSnap = querySnapshot.docs[0];
        const customerData = docSnap.data();
        const customer: Customer = {
          id: docSnap.id,
          uid: customerData.uid,
          email: customerData.email,
          name: customerData.name,
          phone: customerData.phone,
          address: customerData.address,
          deliveryAddresses: customerData.deliveryAddresses || [],
          dietaryPreferences: customerData.dietaryPreferences || [],
          allergies: customerData.allergies || [],
          favoriteRestaurants: customerData.favoriteRestaurants || [],
          createdAt: customerData.createdAt,
          updatedAt: customerData.updatedAt
        };
        
        return { success: true, data: customer };
      } else {
        return { success: false, error: 'Customer not found' };
      }
    } catch (error) {
      console.error('Error getting customer by UID:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get customer' 
      };
    }
  },

  // Create customer
  async createCustomer(customerData: CustomerCreateDTO): Promise<{ success: boolean; data?: Customer; error?: string }> {
    try {
      // Check if customer already exists
      const existingCustomer = await this.getCustomerByUid(customerData.uid);
      if (existingCustomer.success) {
        return { 
          success: false, 
          error: 'Customer already exists' 
        };
      }
      
      const customersRef = collection(db, 'customers');
      const now = new Date().toISOString();
      
      const newCustomer = {
        uid: customerData.uid,
        email: customerData.email,
        name: customerData.name,
        phone: customerData.phone || '',
        address: customerData.address || '',
        deliveryAddresses: [],
        dietaryPreferences: [],
        allergies: [],
        favoriteRestaurants: [],
        createdAt: now,
        updatedAt: now
      };
      
      const docRef = await addDoc(customersRef, newCustomer);
      
      const createdCustomer: Customer = {
        id: docRef.id,
        ...newCustomer
      };
      
      return { success: true, data: createdCustomer };
    } catch (error) {
      console.error('Error creating customer:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create customer' 
      };
    }
  },

  // Update customer
  async updateCustomer(
    id: string, 
    updateData: CustomerUpdateDTO
  ): Promise<{ success: boolean; data?: Customer; error?: string }> {
    try {
      const customerRef = doc(db, 'customers', id);
      
      // Check if customer exists
      const customerSnap = await getDoc(customerRef);
      if (!customerSnap.exists()) {
        return { success: false, error: 'Customer not found' };
      }
      
      const updatePayload = {
        ...updateData,
        updatedAt: new Date().toISOString()
      };
      
      await updateDoc(customerRef, updatePayload);
      
      // Get updated customer
      const updatedSnap = await getDoc(customerRef);
      const updatedData = updatedSnap.data();
      
      const updatedCustomer: Customer = {
        id: updatedSnap.id,
        uid: updatedData!.uid,
        email: updatedData!.email,
        name: updatedData!.name,
        phone: updatedData!.phone,
        address: updatedData!.address,
        deliveryAddresses: updatedData!.deliveryAddresses || [],
        dietaryPreferences: updatedData!.dietaryPreferences || [],
        allergies: updatedData!.allergies || [],
        favoriteRestaurants: updatedData!.favoriteRestaurants || [],
        createdAt: updatedData!.createdAt,
        updatedAt: updatedData!.updatedAt
      };
      
      return { success: true, data: updatedCustomer };
    } catch (error) {
      console.error('Error updating customer:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update customer' 
      };
    }
  },

  // Add delivery address
  async addDeliveryAddress(
    customerId: string,
    addressData: AddDeliveryAddressDTO
  ): Promise<{ success: boolean; data?: DeliveryAddress; error?: string }> {
    try {
      const customerRef = doc(db, 'customers', customerId);
      
      return await runTransaction(db, async (transaction) => {
        const customerSnap = await transaction.get(customerRef);
        if (!customerSnap.exists()) {
          throw new Error('Customer not found');
        }
        
        const customerData = customerSnap.data();
        const addresses: DeliveryAddress[] = customerData.deliveryAddresses || [];
        
        // Create new address with generated ID
        const newAddress: DeliveryAddress = {
          id: generateId(), // Use our new generator
          ...addressData,
          isDefault: addresses.length === 0 // First address is default
        };
        
        // If this is set as default, update all others to not default
        if (newAddress.isDefault) {
          addresses.forEach(addr => {
            addr.isDefault = false;
          });
        }
        
        addresses.push(newAddress);
        
        transaction.update(customerRef, {
          deliveryAddresses: addresses,
          updatedAt: new Date().toISOString()
        });
        
        return { success: true, data: newAddress };
      });
    } catch (error) {
      console.error('Error adding delivery address:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to add delivery address' 
      };
    }
  },

  // Set default delivery address
  async setDefaultDeliveryAddress(
    customerId: string,
    addressId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const customerRef = doc(db, 'customers', customerId);
      
      return await runTransaction(db, async (transaction) => {
        const customerSnap = await transaction.get(customerRef);
        if (!customerSnap.exists()) {
          throw new Error('Customer not found');
        }
        
        const customerData = customerSnap.data();
        const addresses: DeliveryAddress[] = customerData.deliveryAddresses || [];
        
        // Find and update the address
        const updatedAddresses = addresses.map(addr => ({
          ...addr,
          isDefault: addr.id === addressId
        }));
        
        transaction.update(customerRef, {
          deliveryAddresses: updatedAddresses,
          updatedAt: new Date().toISOString()
        });
        
        return { success: true };
      });
    } catch (error) {
      console.error('Error setting default address:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to set default address' 
      };
    }
  },

  // ========== SHOPPING CART ==========
  
  // Get shopping cart for customer
  async getShoppingCart(customerId: string): Promise<{ success: boolean; data?: ShoppingCart; error?: string }> {
    try {
      const cartsRef = collection(db, 'shoppingCarts');
      const q = query(
        cartsRef,
        where('customerId', '==', customerId),
        where('active', '==', true),
        limit(1)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const docSnap = querySnapshot.docs[0];
        const cartData = docSnap.data();
        
        // Clean and validate cart data to ensure no undefined values
        const cleanCartData = {
          customerId: cartData.customerId || customerId,
          restaurantId: cartData.restaurantId || '',
          restaurantName: cartData.restaurantName || '',
          items: Array.isArray(cartData.items) ? cartData.items.map((item: any) => ({
            id: item.id || generateCartItemId(),
            plateId: item.plateId || '',
            plateName: item.plateName || '',
            menuId: item.menuId || '',
            variantId: item.variantId || null,
            customIngredients: Array.isArray(item.customIngredients) ? item.customIngredients : [],
            selectedOptions: Array.isArray(item.selectedOptions) ? item.selectedOptions : [],
            quantity: item.quantity || 1,
            price: item.price || 0,
            imageUrl: item.imageUrl || null,
            restaurantId: item.restaurantId || cartData.restaurantId || '',
            restaurantName: item.restaurantName || cartData.restaurantName || '',
            addedAt: item.addedAt || new Date().toISOString(),
            notes: item.notes || '', // Add this line
            plateDetails: item.plateDetails || undefined // Add this line
          })) : [],
          active: cartData.active !== undefined ? cartData.active : true,
          deliveryFee: cartData.deliveryFee || 0,
          tax: cartData.tax || 0,
          createdAt: cartData.createdAt || new Date().toISOString(),
          updatedAt: cartData.updatedAt || new Date().toISOString()
        };
        
        // Calculate totals
        const subtotal = cleanCartData.items.reduce((sum: number, item: CartItem) => 
          sum + (item.price * item.quantity), 0);
        
        const cart: ShoppingCart = {
          id: docSnap.id,
          customerId: cleanCartData.customerId,
          restaurantId: cleanCartData.restaurantId,
          restaurantName: cleanCartData.restaurantName,
          items: cleanCartData.items,
          totalItems: cleanCartData.items.reduce((sum: number, item: CartItem) => sum + item.quantity, 0),
          subtotal,
          deliveryFee: cleanCartData.deliveryFee,
          tax: cleanCartData.tax,
          total: subtotal + cleanCartData.deliveryFee + cleanCartData.tax,
          createdAt: cleanCartData.createdAt,
          updatedAt: cleanCartData.updatedAt
        };
        
        return { success: true, data: cart };
      } else {
        // Create new empty cart structure with no undefined values
        const now = new Date().toISOString();
        const emptyCart: ShoppingCart = {
          id: '', // Empty ID for new cart
          customerId,
          restaurantId: '',
          restaurantName: '',
          items: [],
          totalItems: 0,
          subtotal: 0,
          deliveryFee: 0,
          tax: 0,
          total: 0,
          createdAt: now,
          updatedAt: now
        };
        
        return { success: true, data: emptyCart };
      }
    } catch (error) {
      console.error('Error getting shopping cart:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get shopping cart' 
      };
    }
  },

  // Add item to cart
  async addToCart(
    customerId: string,
    cartItem: Omit<CartItem, 'id' | 'addedAt'>
  ): Promise<{ success: boolean; data?: ShoppingCart; error?: string }> {
    try {
      const cartsRef = collection(db, 'shoppingCarts');
      const now = new Date().toISOString();

      const sanitizedCartItem = {
        ...cartItem,
        notes: cartItem.notes || '',
        plateDetails: cartItem.plateDetails || undefined
      };
      
      return await runTransaction(db, async (transaction) => {
        // Get active cart
        const q = query(
          cartsRef,
          where('customerId', '==', customerId),
          where('active', '==', true),
          limit(1)
        );
        
        const querySnapshot = await getDocs(q);
        let cartDoc: any;
        let cartData: any;
        
        if (!querySnapshot.empty) {
          cartDoc = querySnapshot.docs[0];
          cartData = cartDoc.data();
          
          // Check if cart is from same restaurant
          if (cartData.restaurantId && cartData.restaurantId !== cartItem.restaurantId) {
            throw new Error(`Your cart contains items from ${cartData.restaurantName}. Please checkout or clear cart before adding items from ${cartItem.restaurantName}`);
          }
          
          // Check if item already exists
          const existingItemIndex = cartData.items.findIndex(
            (item: CartItem) => 
              item.plateId === cartItem.plateId && 
              item.variantId === cartItem.variantId &&
              JSON.stringify(item.selectedOptions) === JSON.stringify(cartItem.selectedOptions)
          );
          
          if (existingItemIndex >= 0) {
            // Update quantity
            cartData.items[existingItemIndex].quantity += cartItem.quantity;
          } else {
            // Add new item with all required fields 
            const newItem: CartItem = {
              id: generateCartItemId(),
              plateId: cartItem.plateId || '',
              plateName: cartItem.plateName || '',
              menuId: cartItem.menuId || '',
              variantId: cartItem.variantId || null,
              customIngredients: cartItem.customIngredients || [],
              selectedOptions: cartItem.selectedOptions || [],
              quantity: cartItem.quantity || 1,
              price: cartItem.price || 0,
              imageUrl: cartItem.imageUrl || null,
              restaurantId: cartItem.restaurantId || '',
              restaurantName: cartItem.restaurantName || '',
              addedAt: now,
              notes: cartItem.notes || '', 
              plateDetails: cartItem.plateDetails
            };
            cartData.items.push(newItem);
          }
          
          // Update cart totals - ensure no undefined values
          cartData.restaurantId = cartItem.restaurantId || '';
          cartData.restaurantName = cartItem.restaurantName || '';
          cartData.updatedAt = now;
          
          // Ensure all fields in cartData are defined
          const cleanCartData = {
            customerId: cartData.customerId || customerId,
            restaurantId: cartData.restaurantId || '',
            restaurantName: cartData.restaurantName || '',
            items: cartData.items || [],
            active: cartData.active !== undefined ? cartData.active : true,
            deliveryFee: cartData.deliveryFee || 0,
            tax: cartData.tax || 0,
            createdAt: cartData.createdAt || now,
            updatedAt: now
          };
          
          transaction.update(cartDoc.ref, cleanCartData);
          
        } else {
          // Create new cart with all required fields (no undefined)
          const newItem: CartItem = {
            id: generateCartItemId(),
            plateId: cartItem.plateId || '',
            plateName: cartItem.plateName || '',
            menuId: cartItem.menuId || '',
            variantId: cartItem.variantId || null,
            customIngredients: cartItem.customIngredients || [],
            selectedOptions: cartItem.selectedOptions || [],
            quantity: cartItem.quantity || 1,
            price: cartItem.price || 0,
            imageUrl: cartItem.imageUrl || null,
            restaurantId: cartItem.restaurantId || '',
            restaurantName: cartItem.restaurantName || '',
            addedAt: now,
            notes: cartItem.notes || '',
            plateDetails: cartItem.plateDetails
          };
          
          // Create clean cart data with no undefined values
          const cleanCartData = {
            customerId,
            restaurantId: cartItem.restaurantId || '',
            restaurantName: cartItem.restaurantName || '',
            items: [newItem],
            active: true,
            deliveryFee: 0,
            tax: 0,
            createdAt: now,
            updatedAt: now
          };
          
          const newCartRef = doc(cartsRef);
          transaction.set(newCartRef, cleanCartData);
          cartDoc = { id: newCartRef.id, data: () => cleanCartData };
        }
        
        // Get the final cart data for response
        const finalCartData = cartDoc.data();
        
        // Calculate totals for response
        const subtotal = finalCartData.items.reduce((sum: number, item: CartItem) => 
          sum + (item.price * item.quantity), 0);
        
        const cart: ShoppingCart = {
          id: cartDoc.id,
          customerId: finalCartData.customerId,
          restaurantId: finalCartData.restaurantId,
          restaurantName: finalCartData.restaurantName,
          items: finalCartData.items,
          totalItems: finalCartData.items.reduce((sum: number, item: CartItem) => sum + item.quantity, 0),
          subtotal,
          deliveryFee: finalCartData.deliveryFee || 0,
          tax: finalCartData.tax || 0,
          total: subtotal + (finalCartData.deliveryFee || 0) + (finalCartData.tax || 0),
          createdAt: finalCartData.createdAt,
          updatedAt: finalCartData.updatedAt
        };
        
        return { success: true, data: cart };
      });
    } catch (error) {
      console.error('Error adding to cart:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to add to cart' 
      };
    }
  },

  // Update cart item quantity
  async updateCartItemQuantity(
    cartId: string,
    itemId: string,
    quantity: number
  ): Promise<{ success: boolean; data?: ShoppingCart; error?: string }> {
    try {
      const cartRef = doc(db, 'shoppingCarts', cartId);
      
      return await runTransaction(db, async (transaction) => {
        const cartSnap = await transaction.get(cartRef);
        if (!cartSnap.exists()) {
          throw new Error('Cart not found');
        }
        
        const cartData = cartSnap.data();
        const items: CartItem[] = cartData.items;
        const itemIndex = items.findIndex(item => item.id === itemId);
        
        if (itemIndex === -1) {
          throw new Error('Item not found in cart');
        }
        
        if (quantity <= 0) {
          // Remove item
          items.splice(itemIndex, 1);
        } else {
          // Update quantity
          items[itemIndex].quantity = quantity;
        }

        // Calculate new totals
        const subtotal = items.reduce((sum: number, item: CartItem) => 
          sum + (item.price * item.quantity), 0);
        const totalItems = items.reduce((sum: number, item: CartItem) => sum + item.quantity, 0);
        const total = subtotal + (cartData.deliveryFee || 0) + (cartData.tax || 0);

        // Prepare update data
        const updateData: any = {
          items,
          subtotal,
          totalItems,
          total,
          updatedAt: new Date().toISOString()
        };

        // Check if cart is now empty
        if (items.length === 0) {
          updateData.restaurantId = '';
          updateData.restaurantName = '';
          updateData.subtotal = 0;
          updateData.totalItems = 0;
          updateData.total = 0;
        }
        
        transaction.update(cartRef, updateData);
        
        const cart: ShoppingCart = {
          id: cartSnap.id,
          customerId: cartData.customerId,
          restaurantId: items.length === 0 ? '' : cartData.restaurantId,
          restaurantName: items.length === 0 ? '' : cartData.restaurantName,
          items,
          totalItems,
          subtotal,
          deliveryFee: cartData.deliveryFee || 0,
          tax: cartData.tax || 0,
          total,
          createdAt: cartData.createdAt,
          updatedAt: cartData.updatedAt
        };
        
        return { success: true, data: cart };
      });
    } catch (error) {
      console.error('Error updating cart item:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update cart item' 
      };
    }
  },

  // Remove item from cart
  async removeFromCart(
    cartId: string,
    itemId: string
  ): Promise<{ success: boolean; data?: ShoppingCart; error?: string }> {
    try {
      return await this.updateCartItemQuantity(cartId, itemId, 0);
    } catch (error) {
      console.error('Error removing from cart:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to remove from cart' 
      };
    }
  },

  // Clear cart
  async clearCart(cartId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const cartRef = doc(db, 'shoppingCarts', cartId);
      
      await updateDoc(cartRef, {
        items: [],
        restaurantId: '',
        restaurantName: '',
        subtotal: 0,
        totalItems: 0,
        total: 0,
        updatedAt: new Date().toISOString()
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error clearing cart:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to clear cart' 
      };
    }
  },

  // Update cart delivery info
  async updateCartDelivery(
    cartId: string,
    deliveryFee: number,
    tax?: number
  ): Promise<{ success: boolean; data?: ShoppingCart; error?: string }> {
    try {
      const cartRef = doc(db, 'shoppingCarts', cartId);
      
      return await runTransaction(db, async (transaction) => {
        const cartSnap = await transaction.get(cartRef);
        if (!cartSnap.exists()) {
          throw new Error('Cart not found');
        }
        
        const cartData = cartSnap.data();
        const updateData: any = {
          deliveryFee,
          updatedAt: new Date().toISOString()
        };
        
        if (tax !== undefined) {
          updateData.tax = tax;
        }
        
        transaction.update(cartRef, updateData);
        
        // Calculate totals
        const subtotal = cartData.items.reduce((sum: number, item: CartItem) => 
          sum + (item.price * item.quantity), 0);
        
        const cart: ShoppingCart = {
          id: cartSnap.id,
          customerId: cartData.customerId,
          restaurantId: cartData.restaurantId,
          restaurantName: cartData.restaurantName,
          items: cartData.items,
          totalItems: cartData.items.reduce((sum: number, item: CartItem) => sum + item.quantity, 0),
          subtotal,
          deliveryFee,
          tax: tax || cartData.tax || 0,
          total: subtotal + deliveryFee + (tax || cartData.tax || 0),
          createdAt: cartData.createdAt,
          updatedAt: cartData.updatedAt
        };
        
        return { success: true, data: cart };
      });
    } catch (error) {
      console.error('Error updating cart delivery:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update cart delivery' 
      };
    }
  },

  // ========== ORDERS ==========
  
  // Create order from cart
  async createOrder(
    orderData: OrderCreateDTO
  ): Promise<{ success: boolean; data?: Order; error?: string }> {
    try {
      const ordersRef = collection(db, 'orders');
      const now = new Date().toISOString();
      
      // Generate order number
      const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Calculate totals
      const subtotal = orderData.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      
      // For now, use fixed delivery fee and tax
      const deliveryFee = 5.99; // Should be calculated based on distance
      const taxRate = 0.08; // 8% tax
      const tax = subtotal * taxRate;
      const total = subtotal + deliveryFee + tax;
      
      // Generate IDs for order items
      const itemsWithIds = orderData.items.map(item => ({
        id: generateId(), // Use our new generator
        ...item
      }));
      
      const newOrder: Omit<Order, 'id'> = {
        orderNumber,
        customerId: orderData.customerId,
        customerName: '', // Will be populated
        restaurantId: orderData.restaurantId,
        restaurantName: '', // Will be populated
        deliveryAddress: orderData.deliveryAddress,
        items: itemsWithIds,
        subtotal,
        deliveryFee,
        tax,
        total,
        status: 'pending',
        paymentMethod: orderData.paymentMethod,
        paymentStatus: 'pending',
        specialInstructions: orderData.specialInstructions,
        createdAt: now,
        updatedAt: now
      };
      
      // Get customer and restaurant info
      const customerResult = await this.getCustomer(orderData.customerId);
      if (!customerResult.success || !customerResult.data) {
        throw new Error('Customer not found');
      }
      
      const { restaurantApi } = await import('@/services/api/restaurantApi');
      const restaurantResult = await restaurantApi.getRestaurant(orderData.restaurantId);
      if (!restaurantResult.success || !restaurantResult.data) {
        throw new Error('Restaurant not found');
      }
      
      // Update order with names
      newOrder.customerName = customerResult.data.name;
      newOrder.restaurantName = restaurantResult.data.restaurantName;
      
      const docRef = await addDoc(ordersRef, newOrder);
      
      const createdOrder: Order = {
        id: docRef.id,
        ...newOrder
      };
      
      return { success: true, data: createdOrder };
    } catch (error) {
      console.error('Error creating order:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create order' 
      };
    }
  },

  // Get order by ID
  async getOrder(orderId: string): Promise<{ success: boolean; data?: Order; error?: string }> {
    try {
      const orderRef = doc(db, 'orders', orderId);
      const orderSnap = await getDoc(orderRef);
      
      if (orderSnap.exists()) {
        const orderData = orderSnap.data();
        const order: Order = {
          id: orderSnap.id,
          orderNumber: orderData.orderNumber,
          customerId: orderData.customerId,
          customerName: orderData.customerName,
          customerPhone: orderData.customerPhone,
          restaurantId: orderData.restaurantId,
          restaurantName: orderData.restaurantName,
          deliveryAddress: orderData.deliveryAddress,
          items: orderData.items,
          subtotal: orderData.subtotal,
          deliveryFee: orderData.deliveryFee,
          tax: orderData.tax,
          total: orderData.total,
          status: orderData.status,
          estimatedDeliveryTime: orderData.estimatedDeliveryTime,
          actualDeliveryTime: orderData.actualDeliveryTime,
          paymentMethod: orderData.paymentMethod,
          paymentStatus: orderData.paymentStatus,
          specialInstructions: orderData.specialInstructions,
          createdAt: orderData.createdAt,
          updatedAt: orderData.updatedAt
        };
        
        return { success: true, data: order };
      } else {
        return { success: false, error: 'Order not found' };
      }
    } catch (error) {
      console.error('Error getting order:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get order' 
      };
    }
  },

  // Get orders by customer
  async getCustomerOrders(
    customerId: string,
    limitCount: number = 20
  ): Promise<{ success: boolean; data?: Order[]; error?: string }> {
    try {
      const ordersRef = collection(db, 'orders');
      const q = query(
        ordersRef,
        where('customerId', '==', customerId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );
      
      const querySnapshot = await getDocs(q);
      const orders: Order[] = querySnapshot.docs.map(docSnap => {
        const orderData = docSnap.data();
        return {
          id: docSnap.id,
          orderNumber: orderData.orderNumber,
          customerId: orderData.customerId,
          customerName: orderData.customerName,
          customerPhone: orderData.customerPhone,
          restaurantId: orderData.restaurantId,
          restaurantName: orderData.restaurantName,
          deliveryAddress: orderData.deliveryAddress,
          items: orderData.items,
          subtotal: orderData.subtotal,
          deliveryFee: orderData.deliveryFee,
          tax: orderData.tax,
          total: orderData.total,
          status: orderData.status,
          estimatedDeliveryTime: orderData.estimatedDeliveryTime,
          actualDeliveryTime: orderData.actualDeliveryTime,
          paymentMethod: orderData.paymentMethod,
          paymentStatus: orderData.paymentStatus,
          specialInstructions: orderData.specialInstructions,
          createdAt: orderData.createdAt,
          updatedAt: orderData.updatedAt
        };
      });
      
      return { success: true, data: orders };
    } catch (error) {
      console.error('Error getting customer orders:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get orders' 
      };
    }
  },

  // Update order status
  async updateOrder(
    orderId: string,
    updateData: OrderUpdateDTO
  ): Promise<{ success: boolean; data?: Order; error?: string }> {
    try {
      const orderRef = doc(db, 'orders', orderId);
      
      const updatePayload = {
        ...updateData,
        updatedAt: new Date().toISOString()
      };
      
      await updateDoc(orderRef, updatePayload);
      
      // Get updated order
      const updatedSnap = await getDoc(orderRef);
      const updatedData = updatedSnap.data();
      
      const updatedOrder: Order = {
        id: updatedSnap.id,
        orderNumber: updatedData!.orderNumber,
        customerId: updatedData!.customerId,
        customerName: updatedData!.customerName,
        customerPhone: updatedData!.customerPhone,
        restaurantId: updatedData!.restaurantId,
        restaurantName: updatedData!.restaurantName,
        deliveryAddress: updatedData!.deliveryAddress,
        items: updatedData!.items,
        subtotal: updatedData!.subtotal,
        deliveryFee: updatedData!.deliveryFee,
        tax: updatedData!.tax,
        total: updatedData!.total,
        status: updatedData!.status,
        estimatedDeliveryTime: updatedData!.estimatedDeliveryTime,
        actualDeliveryTime: updatedData!.actualDeliveryTime,
        paymentMethod: updatedData!.paymentMethod,
        paymentStatus: updatedData!.paymentStatus,
        specialInstructions: updatedData!.specialInstructions,
        createdAt: updatedData!.createdAt,
        updatedAt: updatedData!.updatedAt
      };
      
      return { success: true, data: updatedOrder };
    } catch (error) {
      console.error('Error updating order:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update order' 
      };
    }
  }
};