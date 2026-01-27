import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { useRef } from "react";
import { Image, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function LoginScreen() {
  const { login, isLoggingIn } = useAuth();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const loginInProgress = useRef(false);

  function handleRegisterRestaurant() {
    console.log('redirect to restaurant login');
  }

  const handleLogin = async () => {
    // Prevent multiple clicks
    if (isLoggingIn || loginInProgress.current) {
      console.log('Login already in progress');
      return;
    }
    
    try {
      loginInProgress.current = true;
      await login('mobile');
    } catch (error) {
      console.error('Login error:', error);
    } finally {
      // Small delay before allowing another login attempt
      setTimeout(() => {
        loginInProgress.current = false;
      }, 1000);
    }
  }

  return (
    <View style={styles.background}>
      <View style={styles.imagotypeContainer}>
        <Image
          style={styles.imagotype}
          source={require('@/assets/images/imagotype.png')}
          resizeMode="contain"
        />
      </View>

      {/* login button */}
      <Pressable 
        style={({hovered, pressed}) => [
          styles.loginButton,
          (hovered || pressed) && styles.loginButtonHovered,
          (isLoggingIn || loginInProgress.current) && styles.loginButtonDisabled
        ]} 
        onPress={handleLogin}
        disabled={isLoggingIn || loginInProgress.current}>
        <Image
          source={require("@/assets/images/auth0_logo.png")}
          style={styles.icon}
          resizeMode="contain"
        />
        <Text style={styles.bold}>
          {(isLoggingIn || loginInProgress.current) ? 'Opening login...' : 'Login with Auth0'}
        </Text>
      </Pressable>

      <View style={styles.separator}></View>

      <TouchableOpacity 
        onPress={handleRegisterRestaurant}>
        <Text style={styles.link}>
          Register your restaurant
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (colors:any) => StyleSheet.create({
  background: {
    flex: 1,
    flexDirection: 'column',
    width: "100%",
    height: "100%",
    alignContent: 'flex-end',
    alignItems: 'center',
    justifyContent: 'flex-end'
  },
  imagotypeContainer: {
    width: 100,
    height: '80%',
    alignContent: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagotype: {
    width: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  bold: {
    fontWeight: "800", // Changed from 800 to "800" for React Native
    color: colors.auth0Text,
  },
  loginButton: {
    backgroundColor: colors.defaultColor,
    height: 50,
    flexDirection: "row",
    paddingHorizontal: 16,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
  },
  loginButtonHovered:{
    backgroundColor: colors.tint,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  icon: {
    width: 24,
    height: 24,
    marginRight: 10
  },
  separator: {
    height: 1,
    width: '80%',
    backgroundColor: colors.second,
    marginVertical: 30
  },
  link: {
    textDecorationLine: "underline",
    marginBottom: 50,
  }
});