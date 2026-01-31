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
  CustomerUser,
  RestaurantUser,
  User,
  UserCreateDTO,
  UserUpdateDTO
} from '@/types/user';

export const userApi = {
  // Get user by ID
  async getUser(id: string): Promise<{ success: boolean; data?: User; error?: string }> {
    try {
      const userRef = doc(db, 'users', id);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const userData = userSnap.data();
        const user: User = {
          id: userSnap.id,
          uid: userData.uid,
          email: userData.email,
          name: userData.name,
          picture: userData.picture,
          provider: userData.provider,
          userType: userData.userType,
          emailVerified: userData.emailVerified,
          lastLogin: userData.lastLogin,
          loginSource: userData.loginSource,
          createdAt: userData.createdAt,
          updatedAt: userData.updatedAt,
          customerId: userData.customerId || undefined, // Add this
          restaurantId: userData.restaurantId || undefined // Add this
        };
        
        // Add type-specific fields
        if (userData.userType === 'restaurant') {
          (user as RestaurantUser).restaurantId = userData.restaurantId;
        }
        
        return { success: true, data: user };
      } else {
        return { success: false, error: 'User not found' };
      }
    } catch (error) {
      console.error('Error getting user:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get user' 
      };
    }
  },

  // Get user by UID (auth ID)
  async getUserByUid(uid: string): Promise<{ success: boolean; data?: User; error?: string }> {
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('uid', '==', uid), limit(1));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const docSnap = querySnapshot.docs[0];
        const userData = docSnap.data();
        const user: User = {
          id: docSnap.id,
          uid: userData.uid,
          email: userData.email,
          name: userData.name,
          picture: userData.picture,
          provider: userData.provider,
          userType: userData.userType,
          emailVerified: userData.emailVerified,
          lastLogin: userData.lastLogin,
          loginSource: userData.loginSource,
          createdAt: userData.createdAt,
          updatedAt: userData.updatedAt,
          customerId: userData.customerId || undefined, // Add this
          restaurantId: userData.restaurantId || undefined // Add this
        };
        
        if (userData.userType === 'restaurant') {
          (user as RestaurantUser).restaurantId = userData.restaurantId;
        }
        
        return { success: true, data: user };
      } else {
        return { success: false, error: 'User not found' };
      }
    } catch (error) {
      console.error('Error getting user by UID:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get user' 
      };
    }
  },

  // Create a new user
  async createUser(userData: UserCreateDTO): Promise<{ success: boolean; data?: User; error?: string }> {
    try {
      // Check if user already exists
      const existingUser = await this.getUserByUid(userData.uid);
      if (existingUser.success) {
        return { 
          success: false, 
          error: 'User already exists' 
        };
      }
      
      const usersRef = collection(db, 'users');
      const newUser = {
        uid: userData.uid,
        email: userData.email,
        name: userData.name,
        picture: userData.picture,
        provider: userData.provider,
        userType: userData.userType,
        emailVerified: userData.emailVerified || false,
        lastLogin: new Date().toISOString(),
        loginSource: userData.loginSource || 'web',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        customerId: userData.customerId || null,
        restaurantId: userData.restaurantId || null
      };
      
      const docRef = await addDoc(usersRef, newUser);
      
      // Create the user object based on user type
      let createdUser: User;
      
      if (newUser.userType === 'restaurant') {
        createdUser = {
          id: docRef.id,
          uid: newUser.uid,
          email: newUser.email,
          name: newUser.name,
          picture: newUser.picture,
          provider: newUser.provider,
          userType: 'restaurant',
          emailVerified: newUser.emailVerified,
          lastLogin: newUser.lastLogin,
          loginSource: newUser.loginSource,
          createdAt: newUser.createdAt,
          updatedAt: newUser.updatedAt,
          restaurantId: newUser.restaurantId
        } as RestaurantUser;
      } else {
        // Customer user
        createdUser = {
          id: docRef.id,
          uid: newUser.uid,
          email: newUser.email,
          name: newUser.name,
          picture: newUser.picture,
          provider: newUser.provider,
          userType: 'customer',
          emailVerified: newUser.emailVerified,
          lastLogin: newUser.lastLogin,
          loginSource: newUser.loginSource,
          createdAt: newUser.createdAt,
          updatedAt: newUser.updatedAt,
          customerId: newUser.customerId
        } as CustomerUser;
      }
      
      return { success: true, data: createdUser };
    } catch (error) {
      console.error('Error creating user:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create user' 
      };
    }
  },

  // Update user
  async updateUser(
    id: string, 
    updateData: UserUpdateDTO
  ): Promise<{ success: boolean; data?: User; error?: string }> {
    try {
      const userRef = doc(db, 'users', id);
      
      // First, get the existing user
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        return { success: false, error: 'User not found' };
      }
      
      const updatePayload: any = {
        ...updateData,
        updatedAt: new Date().toISOString()
      };
      
      // Only update lastLogin if explicitly provided
      if (updateData.lastLogin) {
        updatePayload.lastLogin = updateData.lastLogin;
      }
      
      await updateDoc(userRef, updatePayload);
      
      // Get updated user data
      const updatedSnap = await getDoc(userRef);
      const updatedData = updatedSnap.data();
      
      const updatedUser: User = {
        id: updatedSnap.id,
        uid: updatedData!.uid,
        email: updatedData!.email,
        name: updatedData!.name,
        picture: updatedData!.picture,
        provider: updatedData!.provider,
        userType: updatedData!.userType,
        emailVerified: updatedData!.emailVerified,
        lastLogin: updatedData!.lastLogin,
        loginSource: updatedData!.loginSource,
        createdAt: updatedData!.createdAt,
        updatedAt: updatedData!.updatedAt,
        customerId: updatedData!.customerId || undefined, // Add this
        restaurantId: updatedData!.restaurantId || undefined // Add this
      };
      
      if (updatedData!.userType === 'restaurant') {
        (updatedUser as RestaurantUser).restaurantId = updatedData!.restaurantId;
      }
      
      return { success: true, data: updatedUser };
    } catch (error) {
      console.error('Error updating user:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update user' 
      };
    }
  },

  // Update last login timestamp
  async updateLastLogin(uid: string): Promise<{ success: boolean; error?: string }> {
    try {
      const userResult = await this.getUserByUid(uid);
      if (!userResult.success || !userResult.data) {
        return { success: false, error: 'User not found' };
      }
      
      const userRef = doc(db, 'users', userResult.data.id);
      await updateDoc(userRef, {
        lastLogin: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error updating last login:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update last login' 
      };
    }
  },

  // Delete user
  async deleteUser(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const userRef = doc(db, 'users', id);
      await deleteDoc(userRef);
      return { success: true };
    } catch (error) {
      console.error('Error deleting user:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to delete user' 
      };
    }
  },

  // Get all users (admin only)
  async getAllUsers(): Promise<{ success: boolean; data?: User[]; error?: string }> {
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const users: User[] = querySnapshot.docs.map(docSnap => {
        const userData = docSnap.data();
        const user: User = {
          id: docSnap.id,
          uid: userData.uid,
          email: userData.email,
          name: userData.name,
          picture: userData.picture,
          provider: userData.provider,
          userType: userData.userType,
          emailVerified: userData.emailVerified,
          lastLogin: userData.lastLogin,
          loginSource: userData.loginSource,
          createdAt: userData.createdAt,
          updatedAt: userData.updatedAt
        };
        
        if (userData.userType === 'restaurant') {
          (user as RestaurantUser).restaurantId = userData.restaurantId;
        }
        
        return user;
      });
      
      return { success: true, data: users };
    } catch (error) {
      console.error('Error getting all users:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get users' 
      };
    }
  },

  // Search users by email or name
  async searchUsers(searchTerm: string): Promise<{ success: boolean; data?: User[]; error?: string }> {
    try {
      const usersRef = collection(db, 'users');
      
      // You might need to create composite indexes for these queries
      const q = query(
        usersRef,
        where('email', '>=', searchTerm.toLowerCase()),
        where('email', '<=', searchTerm.toLowerCase() + '\uf8ff'),
        limit(20)
      );
      
      const querySnapshot = await getDocs(q);
      const users: User[] = querySnapshot.docs.map(docSnap => {
        const userData = docSnap.data();
        const user: User = {
          id: docSnap.id,
          uid: userData.uid,
          email: userData.email,
          name: userData.name,
          picture: userData.picture,
          provider: userData.provider,
          userType: userData.userType,
          emailVerified: userData.emailVerified,
          lastLogin: userData.lastLogin,
          loginSource: userData.loginSource,
          createdAt: userData.createdAt,
          updatedAt: userData.updatedAt
        };
        
        if (userData.userType === 'restaurant') {
          (user as RestaurantUser).restaurantId = userData.restaurantId;
        }
        
        return user;
      });
      
      return { success: true, data: users };
    } catch (error) {
      console.error('Error searching users:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to search users' 
      };
    }
  }
};
