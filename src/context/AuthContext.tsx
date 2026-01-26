import { saveUserIfNotExists } from "@/services/userService";
import { deleteItem, getItem, saveItem } from "@/utils/storage";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { jwtDecode } from "jwt-decode";
import React, { createContext, useContext, useEffect, useState } from "react";

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

export type AppUser = {
  uid: string;
  name: string | null;
  email: string | null;
  photoURL: string | null;
  userType: 'client' | 'restaurant' | 'admin';
  setupCompleted?: boolean;
  restaurantName?: string;
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
      
      // Get login source from storage
      const loginSource = await getItem("loginSource") as 'web' | 'mobile' | null;
      
      // Clear the stored source
      await deleteItem("loginSource");
      
      const storedTokens: StoredTokens = {
        accessToken: tokenResult.accessToken,
        idToken: tokenResult.idToken!,
        expiresIn: tokenResult.expiresIn || 3600,
        issuedAt: tokenResult.issuedAt || Math.floor(Date.now() / 1000),
        refreshToken: tokenResult.refreshToken,
      };

      await saveItem("authTokens", JSON.stringify(storedTokens));

      // Pass login source to saveUserIfNotExists
      const appUser = await saveUserIfNotExists(userInfo, loginSource || undefined);
      setUser(appUser);
      setError(null);

    } catch (e) {
      console.error("Auth error:", e);
      setError("Authentication failed");
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (response?.type !== "success" || !request?.codeVerifier) return;
    exchangeToken(response.params.code, request.codeVerifier);
  }, [response]);

  const restoreSession = async () => {
    try {
      const stored = await getItem("authTokens");
      if (!stored) return;

      const tokens: StoredTokens = JSON.parse(stored);
      
      if (isTokenExpired(tokens.issuedAt, tokens.expiresIn)) {
        console.log("Token expired");
        await logout();
        return;
      }

      const auth0Profile = jwtDecode<Auth0Profile>(tokens.idToken);
      const firebaseUser = await saveUserIfNotExists(auth0Profile);
      setUser(firebaseUser);

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

  const login = async (source?: 'web' | 'mobile') => {
    if (!request) {
      setError("Auth request not ready");
      return;
    }
    
    try {
      setError(null);
      await promptAsync();
      
      // Store the login source temporarily
      if (source) {
        await saveItem("loginSource", source);
      }
    } catch (error) {
      console.error("Login error:", error);
      setError("Failed to start login process");
    }
  };


  const logout = async () => {
    try {
      setUser(null);
      
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
      clearError 
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