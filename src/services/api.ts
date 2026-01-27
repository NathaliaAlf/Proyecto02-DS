import { db } from '@/config/firebase';
import {
    addDoc,
    collection,
    doc,
    getDoc,
    getDocs,
    limit,
    query,
    updateDoc,
    where
} from 'firebase/firestore';

// Restaurant API
export const restaurantApi = {
  // Get restaurant by ID
  async getRestaurant(id: string) {
    try {
      const restaurantRef = doc(db, 'restaurants', id);
      const restaurantSnap = await getDoc(restaurantRef);
      
      if (restaurantSnap.exists()) {
        return { 
          success: true, 
          data: { id: restaurantSnap.id, ...restaurantSnap.data() } 
        };
      } else {
        return { success: false, error: 'Restaurant not found' };
      }
    } catch (error) {
      console.error('Error getting restaurant:', error);
      return { success: false, error: 'Failed to get restaurant' };
    }
  },

  // Get all restaurants
  async getAllRestaurants() {
    try {
      const restaurantsRef = collection(db, 'restaurants');
      const querySnapshot = await getDocs(restaurantsRef);
      
      const restaurants = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      return { success: true, data: restaurants };
    } catch (error) {
      console.error('Error getting restaurants:', error);
      return { success: false, error: 'Failed to get restaurants' };
    }
  },

  // Create restaurant
  async createRestaurant(restaurantData: any, userId: string) {
    try {
      const restaurantsRef = collection(db, 'restaurants');
      const newRestaurant = {
        ...restaurantData,
        ownerId: userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: true
      };
      
      const docRef = await addDoc(restaurantsRef, newRestaurant);
      return { success: true, data: { id: docRef.id, ...newRestaurant } };
    } catch (error) {
      console.error('Error creating restaurant:', error);
      return { success: false, error: 'Failed to create restaurant' };
    }
  },

  // Update restaurant
  async updateRestaurant(id: string, updateData: any) {
    try {
      const restaurantRef = doc(db, 'restaurants', id);
      await updateDoc(restaurantRef, {
        ...updateData,
        updatedAt: new Date().toISOString()
      });
      return { success: true };
    } catch (error) {
      console.error('Error updating restaurant:', error);
      return { success: false, error: 'Failed to update restaurant' };
    }
  },

  // Search restaurants
  async searchRestaurants(searchTerm: string) {
    try {
      const restaurantsRef = collection(db, 'restaurants');
      const q = query(
        restaurantsRef,
        where('name', '>=', searchTerm),
        where('name', '<=', searchTerm + '\uf8ff'),
        limit(10)
      );
      
      const querySnapshot = await getDocs(q);
      const restaurants = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      return { success: true, data: restaurants };
    } catch (error) {
      console.error('Error searching restaurants:', error);
      return { success: false, error: 'Failed to search restaurants' };
    }
  }
};

// Menu API
export const menuApi = {
  async getMenu(restaurantId: string) {
    try {
      const menuRef = collection(db, `restaurants/${restaurantId}/menu`);
      const querySnapshot = await getDocs(menuRef);
      
      const menuItems = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      return { success: true, data: menuItems };
    } catch (error) {
      console.error('Error getting menu:', error);
      return { success: false, error: 'Failed to get menu' };
    }
  }
};

// Order API
export const orderApi = {
  async createOrder(orderData: any, userId: string) {
    try {
      const ordersRef = collection(db, 'orders');
      const newOrder = {
        ...orderData,
        userId: userId,
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      const docRef = await addDoc(ordersRef, newOrder);
      return { success: true, data: { id: docRef.id, ...newOrder } };
    } catch (error) {
      console.error('Error creating order:', error);
      return { success: false, error: 'Failed to create order' };
    }
  }
};