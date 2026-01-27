import { db } from "@/config/firebase";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { router } from "expo-router";
import { doc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from "react-native";

export default function LoginScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const { login, user, loading: authLoading } = useAuth();
  const [checkingUser, setCheckingUser] = useState(false);
  const {loading } = useAuth();

  useEffect(() => {
    const checkUserAfterLogin = async () => {
      if (!user?.uid || loading) return;

      try {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          
          if (userData.setupCompleted) {
            // Setup complete → go to web app
            router.replace('/(restaurant)');
          } else if (userData.restaurantName && !userData.profileImage) {
            // Has restaurant info but no pictures → profile-pictures
            router.replace('/(auth-restaurant)/profile-pictures');
          } else {
            // No restaurant info → registerForm
            router.replace('/(auth-restaurant)/registerForm');
          }
        } else {
          // New user → registerForm
          router.replace('/(auth-restaurant)/registerForm');
        }
      } catch (error) {
        console.error('Error checking user after login:', error);
        // Default to registerForm on error
        router.replace('/(auth-restaurant)/registerForm');
      }
    };

    checkUserAfterLogin();
  }, [user, loading]);

  // Effect to check user status when auth state changes
  useEffect(() => {
    const checkUserStatus = async () => {
      if (!user) return; // No user logged in yet
      
      setCheckingUser(true);
      
      try {
        // Check if user document exists in Firestore
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          
          // Check if setup is completed
          if (userData.setupCompleted) {
            console.log("User setup completed, redirecting to main app");
            router.replace("/(restaurant)"); // or /(mobile) depending on platform
          } else {
            console.log("User exists but setup not completed");
            router.replace("/(auth-restaurant)/registerForm"); // Go to registration
          }
        } else {
          // User doesn't exist in Firestore, go to registration
          console.log("User not found in Firestore, redirecting to registration");
          router.replace("/(auth-restaurant)/registerForm");
        }
      } catch (error) {
        console.error("Error checking user status:", error);
        // On error, still send to registration as fallback
        router.replace("/(auth-restaurant)/registerForm");
      } finally {
        setCheckingUser(false);
      }
    };

    checkUserStatus();
  }, [user]);

  const handleLogin = async () => {
    try {
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