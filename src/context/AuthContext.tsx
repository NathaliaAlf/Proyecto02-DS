// context/AuthContext
import { restaurantApi } from "@/services/api/restaurantApi";
import { userApi } from "@/services/api/userApi";
import { restaurantRegistrationService } from "@/services/restaurantRegistrationService";
import { saveCustomerUser, saveRestaurantUser, saveUserIfNotExists } from "@/services/userService";
import { deleteItem, getItem, saveItem } from "@/utils/storage";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { jwtDecode } from "jwt-decode";
import React, { createContext, useContext, useEffect, useState } from "react";
import { Platform } from "react-native";

WebBrowser.maybeCompleteAuthSession();

const AUTH0_DOMAIN = process.env.EXPO_PUBLIC_AUTH0_DOMAIN!;
const AUTH0_CLIENT_ID = process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID!;

export type Auth0Profile = {
  sub: string;
  name?: string;
  email?: string;
  picture?: string;
  email_verified?: boolean;
  given_name?: string;
  family_name?: string;
  nickname?: string;
  locale?: string;
  updated_at?: string;
};

export type RestaurantData = {
  id: string;
  restaurantName: string;
  displayName: string;
  categories: string[];
  ingredients: string[];
  profileImage: string;
  headerImage: string;
  setupCompleted: boolean;
  description?: string;
  address?: string;
  phone?: string;
};

export type AppUser = {
  uid: string;
  name: string | null;
  email: string | null;
  picture: string | null;
  userType: 'customer' | 'restaurant' | 'admin';
  createdAt?: string;
  provider?: string;
  restaurantId?: string;
  restaurant?: RestaurantData | null;
};

type StoredTokens = {
  accessToken: string;
  idToken: string;
  expiresIn: number;
  issuedAt: number;
  refreshToken?: string;
};

