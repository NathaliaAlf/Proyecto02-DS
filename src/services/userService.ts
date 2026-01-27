// services/userService.ts
import { AppUser, Auth0Profile } from "@/context/AuthContext";
import { restaurantApi } from "@/services/api/restaurantApi";
import { userApi } from "@/services/api/userApi";
import { RestaurantCreateDTO } from "@/types/restaurant";
import { Platform } from "react-native";

// For customers
export const saveCustomerUser = async (
  auth0Profile: Auth0Profile, 
  loginSource?: 'web' | 'mobile'
): Promise<AppUser> => {
  try {
    const existingUser = await userApi.getUserByUid(auth0Profile.sub);
    
    if (existingUser.success && existingUser.data) {
      // Update last login
      await userApi.updateLastLogin(auth0Profile.sub);
      
      return {
        uid: existingUser.data.uid,
        name: existingUser.data.name,
        email: existingUser.data.email,
        picture: existingUser.data.picture || null,
        userType: 'customer',
        createdAt: existingUser.data.createdAt,
        provider: existingUser.data.provider
      };
    }
    
    // Create new customer user
    const userResult = await userApi.createUser({
      uid: auth0Profile.sub,
      email: auth0Profile.email || '',
      name: auth0Profile.name || '',
      picture: auth0Profile.picture,
      provider: 'auth0',
      userType: 'customer',
      emailVerified: auth0Profile.email_verified || false,
      loginSource: loginSource || 'web'
    });
    
    if (!userResult.success || !userResult.data) {
      throw new Error(userResult.error || 'Failed to create user');
    }
    
    const newUser = userResult.data;
    
    return {
      uid: newUser.uid,
      name: newUser.name,
      email: newUser.email,
      picture: newUser.picture || null,
      userType: 'customer',
      createdAt: newUser.createdAt,
      provider: newUser.provider
    };
    
  } catch (error) {
    console.error('Error saving customer user:', error);
    throw error;
  }
};

// For restaurants - initial signup (just user, no restaurant yet)
export const saveRestaurantUser = async (
  auth0Profile: Auth0Profile, 
  loginSource?: 'web' | 'mobile'
): Promise<AppUser> => {
  try {
    const existingUser = await userApi.getUserByUid(auth0Profile.sub);
    
    if (existingUser.success && existingUser.data) {
      // Update last login
      await userApi.updateLastLogin(auth0Profile.sub);
      
      return {
        uid: existingUser.data.uid,
        name: existingUser.data.name,
        email: existingUser.data.email,
        picture: existingUser.data.picture || null,
        userType: 'restaurant',
        createdAt: existingUser.data.createdAt,
        provider: existingUser.data.provider,
        restaurantId: (existingUser.data as any).restaurantId
      };
    }
    
    // Create new restaurant user (without restaurant data yet)
    const userResult = await userApi.createUser({
      uid: auth0Profile.sub,
      email: auth0Profile.email || '',
      name: auth0Profile.name || '',
      picture: auth0Profile.picture,
      provider: 'auth0',
      userType: 'restaurant',
      emailVerified: auth0Profile.email_verified || false,
      loginSource: loginSource || 'web'
    });
    
    if (!userResult.success || !userResult.data) {
      throw new Error(userResult.error || 'Failed to create user');
    }
    
    const newUser = userResult.data;
    
    return {
      uid: newUser.uid,
      name: newUser.name,
      email: newUser.email,
      picture: newUser.picture || null,
      userType: 'restaurant',
      createdAt: newUser.createdAt,
      provider: newUser.provider
    };
    
  } catch (error) {
    console.error('Error saving restaurant user:', error);
    throw error;
  }
};

// Complete restaurant registration with all details
export const completeRestaurantRegistration = async (
  uid: string,
  restaurantData: RestaurantCreateDTO
): Promise<{ success: boolean; data?: any; error?: string }> => {
  try {
    // First, get the user
    const userResult = await userApi.getUserByUid(uid);
    if (!userResult.success || !userResult.data) {
      return { success: false, error: 'User not found' };
    }
    
    // Create restaurant document
    const restaurantResult = await restaurantApi.createRestaurant({
      uid,
      restaurantName: restaurantData.restaurantName,
      displayName: restaurantData.displayName || restaurantData.restaurantName,
      categories: restaurantData.categories || [],
      ingredients: restaurantData.ingredients || [],
      profileImage: restaurantData.profileImage || '',
      headerImage: restaurantData.headerImage || '',
      setupCompleted: true
    });
    
    if (!restaurantResult.success) {
      return restaurantResult;
    }
    
    // Update user with restaurant reference
    const updateResult = await userApi.updateUser(userResult.data.id, {
      // We'll update the user to have the restaurantId
      // This might need a custom update function
    });
    
    return { 
      success: true, 
      data: { 
        user: userResult.data, 
        restaurant: restaurantResult.data 
      } 
    };
    
  } catch (error) {
    console.error('Error completing restaurant registration:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Registration failed' 
    };
  }
};

export const saveUserIfNotExists = async (
  auth0Profile: Auth0Profile, 
  loginSource?: 'web' | 'mobile',
  userType?: 'customer' | 'restaurant' // Add this parameter
): Promise<AppUser> => {
  try {
    // Use provided userType or determine from platform/login source
    const finalUserType = userType || 
      (loginSource === 'web' ? 'restaurant' : 'customer') ||
      (Platform.OS === 'web' ? 'restaurant' : 'customer');
    
    // Check if user already exists
    const existingUser = await userApi.getUserByUid(auth0Profile.sub);
    
    if (existingUser.success && existingUser.data) {
      // Update last login
      await userApi.updateLastLogin(auth0Profile.sub);
      
      const userData = existingUser.data;
      
      // Return user with existing data
      const appUser: AppUser = {
        uid: userData.uid,
        name: userData.name,
        email: userData.email,
        picture: userData.picture || null,
        userType: userData.userType,
        createdAt: userData.createdAt,
        provider: userData.provider,
        restaurantId: (userData as any).restaurantId
      };
      
      return appUser;
    }
    
    // Create new user with specified type
    const userResult = await userApi.createUser({
      uid: auth0Profile.sub,
      email: auth0Profile.email || '',
      name: auth0Profile.name || '',
      picture: auth0Profile.picture,
      provider: 'auth0',
      userType: finalUserType,
      emailVerified: auth0Profile.email_verified || false,
      loginSource: loginSource || (Platform.OS === 'web' ? 'web' : 'mobile')
    });
    
    if (!userResult.success || !userResult.data) {
      throw new Error(userResult.error || 'Failed to create user');
    }
    
    const newUser = userResult.data;
    
    // If restaurant user on web, create a basic restaurant document
    if (finalUserType === 'restaurant' && Platform.OS === 'web') {
      try {
        const { restaurantApi } = await import('@/services/api/restaurantApi');
        await restaurantApi.createRestaurant({
          uid: auth0Profile.sub,
          restaurantName: auth0Profile.name || 'My Restaurant',
          displayName: auth0Profile.name || 'My Restaurant',
          setupCompleted: false
        });
      } catch (error) {
        console.error('Error creating initial restaurant:', error);
        // Continue even if restaurant creation fails
      }
    }
    
    return {
      uid: newUser.uid,
      name: newUser.name,
      email: newUser.email,
      picture: newUser.picture || null,
      userType: newUser.userType,
      createdAt: newUser.createdAt,
      provider: newUser.provider,
      restaurantId: (newUser as any).restaurantId
    };
    
  } catch (error) {
    console.error('Error saving user:', error);
    throw error;
  }
};