// /app/_layout
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
        currentGroup: segments[0]
      });

      const currentGroup = segments[0];
      const customerLoginPath = '/(auth-customer)/login';
      const restaurantLoginPath = '/(auth-restaurant)/login';
      const customerAppPath = '/(customer)';
      const restaurantAppPath = '/(restaurant)';
      
      const inCustomerAuth = currentGroup === '(auth-customer)';
      const inRestaurantAuth = currentGroup === '(auth-restaurant)';
      const inCustomerApp = currentGroup === '(customer)';
      const inRestaurantApp = currentGroup === '(restaurant)';
      const inAuthGroup = inCustomerAuth || inRestaurantAuth;
      const inAppGroup = inCustomerApp || inRestaurantApp;

      // No user, go to login based on platform
      if (!user) {
        setHasChecked(true);
        
        // Redirect if in app group
        if (inAppGroup) {
          console.log('No user, redirecting to login from app group');
          const loginPath = isWeb ? restaurantLoginPath : customerLoginPath;
          router.replace(loginPath);
        }
        return;
      }

      // User exists - redirect based on USER TYPE, not platform
      setIsCheckingSetup(true);
      
      try {
        console.log('User exists:', {
          userType: user.userType,
          isWeb: isWeb,
          restaurantId: user.restaurantId,
          currentGroup
        });

        // CUSTOMER USER
        if (user.userType === 'customer') {
          // Customer should be in customer routes
          if (inRestaurantAuth || inRestaurantApp) {
            console.log('Customer user in restaurant routes, redirecting to customer app');
            router.replace(customerAppPath);
          } else if (inCustomerAuth) {
            // In customer auth, go to customer app
            console.log('Customer user in auth, going to customer app');
            router.replace(customerAppPath);
          }
          // If already in customer app, do nothing
        } 
        // RESTAURANT USER
        else if (user.userType === 'restaurant') {
          // Restaurant should be in restaurant routes
          if (inCustomerAuth || inCustomerApp) {
            console.log('Restaurant user in customer routes, redirecting to restaurant setup/app');
            
            // Check restaurant setup status
            try {
              const { restaurantApi } = await import('@/services/api/restaurantApi');
              const restaurantResult = await restaurantApi.getRestaurantByUid(user.uid);
              
              if (restaurantResult.success && restaurantResult.data) {
                const restaurant = restaurantResult.data;
                
                if (restaurant.setupCompleted) {
                  router.replace(restaurantAppPath);
                } else {
                  // Redirect to appropriate setup step
                  if (!restaurant.restaurantName || restaurant.restaurantName === 'My Restaurant') {
                    router.replace('/(auth-restaurant)/registerForm');
                  } else if (!restaurant.profileImage || !restaurant.headerImage) {
                    router.replace('/(auth-restaurant)/profile-pictures');
                  } else {
                    router.replace('/(auth-restaurant)/registerForm');
                  }
                }
              } else {
                // No restaurant found, go to register form
                router.replace('/(auth-restaurant)/registerForm');
              }
            } catch (error) {
              console.error('Error checking restaurant:', error);
              router.replace('/(auth-restaurant)/registerForm');
            }
          } else if (inRestaurantAuth) {
            // In restaurant auth, check setup status
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
                  // Setup complete, go to app
                  console.log('Layout - Setup complete, going to restaurant app');
                  router.replace(restaurantAppPath);
                } else {
                  // Setup incomplete - check which step
                  console.log('Layout - Setup incomplete, checking missing data:', {
                    hasName: !!restaurant.restaurantName,
                    hasProfileImage: !!restaurant.profileImage,
                    hasHeaderImage: !!restaurant.headerImage
                  });
                  
                  if (!restaurant.restaurantName || restaurant.restaurantName === 'My Restaurant') {
                    // Missing restaurant name - stay on/go to registerForm
                    if (segments[1] !== 'registerForm') {
                      router.replace('/(auth-restaurant)/registerForm');
                    }
                  } else if (!restaurant.profileImage || !restaurant.headerImage) {
                    // Missing images - go to profile-pictures
                    if (segments[1] !== 'profile-pictures') {
                      router.replace('/(auth-restaurant)/profile-pictures');
                    }
                  } else {
                    // Has all data but not marked complete
                    if (segments[1] !== 'registerForm') {
                      router.replace('/(auth-restaurant)/registerForm');
                    }
                  }
                }
              } else {
                // No restaurant found
                console.log('Layout - No restaurant found, going to registerForm');
                if (segments[1] !== 'registerForm') {
                  router.replace('/(auth-restaurant)/registerForm');
                }
              }
            } catch (error) {
              console.error('Layout - Error checking restaurant:', error);
            }
          }
          // If already in restaurant app, do nothing
        }
        
      } catch (error) {
        console.error('Error in navigation check:', error);
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
