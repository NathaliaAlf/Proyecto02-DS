import { ImageBackground, StyleSheet, Text, View } from "react-native";

export default function LoginScreen() {
  return (
    <ImageBackground
      source={require("@/assets/images/login_image.png")}
      resizeMode="cover"
      style={styles.background}
    >
      {/* Dark overlay */}
      <View style={styles.overlay} />

      {/* Center band */}
      <View style={styles.band}>
        <Text style={styles.title}>Explore Biodiversity</Text>
        <Text style={styles.subtitle}>
          Discover species data from around the world
        </Text>
      </View>
    </ImageBackground>
  );
}



const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
  },

  band: {
    position: "absolute",
    top: "50%",
    transform: [{ translateY: -60 }],
    width: "100%",
    paddingVertical: 24,
    paddingHorizontal: 32,
    backgroundColor: "rgba(0, 0, 0, 0.42)",
    alignItems: "center",
  },

  title: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
  },

  subtitle: {
    color: "#ddd",
    fontSize: 16,
    marginTop: 8,
    textAlign: "center",
  },
});
