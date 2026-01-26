import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { Image, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function LoginScreen() {
  const {login} = useAuth();
  const {colors} = useTheme();
  const styles = createStyles(colors);

  function handleRegisterRestaurant (){
    console.log('redirect to restaurant login');
  }

  const handleLogin = async() => {
    await login('mobile');
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
          hovered && styles.loginButtonHovered
          
        ]} 
        onPress={handleLogin}>
        <Image
          source={require("@/assets/images/auth0_logo.png")}
          style={styles.icon}
          resizeMode="contain"
        />
        <Text style={styles.bold}>Login with Auth0</Text>
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
    fontWeight: 800,
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
    height: 50,
    flexDirection: "row",
    paddingHorizontal: 16,
    justifyContent: "center",
    alignItems: "center",
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
