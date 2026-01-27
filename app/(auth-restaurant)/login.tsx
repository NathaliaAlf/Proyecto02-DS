// app/(auth-restaurant)/login.tsx
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { restaurantApi } from "@/services/api/restaurantApi";
import { userApi } from "@/services/api/userApi";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from "react-native";

export default function LoginScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const { login, user, loading: authLoading } = useAuth();
  const [checkingUser, setCheckingUser] = useState(false);

  useEffect(() => {
    const checkUserAfterLogin = async () => {
      if (!user?.uid || authLoading) return;

      setCheckingUser(true);
      try {
        console.log("Checking user after login:", user.uid);
        
        // First, check if we have a user document
        const userResult = await userApi.getUserByUid(user.uid);
        
        if (userResult.success && userResult.data) {
          const userData = userResult.data;
          
          // Check if user is a restaurant (should always be true for web)
          if (userData.userType !== 'restaurant') {
            console.error('Web user is not a restaurant type, redirecting to registerForm');
            router.replace('/(auth-restaurant)/registerForm');
            return;
          }
          
          // Check if restaurant exists
          const restaurantResult = await restaurantApi.getRestaurantByUid(user.uid);
          
          if (restaurantResult.success && restaurantResult.data) {
            const restaurantData = restaurantResult.data;
            console.log("Restaurant found:", restaurantData);
            
            if (restaurantData.setupCompleted) {
              // Setup complete → go to restaurant app
              console.log("Setup complete, redirecting to restaurant app");
              router.replace('/(restaurant)');
            } else {
              // Restaurant exists but setup incomplete
              console.log("Setup incomplete, checking what's missing");
              
              // Check what step they need to complete
              if (!restaurantData.setupCompleted) {
                // Missing restaurant name (or still default) → registerForm
                console.log("Has data but setup not marked, going to registerForm");
                router.replace('/(auth-restaurant)/registerForm');
              }
            }
          } else {
            // No restaurant document found → ALWAYS go to registerForm
            console.log("No restaurant found, going to registerForm");
            router.replace('/(auth-restaurant)/registerForm');
          }
        } else {
          // User doesn't exist in database → registerForm
          console.log("User not found in database, going to registerForm");
          router.replace('/(auth-restaurant)/registerForm');
        }
      } catch (error) {
        console.error('Error checking user after login:', error);
        // Default to registerForm on error
        router.replace('/(auth-restaurant)/registerForm');
      } finally {
        setCheckingUser(false);
      }
    };

    // Add a small delay to ensure Auth0 callback is complete
    const timer = setTimeout(() => {
      checkUserAfterLogin();
    }, 500);

    return () => clearTimeout(timer);
  }, [user, authLoading]);

  const handleLogin = async () => {
    try {
      // For web, always login as restaurant
      await login('web');
    } catch (error) {
      console.error("Login error:", error);
    }
  };

  // Show loading state while checking user
  if (authLoading || checkingUser) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.defaultColor} />
        <Text style={styles.loadingText}>
          {authLoading ? "Logging in..." : "Checking your profile..."}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.background}>
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Image
            source={require('@/assets/images/logotype-restaurant.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <Pressable 
          style={({ hovered }) => [
            styles.loginButton,
            hovered && styles.loginButtonHovered
          ]} 
          onPress={handleLogin}
          disabled={authLoading}
        >
          <Image
            source={require("@/assets/images/auth0_logo.png")}
            style={styles.icon}
            resizeMode="contain"
          />
          <Text style={styles.bold}>Login with Auth0</Text>
        </Pressable>
      </View>

      <View style={styles.loginImageContainer}>
        <Image
          source={require('@/assets/images/login_image.png')}
          resizeMode="contain"
          style={styles.loginImage}
        />
      </View>
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.tint,
    height: 100,
    marginTop: '5%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  logoContainer: {
    backgroundColor: colors.background,
    height: 100,
    width: '60%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    height: '80%',
    width: '80%',
  },
  loginButton: {
    backgroundColor: 'transparent',
    height: 50,
    flexDirection: "row",
    paddingHorizontal: 16,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
  },
  loginButtonHovered: {
    backgroundColor: 'transparent',
    textDecorationLine: 'underline',
    textDecorationColor: colors.auth0Text,
  },
  bold: {
    fontWeight: '600',
    color: colors.auth0Text,
    fontSize: 16,
  },
  icon: {
    width: 24,
    height: 24,
    marginRight: 10
  },
  loginImage: {
    height: '80%',
    width: '80%',
  },
  loginImageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: colors.text,
  },
});