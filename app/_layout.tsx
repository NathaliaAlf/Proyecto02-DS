import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useFonts } from 'expo-font';
import { router, Stack, useRootNavigationState, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Text, View } from 'react-native';
import 'react-native-reanimated';

import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('@/assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) return null;

  return (
    <ThemeProvider>
      <AuthProvider>
        <RootLayoutNav />
      </AuthProvider>
    </ThemeProvider>
  );
}

function RootLayoutNav() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const navigationState = useRootNavigationState();
  const isWeb = Platform.OS === 'web';
  const [isCheckingSetup, setIsCheckingSetup] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    const checkNavigation = async () => {
      // Wait for navigation to be ready and auth to load
      if (loading || !navigationState?.key) {
        return;
      }

      // Prevent multiple checks
      if (hasChecked) {
        return;
      }

      console.log('Navigation check:', {
        hasUser: !!user?.uid,
        userUid: user?.uid,
        currentPath: segments.join('/'),
        isWeb: isWeb,
        inAuthGroup: isWeb ? segments[0] === '(auth-web)' : segments[0] === '(auth-mobile)'
      });

      const inAuthGroup = isWeb 
        ? segments[0] === '(auth-web)' 
        : segments[0] === '(auth-mobile)';
      
      const webLoginPath = '/(auth-web)/login';
      const mobileLoginPath = '/(auth-mobile)/login';
      const webAppPath = '/(web)';
      const mobileAppPath = '/(mobile)';

      // No user, go to login
      if (!user) {
        setHasChecked(true);
        if (!inAuthGroup) {
          console.log('No user, redirecting to login');
          const loginPath = isWeb ? webLoginPath : mobileLoginPath;
          router.replace(loginPath);
        }
        return;
      }

      // User exists, check user type and setup status
      setIsCheckingSetup(true);
      
      try {
        // Import Firebase
        const { getApps } = await import('firebase/app');
        
        if (getApps().length > 0) {
          const { doc, getDoc } = await import('firebase/firestore');
          const { getFirestore } = await import('firebase/firestore');
          const { getApp } = await import('firebase/app');
          
          const app = getApp();
          const db = getFirestore(app);
          
          const userDocRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            const userType = userData?.userType || 'client';
            
            console.log('User data found:', {
              userType: userType,
              setupCompleted: userData?.setupCompleted
            });

            if (userType === 'restaurant') {
              // Restaurant
              if (!isWeb) {
                console.log('Restaurant user on mobile, staying on mobile for now');
                // redirect to mobile app
                if (inAuthGroup) {
                  router.replace(mobileAppPath);
                }
                return;
              }
              
              // Web restaurant user flow
              const isSetupComplete = userData?.setupCompleted === true;
              
              if (isSetupComplete) {
                // go to restaurant app (web)
                if (inAuthGroup) {
                  console.log('Restaurant setup complete, going to web app');
                  router.replace(webAppPath);
                }
              } else {
                // Setup incomplete
                const currentScreen = segments[1];
                
                if (!userData?.restaurantName) {
                  // Need restaurant info
                  if (currentScreen !== 'registerForm') {
                    console.log('Going to registerForm');
                    router.replace('/(auth-web)/registerForm');
                  }
                } else if (!userData?.profileImage) {
                  // Need profile pictures
                  if (currentScreen !== 'profile-pictures') {
                    console.log('Going to profile-pictures');
                    router.replace('/(auth-web)/profile-pictures');
                  }
                }
              }
              
            } else {
              // Cient
              console.log('Client user detected');
              
              // Client users go to mobile app
              if (isWeb) {
                console.log('Client user on web, redirecting to mobile');
                // For web, redirect to mobile login or show message
                if (inAuthGroup) {
                  router.replace(mobileAppPath);
                }
              } else {
                // Mobile client user
                if (inAuthGroup) {
                  console.log('Mobile client user, going to mobile app');
                  router.replace(mobileAppPath);
                }
              }
            }
            
          } else {
            // User doesn't exist in Firestore yet
            console.log('User not in Firestore, creating default');
            
            // Default behavior based on platform
            if (isWeb) {
              // Web users
              if (inAuthGroup) {
                router.replace('/(auth-web)/registerForm');
              }
            } else {
              // Mobile users
              if (inAuthGroup) {
                console.log('New mobile user, going to mobile app');
                router.replace(mobileAppPath);
              }
            }
          }
        } else {
          // Firebase not initialized - simple redirect
          console.log('Firebase not initialized, simple redirect');
          
          if (isWeb && inAuthGroup) {
            router.replace(webAppPath);
          } else if (!isWeb && inAuthGroup) {
            router.replace(mobileAppPath);
          }
        }
      } catch (error) {
        console.error('Error in navigation check:', error);
        // redirect based on platform
        if (inAuthGroup) {
          const appPath = isWeb ? webAppPath : mobileAppPath;
          router.replace(appPath);
        }
      } finally {
        setIsCheckingSetup(false);
        setHasChecked(true);
      }
    };

    checkNavigation();
  }, [user, loading, navigationState?.key]);

  // Reset check when user changes
  useEffect(() => {
    if (user?.uid) {
      setHasChecked(false);
    }
  }, [user?.uid]);

  // Show loading while checking
  if (loading || isCheckingSetup) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 10 }}>
          {isCheckingSetup ? 'Checking your profile...' : 'Loading...'}
        </Text>
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {isWeb ? (
        <>
          <Stack.Screen name="(auth-web)" />
          <Stack.Screen name="(web)" />
        </>
      ) : (
        <>
          <Stack.Screen name="(auth-mobile)" />
          <Stack.Screen name="(mobile)" />
        </>
      )}
      <Stack.Screen
        name="modal"
        options={{ 
          presentation: "modal", 
          headerShown: true,
        }}
      />
    </Stack>
  );
}