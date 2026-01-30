// services/userService.ts
import { Auth0Profile } from '@/context/AuthContext';
import { customerApi } from '@/services/api/customerApi';
import { userApi } from '@/services/api/userApi';
import { UserCreateDTO, UserUpdateDTO } from '@/types/user'; // Make sure this import is correct

export interface AppUser {
  uid: string;
  name: string | null;
  email: string | null;
  picture: string | null;
  userType: 'customer' | 'restaurant' | 'admin';
  createdAt?: string;
  provider?: string;
  restaurantId?: string;
  customerId?: string;
}

export async function saveUserIfNotExists(
  auth0Profile: Auth0Profile,
  loginSource?: string,
  userType?: 'customer' | 'restaurant'
): Promise<AppUser> {
  try {
    console.log('saveUserIfNotExists called:', {
      uid: auth0Profile.sub,
      userType,
      loginSource
    });

    // Check if user already exists
    const existingUser = await userApi.getUserByUid(auth0Profile.sub);
    
    if (existingUser.success && existingUser.data) {
      console.log('User already exists, updating last login');
      
      // Update last login
      await userApi.updateLastLogin(auth0Profile.sub);
      
      // Return existing user
      const user = existingUser.data;
      
      // For existing users, ensure they have customer record if they're a customer
      if (user.userType === 'customer' && !user.customerId) {
        console.log('Existing customer user without customerId, creating customer record...');
        const customerResult = await ensureCustomerRecordExists(auth0Profile, user);
        if (customerResult.customerId) {
          // Update user with customerId
          const updateData: UserUpdateDTO = {
            customerId: customerResult.customerId
          };
          await userApi.updateUser(user.id, updateData);
          
          return {
            uid: user.uid,
            name: user.name,
            email: user.email,
            picture: user.picture || null,
            userType: user.userType,
            createdAt: user.createdAt,
            provider: user.provider,
            restaurantId: user.restaurantId,
            customerId: customerResult.customerId
          };
        }
      }
      
      return {
        uid: user.uid,
        name: user.name,
        email: user.email,
        picture: user.picture || null,
        userType: user.userType,
        createdAt: user.createdAt,
        provider: user.provider,
        restaurantId: user.restaurantId,
        customerId: user.customerId
      };
    }
    
    console.log('Creating new user with type:', userType);
    
    // Create new user based on userType
    if (userType === 'restaurant') {
      return await saveRestaurantUser(auth0Profile, loginSource);
    } else {
      // Default to customer if not specified
      return await saveCustomerUser(auth0Profile, loginSource || 'mobile');
    }
    
  } catch (error) {
    console.error('Error in saveUserIfNotExists:', error);
    throw error;
  }
}

