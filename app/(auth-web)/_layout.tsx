import Colors from "@/constants/Colors";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { Stack } from "expo-router";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

export default function AuthLayout() {
  const { login } = useAuth();
  const { theme } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: Colors.light.tint
        },
        headerShadowVisible: false,
        headerTitle: "",
        headerRight: () => (
          <Pressable 
            style={({hovered, pressed}) => [

              styles.headerButton,
              hovered && styles.headerButtonHovered
              
            ]} 
            onPress={login}>
            <Image
              source={require("@/assets/images/auth0_logo.png")}
              style={styles.icon}
              resizeMode="contain"
            />
            <Text style={styles.bold}>Login with Auth0</Text>
          </Pressable>
        ),
        headerLeft: () => (
          <View style={styles.headerLeft}>
          </View>
        ),
      }}
    />
  );
}

const styles = StyleSheet.create({
  headerButton: {
    height: "100%",
    flexDirection: "row",
    paddingHorizontal: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  headerButtonHovered:{
    height: "100%",
    flexDirection: "row",
    paddingHorizontal: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  bold:{
    fontWeight: 600,
    color: Colors.light.background
  },
  icon: {
    width: 24,
    height: 24,
    marginRight: 10
  },
  headerLeft: {
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 30
  },
  logo:{
    width: 50,
  }
});
