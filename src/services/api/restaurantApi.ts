import { db } from '@/config/firebase';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  updateDoc,
  where
} from 'firebase/firestore';

import {
  Restaurant,
  RestaurantCreateDTO,
  RestaurantUpdateDTO
} from '@/types/restaurant';

export const restaurantApi = {
  // Get restaurant by ID
  async getRestaurant(id: string): Promise<{ success: boolean; data?: Restaurant; error?: string }> {
    try {
      const restaurantRef = doc(db, 'restaurants', id);
      const restaurantSnap = await getDoc(restaurantRef);
      
      if (restaurantSnap.exists()) {
        const restaurantData = restaurantSnap.data();
        const restaurant: Restaurant = {
          id: restaurantSnap.id,
          uid: restaurantData.uid,
          restaurantName: restaurantData.restaurantName,
          displayName: restaurantData.displayName,
          categories: restaurantData.categories || [],
          ingredients: restaurantData.ingredients || [],
          profileImage: restaurantData.profileImage,
          headerImage: restaurantData.headerImage,
          setupCompleted: restaurantData.setupCompleted,
          createdAt: restaurantData.createdAt,
          lastUpdated: restaurantData.lastUpdated,
          description: restaurantData.description,
        };
        
        return { success: true, data: restaurant };
      } else {
        return { success: false, error: 'Restaurant not found' };
      }
    } catch (error) {
      console.error('Error getting restaurant:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get restaurant' 
      };
    }
  },

  // Get restaurant by user UID
  async getRestaurantByUid(uid: string): Promise<{ success: boolean; data?: Restaurant; error?: string }> {
    try {
      const restaurantsRef = collection(db, 'restaurants');
      const q = query(restaurantsRef, where('uid', '==', uid), limit(1));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const docSnap = querySnapshot.docs[0];
        const restaurantData = docSnap.data();
        const restaurant: Restaurant = {
          id: docSnap.id,
          uid: restaurantData.uid,
          restaurantName: restaurantData.restaurantName,
          displayName: restaurantData.displayName,
          categories: restaurantData.categories || [],
          ingredients: restaurantData.ingredients || [],
          profileImage: restaurantData.profileImage,
          headerImage: restaurantData.headerImage,
          setupCompleted: restaurantData.setupCompleted,
          createdAt: restaurantData.createdAt,
          lastUpdated: restaurantData.lastUpdated,
          description: restaurantData.description,
        };
        
        return { success: true, data: restaurant };
      } else {
        return { success: false, error: 'Restaurant not found' };
      }
    } catch (error) {
      console.error('Error getting restaurant by UID:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get restaurant' 
      };
    }
  },

  // Create a new restaurant
  async createRestaurant(
    restaurantData: RestaurantCreateDTO
  ): Promise<{ success: boolean; data?: Restaurant; error?: string }> {
    try {
      // Check if restaurant already exists for this user
      const existingRestaurant = await this.getRestaurantByUid(restaurantData.uid);
      if (existingRestaurant.success) {
        return { 
          success: false, 
          error: 'Restaurant already exists for this user. Use updateRestaurant instead.' 
        };
      }
      
      const restaurantsRef = collection(db, 'restaurants');
      const newRestaurant = {
        uid: restaurantData.uid,
        restaurantName: restaurantData.restaurantName,
        displayName: restaurantData.displayName || restaurantData.restaurantName,
        categories: restaurantData.categories || [],
        ingredients: restaurantData.ingredients || [],
        profileImage: restaurantData.profileImage || '',
        headerImage: restaurantData.headerImage || '',
        setupCompleted: restaurantData.setupCompleted || false,
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        rating: 0,
        totalReviews: 0
      };
      
      console.log('Creating new restaurant:', newRestaurant);
      
      const docRef = await addDoc(restaurantsRef, newRestaurant);
      
      const createdRestaurant: Restaurant = {
        id: docRef.id,
        ...newRestaurant
      };
      
      return { success: true, data: createdRestaurant };
    } catch (error) {
      console.error('Error creating restaurant:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create restaurant' 
      };
    }
  },

  // Update restaurant
  async updateRestaurant(
    id: string, 
    updateData: RestaurantUpdateDTO
  ): Promise<{ success: boolean; data?: Restaurant; error?: string }> {
    try {
      console.log(`Updating restaurant ${id} with data:`, updateData);
      
      const restaurantRef = doc(db, 'restaurants', id);
      
      // First, get the existing restaurant
      const restaurantSnap = await getDoc(restaurantRef);
      if (!restaurantSnap.exists()) {
        console.log(`Restaurant ${id} not found`);
        return { success: false, error: 'Restaurant not found' };
      }
      
      const updatePayload = {
        ...updateData,
        lastUpdated: new Date().toISOString()
      };
      
      console.log('Update payload:', updatePayload);
      
      await updateDoc(restaurantRef, updatePayload);
      
      // Get updated restaurant data
      const updatedSnap = await getDoc(restaurantRef);
      const updatedData = updatedSnap.data();
      
      console.log('Updated restaurant data:', updatedData);
      
      const updatedRestaurant: Restaurant = {
        id: updatedSnap.id,
        uid: updatedData!.uid,
        restaurantName: updatedData!.restaurantName,
        displayName: updatedData!.displayName,
        categories: updatedData!.categories || [],
        ingredients: updatedData!.ingredients || [],
        profileImage: updatedData!.profileImage,
        headerImage: updatedData!.headerImage,
        setupCompleted: updatedData!.setupCompleted,
        createdAt: updatedData!.createdAt,
        lastUpdated: updatedData!.lastUpdated,
        description: updatedData!.description,
      };
      
      console.log('Returning updated restaurant:', updatedRestaurant);
      
      return { success: true, data: updatedRestaurant };
    } catch (error) {
      console.error('Error updating restaurant:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update restaurant' 
      };
    }
  },

  // Delete restaurant
  async deleteRestaurant(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const restaurantRef = doc(db, 'restaurants', id);
      await deleteDoc(restaurantRef);
      return { success: true };
    } catch (error) {
      console.error('Error deleting restaurant:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to delete restaurant' 
      };
    }
  },

  // Get all restaurants
  async getAllRestaurants(): Promise<{ success: boolean; data?: Restaurant[]; error?: string }> {
    try {
      const restaurantsRef = collection(db, 'restaurants');
      const q = query(restaurantsRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const restaurants: Restaurant[] = querySnapshot.docs.map(docSnap => {
        const restaurantData = docSnap.data();
        return {
          id: docSnap.id,
          uid: restaurantData.uid,
          restaurantName: restaurantData.restaurantName,
          displayName: restaurantData.displayName,
          categories: restaurantData.categories || [],
          ingredients: restaurantData.ingredients || [],
          profileImage: restaurantData.profileImage,
          headerImage: restaurantData.headerImage,
          setupCompleted: restaurantData.setupCompleted,
          createdAt: restaurantData.createdAt,
          lastUpdated: restaurantData.lastUpdated,
          description: restaurantData.description,
          address: restaurantData.address,
          phone: restaurantData.phone,
          hours: restaurantData.hours,
          rating: restaurantData.rating,
          totalReviews: restaurantData.totalReviews
        };
      });
      
      return { success: true, data: restaurants };
    } catch (error) {
      console.error('Error getting all restaurants:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get restaurants' 
      };
    }
  },

  // Get restaurants by category
  async getRestaurantsByCategory(categoryId: string): Promise<{ success: boolean; data?: Restaurant[]; error?: string }> {
    try {
      const restaurantsRef = collection(db, 'restaurants');
      const q = query(
        restaurantsRef,
        where('categories', 'array-contains', categoryId)
      );
      
      const querySnapshot = await getDocs(q);
      const restaurants: Restaurant[] = querySnapshot.docs.map(docSnap => {
        const restaurantData = docSnap.data();
        return {
          id: docSnap.id,
          uid: restaurantData.uid,
          restaurantName: restaurantData.restaurantName,
          displayName: restaurantData.displayName,
          categories: restaurantData.categories || [],
          ingredients: restaurantData.ingredients || [],
          profileImage: restaurantData.profileImage,
          headerImage: restaurantData.headerImage,
          setupCompleted: restaurantData.setupCompleted,
          createdAt: restaurantData.createdAt,
          lastUpdated: restaurantData.lastUpdated,
          description: restaurantData.description,
          address: restaurantData.address,
          phone: restaurantData.phone,
          hours: restaurantData.hours,
          rating: restaurantData.rating,
          totalReviews: restaurantData.totalReviews
        };
      });
      
      return { success: true, data: restaurants };
    } catch (error) {
      console.error('Error getting restaurants by category:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get restaurants' 
      };
    }
  },

  // Search restaurants
  async searchRestaurants(searchTerm: string): Promise<{ success: boolean; data?: Restaurant[]; error?: string }> {
    try {
      console.log(`[restaurantApi] Searching restaurants for: "${searchTerm}"`);
      
      if (!searchTerm.trim()) {
        console.log('[restaurantApi] Empty search term, returning empty array');
        return { success: true, data: [] };
      }
      
      const restaurantsRef = collection(db, 'restaurants');
      const lowercaseSearchTerm = searchTerm.toLowerCase();
      
      // Firestore doesn't support case-insensitive search directly
      // We need to store a lowercase version or query differently
      const q = query(
        restaurantsRef,
        where('restaurantNameLowercase', '>=', lowercaseSearchTerm),
        where('restaurantNameLowercase', '<=', lowercaseSearchTerm + '\uf8ff'),
        limit(20)
      );
      
      console.log('[restaurantApi] Firestore query created');
      const querySnapshot = await getDocs(q);
      console.log(`[restaurantApi] Query returned ${querySnapshot.size} documents`);
      
      const restaurants: Restaurant[] = querySnapshot.docs.map(docSnap => {
        const restaurantData = docSnap.data();
        console.log(`[restaurantApi] Processing restaurant: ${restaurantData.restaurantName}`);
        return {
          id: docSnap.id,
          uid: restaurantData.uid,
          restaurantName: restaurantData.restaurantName,
          displayName: restaurantData.displayName,
          categories: restaurantData.categories || [],
          ingredients: restaurantData.ingredients || [],
          profileImage: restaurantData.profileImage,
          headerImage: restaurantData.headerImage,
          setupCompleted: restaurantData.setupCompleted,
          createdAt: restaurantData.createdAt,
          lastUpdated: restaurantData.lastUpdated,
          description: restaurantData.description,
          address: restaurantData.address,
          phone: restaurantData.phone,
          hours: restaurantData.hours,
          rating: restaurantData.rating,
          totalReviews: restaurantData.totalReviews
        };
      });
      
      console.log(`[restaurantApi] Returning ${restaurants.length} restaurants`);
      return { success: true, data: restaurants };
    } catch (error) {
      console.error('[restaurantApi] Error searching restaurants:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to search restaurants' 
      };
    }
  },

  // Update restaurant rating
  async updateRating(id: string, newRating: number): Promise<{ success: boolean; error?: string }> {
    try {
      const restaurantRef = doc(db, 'restaurants', id);
      const restaurantSnap = await getDoc(restaurantRef);
      
      if (!restaurantSnap.exists()) {
        return { success: false, error: 'Restaurant not found' };
      }
      
      const currentData = restaurantSnap.data();
      const currentRating = currentData.rating || 0;
      const totalReviews = currentData.totalReviews || 0;
      
      // Calculate new average rating
      const updatedTotalReviews = totalReviews + 1;
      const updatedRating = ((currentRating * totalReviews) + newRating) / updatedTotalReviews;
      
      await updateDoc(restaurantRef, {
        rating: updatedRating,
        totalReviews: updatedTotalReviews,
        lastUpdated: new Date().toISOString()
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error updating restaurant rating:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update rating' 
      };
    }
  }
};