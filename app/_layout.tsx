import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useFonts } from 'expo-font';
import { router, Stack, useRootNavigationState, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Platform } from 'react-native';
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

  useEffect(() => {
    if (loading || !navigationState?.key) return;

    const inAuthGroup = isWeb 
      ? segments[0] === '(auth-web)' 
      : segments[0] === '(auth-mobile)';
    
    const authRedirectPath = isWeb ? '/(auth-web)/login' : '/(auth-mobile)/login';
    const appRedirectPath = isWeb ? '/(web)' : '/(mobile)';
    
    if (!user && !inAuthGroup) {
      router.replace(authRedirectPath);
    } else if (user && inAuthGroup) {
      router.replace(appRedirectPath);
    }
  }, [user, loading, segments, navigationState?.key, isWeb]);

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
        options={{ presentation: "modal", headerShown: true }}
      />
    </Stack>
  );
}