// app/(auth-customer)/login.tsx - Customer Login (Mobile)
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";

export default function LoginScreen() {
  const { login, isLoggingIn } = useAuth();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const loginInProgress = useRef(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleRegisterRestaurant = () => {
    // Show message for mobile users
    Alert.alert(
      "Restaurant Registration",
      "Restaurant registration is only available on our web platform. Please visit our website to register your restaurant.",
      [
        { text: "OK" },
        { text: "Visit Website", onPress: () => {
          // You could add a web view or open browser here
        }}
      ]
    );
  };

  const handleLogin = async () => {
    // Prevent multiple clicks
    if (isLoggingIn || loginInProgress.current) {
      console.log('Login already in progress');
      return;
    }
    
    // Safety check - this should only be accessible on mobile
    if (Platform.OS === 'web') {
      Alert.alert("Wrong Platform", "This is the customer login for mobile only. Restaurants should use the web app.");
      return;
    }
    
    try {
      loginInProgress.current = true;
      setIsLoading(true);
      
      // For mobile, always login as customer
      await login('mobile');
      
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('Login Error', 'Failed to login. Please try again.');
    } finally {
      setIsLoading(false);
      // Small delay before allowing another login attempt
      setTimeout(() => {
        loginInProgress.current = false;
      }, 1000);
    }
  }

  return (
    <View style={styles.background}>
      <View style={styles.logoContainer}>
        <Image
          style={styles.logo}
          source={require('@/assets/images/imagotype.png')}
          resizeMode="contain"
        />
        <Text style={styles.welcomeText}>Welcome to Picky Up</Text>
        <Text style={styles.subtitle}>
          Customize your order as you please
        </Text>
      </View>

      {/* Customer login button */}
      <Pressable 
        style={({pressed}) => [
          styles.loginButton,
          pressed && styles.loginButtonPressed,
          (isLoggingIn || loginInProgress.current) && styles.loginButtonDisabled
        ]} 
        onPress={handleLogin}
        disabled={isLoggingIn || loginInProgress.current}>
        {isLoading ? (
          <ActivityIndicator color={colors.auth0Text} size="small" />
        ) : (
          <>
            <Image
              source={require("@/assets/images/auth0_logo.png")}
              style={styles.icon}
              resizeMode="contain"
            />
            <Text style={styles.bold}>
              {(isLoggingIn || loginInProgress.current) ? 'Signing in...' : 'Sign in with Auth0'}
            </Text>
          </>
        )}
      </Pressable>

      <View style={styles.separator}>
        <View style={styles.separatorLine} />
        <Text style={styles.separatorText}>or</Text>
        <View style={styles.separatorLine} />
      </View>

      <TouchableOpacity 
        style={styles.restaurantButton}
        onPress={handleRegisterRestaurant}>
        <Text style={styles.restaurantButtonText}>
          I own a restaurant
        </Text>
      </TouchableOpacity>

    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  background: {
    flex: 1,
    width: "100%",
    height: "100%",
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: colors.background,
  },
  logoContainer: {
    width: '100%',
    maxWidth: 300,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 60,
  },
  logo: {
    width: 150,
    height: 200,
    marginBottom: 50,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.secondaryText,
    textAlign: 'center',
    lineHeight: 22,
  },
  bold: {
    fontWeight: "700",
    color: colors.auth0Text,
    fontSize: 16,
  },
  loginButton: {
    backgroundColor: colors.defaultColor,
    height: 56,
    width: '100%',
    maxWidth: 300,
    flexDirection: "row",
    paddingHorizontal: 24,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  loginButtonPressed: {
    backgroundColor: colors.tint,
    transform: [{ scale: 0.98 }],
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  icon: {
    width: 24,
    height: 24,
    marginRight: 12
  },
  separator: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    maxWidth: 300,
    marginVertical: 24,
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  separatorText: {
    marginHorizontal: 16,
    color: colors.secondaryText,
    fontSize: 14,
  },
  restaurantButton: {
    width: '100%',
    maxWidth: 300,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.primary,
    marginBottom: 24,
  },
  restaurantButtonText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    paddingHorizontal: 20,
  },
  footerText: {
    fontSize: 12,
    color: colors.secondaryText,
    textAlign: 'center',
    lineHeight: 16,
  },
  link: {
    textDecorationLine: 'underline',
    color: colors.primary,
  }
});