// Helper function to ensure customer record exists
async function ensureCustomerRecordExists(
  auth0Profile: Auth0Profile,
  existingUser: any
): Promise<{ customerId?: string; error?: string }> {
  try {
    // Check if customer already exists by UID
    const customerResult = await customerApi.getCustomerByUid(auth0Profile.sub);
    
    if (customerResult.success && customerResult.data) {
      console.log('Customer record already exists:', customerResult.data.id);
      return { customerId: customerResult.data.id };
    }
    
    // Create new customer record
    console.log('Creating new customer record for user:', auth0Profile.sub);
    const newCustomerResult = await customerApi.createCustomer({
      uid: auth0Profile.sub,
      email: auth0Profile.email || existingUser.email || '',
      name: auth0Profile.name || existingUser.name || 'Customer',
      phone: '', // Can be added later
      address: '' // Can be added later
    });
    
    if (newCustomerResult.success && newCustomerResult.data) {
      console.log('Customer record created:', newCustomerResult.data.id);
      return { customerId: newCustomerResult.data.id };
    } else {
      console.error('Failed to create customer record:', newCustomerResult.error);
      return { error: newCustomerResult.error };
    }
  } catch (error) {
    console.error('Error in ensureCustomerRecordExists:', error);
    return { error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function saveCustomerUser(
  auth0Profile: Auth0Profile,
  loginSource?: string
): Promise<AppUser> {
  try {
    console.log('saveCustomerUser called:', {
      uid: auth0Profile.sub,
      loginSource
    });

    // First create customer record
    const customerResult = await customerApi.createCustomer({
      uid: auth0Profile.sub,
      email: auth0Profile.email || '',
      name: auth0Profile.name || auth0Profile.nickname || 'Customer',
      phone: '', // Can be added later
      address: '' // Can be added later
    });
    
    let customerId: string | undefined;
    
    if (customerResult.success && customerResult.data) {
      console.log('Customer created successfully:', customerResult.data.id);
      customerId = customerResult.data.id;
    } else {
      console.error('Failed to create customer:', customerResult.error);
      // Continue without customerId for now
    }

    // Create user in users collection with customerId
    const userCreateData: UserCreateDTO = {
      uid: auth0Profile.sub,
      email: auth0Profile.email || '',
      name: auth0Profile.name || auth0Profile.nickname || 'Customer',
      picture: auth0Profile.picture,
      provider: 'auth0',
      userType: 'customer',
      emailVerified: auth0Profile.email_verified || false,
      loginSource: loginSource || 'mobile',
      customerId: customerId // Include customerId if available
    };
    
    const userResult = await userApi.createUser(userCreateData);
    
    if (!userResult.success || !userResult.data) {
      console.error('Failed to create user:', userResult.error);
      throw new Error(userResult.error || 'Failed to create user');
    }
    
    console.log('User created successfully:', userResult.data.id);
    
    return {
      uid: userResult.data.uid,
      name: userResult.data.name,
      email: userResult.data.email,
      picture: userResult.data.picture || null,
      userType: userResult.data.userType,
      createdAt: userResult.data.createdAt,
      provider: userResult.data.provider,
      customerId: userResult.data.customerId
    };
  } catch (error) {
    console.error('Error saving customer user:', error);
    throw error;
  }
}

export async function saveRestaurantUser(
  auth0Profile: Auth0Profile,
  loginSource?: string
): Promise<AppUser> {
  try {
    console.log('saveRestaurantUser called:', {
      uid: auth0Profile.sub,
      loginSource
    });

    // Create user in users collection
    const userCreateData: UserCreateDTO = {
      uid: auth0Profile.sub,
      email: auth0Profile.email || '',
      name: auth0Profile.name || auth0Profile.nickname || 'Restaurant Owner',
      picture: auth0Profile.picture,
      provider: 'auth0',
      userType: 'restaurant',
      emailVerified: auth0Profile.email_verified || false,
      loginSource: loginSource || 'web'
    };
    
    const userResult = await userApi.createUser(userCreateData);
    
    if (!userResult.success || !userResult.data) {
      console.error('Failed to create restaurant user:', userResult.error);
      throw new Error(userResult.error || 'Failed to create restaurant user');
    }
    
    console.log('Restaurant user created successfully:', userResult.data.id);
    
    return {
      uid: userResult.data.uid,
      name: userResult.data.name,
      email: userResult.data.email,
      picture: userResult.data.picture || null,
      userType: userResult.data.userType,
      createdAt: userResult.data.createdAt,
      provider: userResult.data.provider,
      restaurantId: userResult.data.restaurantId
    };
  } catch (error) {
    console.error('Error saving restaurant user:', error);
    throw error;
  }
}

// New helper function to sync customer data
export async function syncCustomerData(
  userId: string,
  customerId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get user data
    const userResult = await userApi.getUser(userId);
    if (!userResult.success || !userResult.data) {
      return { success: false, error: 'User not found' };
    }
    
    const user = userResult.data;
    
    // Update customer record with latest user data
    await customerApi.updateCustomer(customerId, {
      name: user.name,
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error syncing customer data:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to sync customer data' 
    };
  }
}

// Function to get complete user data including customer/restaurant details
export async function getCompleteUserData(
  uid: string
): Promise<{ 
  success: boolean; 
  data?: AppUser & { customer?: any; restaurant?: any }; 
  error?: string 
}> {
  try {
    // Get base user
    const userResult = await userApi.getUserByUid(uid);
    if (!userResult.success || !userResult.data) {
      return { success: false, error: userResult.error };
    }
    
    const user = userResult.data;
    const appUser: AppUser = {
      uid: user.uid,
      name: user.name,
      email: user.email,
      picture: user.picture || null,
      userType: user.userType,
      createdAt: user.createdAt,
      provider: user.provider,
      restaurantId: user.restaurantId,
      customerId: user.customerId
    };
    
    const result: AppUser & { customer?: any; restaurant?: any } = appUser;
    
    // Get additional data based on user type
    if (user.userType === 'customer' && user.customerId) {
      const customerResult = await customerApi.getCustomer(user.customerId);
      if (customerResult.success) {
        result.customer = customerResult.data;
      }
    } else if (user.userType === 'restaurant') {
      // Import restaurantApi only when needed
      const { restaurantApi } = await import('@/services/api/restaurantApi');
      const restaurantResult = await restaurantApi.getRestaurantByUid(uid);
      if (restaurantResult.success) {
        result.restaurant = restaurantResult.data;
      }
    }
    
    return { success: true, data: result };
  } catch (error) {
    console.error('Error getting complete user data:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to get user data' 
    };
  }
}