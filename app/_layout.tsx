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
      if (loading || !navigationState?.key) {
        return;
      }

      if (hasChecked) {
        return;
      }

      console.log('Navigation check:', {
        hasUser: !!user?.uid,
        userType: user?.userType,
        currentPath: segments.join('/'),
        isWeb: isWeb,
        inAuthGroup: isWeb ? segments[0] === '(auth-restaurant)' : segments[0] === '(auth-customer)'
      });

      const inAuthGroup = isWeb 
        ? segments[0] === '(auth-restaurant)' 
        : segments[0] === '(auth-customer)';
      
      const webLoginPath = '/(auth-restaurant)/login';
      const mobileLoginPath = '/(auth-customer)/login';
      const webAppPath = '/(restaurant)';
      const mobileAppPath = '/(customer)';

      // No user, go to login
      if (!user) {
        setHasChecked(true);
        const currentGroup = segments[0];
        const isInAppGroup = isWeb 
          ? currentGroup === '(restaurant)'
          : currentGroup === '(customer)';
        
        // Redirect if in app group or not in correct auth group
        if (isInAppGroup || !inAuthGroup) {
          console.log('No user, redirecting to login from:', currentGroup);
          const loginPath = isWeb ? webLoginPath : mobileLoginPath;
          router.replace(loginPath);
        }
        return;
      }

      // User exists, check user type and platform compatibility
      setIsCheckingSetup(true);
      
      try {
        console.log('User exists:', {
          userType: user.userType,
          isWeb: isWeb,
          restaurantId: user.restaurantId
        });

        // Check platform-user type compatibility
        if (isWeb && user.userType === 'customer') {
          // Customer user on web - redirect to mobile
          console.log('Customer user on web, redirecting to mobile login or showing message');
          if (inAuthGroup) {
            // Could show a message or redirect
            router.replace(mobileLoginPath);
          }
        } else if (!isWeb && user.userType === 'restaurant') {
          // Restaurant user on mobile - could redirect to web or show message
          console.log('Restaurant user on mobile, staying for now');
          // Continue to mobile app for now
          if (inAuthGroup) {
            router.replace(mobileAppPath);
          }
        } else {
          // Platform and user type match or mobile customer
          
          if (user.userType === 'restaurant' && isWeb) {
            // Restaurant user on web - check setup status
            try {
              const { restaurantApi } = await import('@/services/api/restaurantApi');
              const restaurantResult = await restaurantApi.getRestaurantByUid(user.uid);
              
              console.log('Layout - Restaurant check result:', {
                success: restaurantResult.success,
                data: restaurantResult.data,
                setupCompleted: restaurantResult.data?.setupCompleted
              });
              
              if (restaurantResult.success && restaurantResult.data) {
                const restaurant = restaurantResult.data;
                
                if (restaurant.setupCompleted) {
                  // Setup complete
                  console.log('Layout - Setup complete, going to restaurant app');
                  if (inAuthGroup) {
                    router.replace(webAppPath);
                  }
                } else {
                  // Setup incomplete
                  console.log('Layout - Setup incomplete, checking missing data:', {
                    hasName: !!restaurant.restaurantName,
                    hasProfileImage: !!restaurant.profileImage,
                    hasHeaderImage: !!restaurant.headerImage
                  });
                  
                  if (!restaurant.restaurantName || restaurant.restaurantName === 'My Restaurant') {
                    // Missing restaurant name
                    console.log('Layout - Missing restaurant name, staying on registerForm');
                    // Don't redirect if already on registerForm
                    if (segments[1] !== 'registerForm' && inAuthGroup) {
                      router.replace('/(auth-restaurant)/registerForm');
                    }
                  } else if (!restaurant.profileImage || !restaurant.headerImage) {
                    // Missing images
                    console.log('Layout - Missing images, going to profile-pictures');
                    if (segments[1] !== 'profile-pictures' && inAuthGroup) {
                      router.replace('/(auth-restaurant)/profile-pictures');
                    }
                  } else {
                    // Has all data but setup not marked complete
                    console.log('Layout - Has data but setup not marked, going to registerForm');
                    if (segments[1] !== 'registerForm' && inAuthGroup) {
                      router.replace('/(auth-restaurant)/registerForm');
                    }
                  }
                }
              } else {
                // No restaurant document found
                console.log('Layout - No restaurant found, staying on current screen');
                // Let the login screen handle the redirect
              }
            } catch (error) {
              console.error('Layout - Error checking restaurant:', error);
            }
          } else {
            // Customer user on mobile (or any other valid combo)
            if (inAuthGroup) {
              console.log('Going to app');
              const appPath = isWeb ? webAppPath : mobileAppPath;
              router.replace(appPath);
            }
          }
        }
        
      } catch (error) {
        console.error('Error in navigation check:', error);
        // Fallback redirect
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
          <Stack.Screen name="(auth-restaurant)" />
          <Stack.Screen name="(restaurant)" />
        </>
      ) : (
        <>
          <Stack.Screen name="(auth-customer)" />
          <Stack.Screen name="(customer)" />
        </>
      )}
    </Stack>
  );
}