type AuthContextType = {
  user: AppUser | null;
  login: (source?: 'web' | 'mobile') => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
  error: string | null;
  clearError: () => void;
  isLoggingIn: boolean;
  refreshUser: () => Promise<void>;
  getRestaurantData: () => Promise<RestaurantData | null>;
  registerAsCustomer: (auth0Profile: Auth0Profile, loginSource?: string) => Promise<void>;
  registerAsRestaurant: (auth0Profile: Auth0Profile, loginSource?: string) => Promise<void>;
  completeRestaurantProfile: (restaurantData: any) => Promise<boolean>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const discovery = {
  authorizationEndpoint: `https://${AUTH0_DOMAIN}/authorize`,
  tokenEndpoint: `https://${AUTH0_DOMAIN}/oauth/token`,
};

const isTokenExpired = (issuedAt: number, expiresIn: number): boolean => {
  const now = Math.floor(Date.now() / 1000);
  const buffer = 300; 
  return now > (issuedAt + expiresIn - buffer);
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const redirectUri = AuthSession.makeRedirectUri();
  console.log("REDIRECT URI:", redirectUri);

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: AUTH0_CLIENT_ID,
      redirectUri,
      scopes: ["openid", "profile", "email", "offline_access"],
      responseType: "code",
      usePKCE: true,
    },
    discovery
  );

  const fetchUserInfo = async (accessToken: string): Promise<Auth0Profile> => {
    const response = await fetch(`https://${AUTH0_DOMAIN}/userinfo`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    
    if (!response.ok) throw new Error('Failed to fetch user info');
    return await response.json();
  };

  const fetchRestaurantData = async (userId: string, restaurantId?: string): Promise<RestaurantData | null> => {
    if (!restaurantId) {
      // Try to get restaurant by user UID
      const restaurantResult = await restaurantApi.getRestaurantByUid(userId);
      if (restaurantResult.success && restaurantResult.data) {
        return {
          id: restaurantResult.data.id,
          restaurantName: restaurantResult.data.restaurantName,
          displayName: restaurantResult.data.displayName,
          categories: restaurantResult.data.categories,
          ingredients: restaurantResult.data.ingredients,
          profileImage: restaurantResult.data.profileImage,
          headerImage: restaurantResult.data.headerImage,
          setupCompleted: restaurantResult.data.setupCompleted,
          description: restaurantResult.data.description,
        };
      }
    } else {
      const restaurantResult = await restaurantApi.getRestaurant(restaurantId);
      if (restaurantResult.success && restaurantResult.data) {
        return {
          id: restaurantResult.data.id,
          restaurantName: restaurantResult.data.restaurantName,
          displayName: restaurantResult.data.displayName,
          categories: restaurantResult.data.categories,
          ingredients: restaurantResult.data.ingredients,
          profileImage: restaurantResult.data.profileImage,
          headerImage: restaurantResult.data.headerImage,
          setupCompleted: restaurantResult.data.setupCompleted,
          description: restaurantResult.data.description,
        };
      }
    }
    return null;
  };

  const exchangeToken = async (authCode: string, codeVerifier: string) => {
    try {
      const tokenResult = await AuthSession.exchangeCodeAsync(
        {
          clientId: AUTH0_CLIENT_ID,
          code: authCode,
          redirectUri,
          extraParams: { code_verifier: codeVerifier },
        },
        discovery
      );

      const userInfo = await fetchUserInfo(tokenResult.accessToken);
      
      // Get stored user type and login source
      const storedUserType = await getItem("userType") as 'customer' | 'restaurant' | null;
      const storedLoginSource = await getItem("loginSource") as 'web' | 'mobile' | null;
      
      // Default to platform-based if not stored
      const userType = storedUserType || (Platform.OS === 'web' ? 'restaurant' : 'customer');
      const loginSource = storedLoginSource || (Platform.OS === 'web' ? 'web' : 'mobile');
      
      // Clear stored values
      await deleteItem("userType");
      await deleteItem("loginSource");
      
      const storedTokens: StoredTokens = {
        accessToken: tokenResult.accessToken,
        idToken: tokenResult.idToken!,
        expiresIn: tokenResult.expiresIn || 3600,
        issuedAt: tokenResult.issuedAt || Math.floor(Date.now() / 1000),
        refreshToken: tokenResult.refreshToken,
      };

      await saveItem("authTokens", JSON.stringify(storedTokens));

      // Use the updated saveUserIfNotExists with explicit user type
      const appUser = await saveUserIfNotExists(userInfo, loginSource, userType);
      
      // If restaurant user on web, fetch restaurant data
      let restaurantData = null;
      if (userType === 'restaurant' && Platform.OS === 'web') {
        try {
          // Try to get restaurant data if exists
          const { restaurantApi } = await import('@/services/api/restaurantApi');
          const restaurantResult = await restaurantApi.getRestaurantByUid(appUser.uid);
          if (restaurantResult.success && restaurantResult.data) {
            restaurantData = restaurantResult.data;
          }
        } catch (error) {
          console.error('Error fetching restaurant data:', error);
        }
      }
      
      setUser({
        ...appUser,
        restaurant: restaurantData
      });
      setError(null);

    } catch (e) {
      console.error("Auth error:", e);
      setError("Authentication failed");
      setUser(null);
    } finally {
      setLoading(false);
      setIsLoggingIn(false);
    }
  };

  useEffect(() => {
    if (response?.type === "success" && request?.codeVerifier) {
      exchangeToken(response.params.code, request.codeVerifier);
    } else if (response?.type === "error" || response?.type === "dismiss") {
      // Handle user cancellation or error
      setIsLoggingIn(false);
      setLoading(false);
      if (response?.type === "error") {
        setError(response.error?.message || "Login cancelled");
      }
    }
  }, [response]);

  const restoreSession = async () => {
    try {
      const stored = await getItem("authTokens");
      if (!stored) {
        setLoading(false);
        return;
      }

      const tokens: StoredTokens = JSON.parse(stored);
      
      if (isTokenExpired(tokens.issuedAt, tokens.expiresIn)) {
        console.log("Token expired");
        await logout();
        return;
      }

      const auth0Profile = jwtDecode<Auth0Profile>(tokens.idToken);
      const firebaseUser = await saveUserIfNotExists(auth0Profile);
      
      // Fetch restaurant data if needed
      let restaurantData = null;
      if (firebaseUser.userType === 'restaurant') {
        restaurantData = await fetchRestaurantData(firebaseUser.uid, firebaseUser.restaurantId);
      }
      
      setUser({
        ...firebaseUser,
        restaurant: restaurantData
      });

    } catch (error) {
      console.error("Session restore error:", error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    restoreSession();
  }, []);

  const refreshUser = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const userResult = await userApi.getUserByUid(user.uid);
      
      if (userResult.success && userResult.data) {
        let restaurantData = null;
        if (userResult.data.userType === 'restaurant') {
          restaurantData = await fetchRestaurantData(user.uid, (userResult.data as any).restaurantId);
        }
        
        setUser({
          uid: userResult.data.uid,
          name: userResult.data.name,
          email: userResult.data.email,
          picture: userResult.data.picture || null,
          userType: userResult.data.userType,
          createdAt: userResult.data.createdAt,
          provider: userResult.data.provider,
          restaurantId: (userResult.data as any).restaurantId,
          restaurant: restaurantData
        });
      }
    } catch (error) {
      console.error("Error refreshing user:", error);
    } finally {
      setLoading(false);
    }
  };

  const getRestaurantData = async (): Promise<RestaurantData | null> => {
    if (!user || user.userType !== 'restaurant') return null;
    
    try {
      return await fetchRestaurantData(user.uid, user.restaurantId);
    } catch (error) {
      console.error("Error fetching restaurant data:", error);
      return null;
    }
  };

  const [pendingRestaurantRegistration, setPendingRestaurantRegistration] = useState<{
    auth0Profile: Auth0Profile | null;
    loginSource?: string;
  }>({ auth0Profile: null, loginSource: undefined });

  // Register as customer
  const registerAsCustomer = async (auth0Profile: Auth0Profile, loginSource?: string) => {
    try {
      setLoading(true);
      const appUser = await saveCustomerUser(auth0Profile, loginSource as any);
      setUser(appUser);
      setError(null);
    } catch (error) {
      console.error('Error registering customer:', error);
      setError('Registration failed');
    } finally {
      setLoading(false);
    }
  };

  // Register as restaurant (initial step - just user)
  const registerAsRestaurant = async (auth0Profile: Auth0Profile, loginSource?: string) => {
    try {
      setLoading(true);
      const appUser = await saveRestaurantUser(auth0Profile, loginSource as any);
      
      // Store the auth0Profile for the restaurant setup step
      setPendingRestaurantRegistration({
        auth0Profile,
        loginSource
      });
      
      setUser(appUser);
      setError(null);
      
      // Note: Restaurant setup is not complete yet
    } catch (error) {
      console.error('Error registering restaurant:', error);
      setError('Registration failed');
    } finally {
      setLoading(false);
    }
  };

  // Complete restaurant profile with details
  const completeRestaurantProfile = async (restaurantData: any): Promise<boolean> => {
    if (!user || !pendingRestaurantRegistration.auth0Profile) {
      setError('No pending restaurant registration');
      return false;
    }
    
    try {
      setLoading(true);
      
      const result = await restaurantRegistrationService.createRestaurantProfile(
        user.uid,
        restaurantData
      );
      
      if (result.success) {
        // Update user context with restaurant data
        const restaurantData = await fetchRestaurantData(user.uid);
        setUser({
          ...user,
          restaurant: restaurantData,
          restaurantId: result.data?.id
        });
        
        // Clear pending registration
        setPendingRestaurantRegistration({ auth0Profile: null });
        return true;
      } else {
        setError(result.error || 'Failed to complete restaurant registration');
        return false;
      }
    } catch (error) {
      console.error('Error completing restaurant profile:', error);
      setError('Registration completion failed');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const login = async (source?: 'web' | 'mobile') => {
    if (!request) {
      setError("Auth request not ready");
      return;
    }
    
    if (isLoggingIn) {
      console.log("Login already in progress");
      return;
    }
    
    try {
      setIsLoggingIn(true);
      setError(null);
      
      // Determine user type based on platform
      // Web = restaurant, Mobile = customer (based on your layout)
      const userType = Platform.OS === 'web' ? 'restaurant' : 'customer';
      const loginSource = source || (Platform.OS === 'web' ? 'web' : 'mobile');
      
      // Store user type and source
      await saveItem("userType", userType);
      await saveItem("loginSource", loginSource);
      
      const result = await promptAsync();
      
      if (result?.type === "error" || result?.type === "dismiss") {
        setIsLoggingIn(false);
        if (result?.type === "error") {
          setError(result.error?.message || "Login cancelled");
        }
      }
    } catch (error) {
      console.error("Login error:", error);
      setError("Failed to start login process");
      setIsLoggingIn(false);
    }
  };

  const logout = async () => {
    try {
      setUser(null);
      setIsLoggingIn(false);
      await deleteItem("authTokens");
      console.log('Logout successful');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearError = () => setError(null);

  useEffect(() => {
    if (__DEV__) {
      // @ts-ignore
      global.logout = logout;
    }
  }, []);

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      login, 
      logout, 
      error,
      clearError,
      isLoggingIn,
      refreshUser,
      getRestaurantData,
      registerAsCustomer,
      registerAsRestaurant,
      completeRestaurantProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside an AuthProvider");
  return context;
}