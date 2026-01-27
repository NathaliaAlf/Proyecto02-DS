// app/(auth-restaurant)/profile-pictures.tsx
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { FontAwesome, Ionicons } from "@expo/vector-icons";
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";

// Cloudinary Configuration from .env
const CLOUDINARY_CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

export default function ProfilePicturesScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const { user } = useAuth();
  const params = useLocalSearchParams();
  
  // State for uploaded images
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [headerPicture, setHeaderPicture] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // State for restaurant data
  const [restaurantData, setRestaurantData] = useState<{
    restaurantName: string;
    categories: string[];
    ingredients: string[];
  } | null>(null);
  const [parsingData, setParsingData] = useState(true);
  
  // Use ref to prevent redirect loops
  const hasRedirectedRef = useRef(false);


  // Parse restaurant data from params ONCE on mount
  useEffect(() => {
    // Prevent re-running if we already have data
    if (restaurantData || hasRedirectedRef.current) return;

    const parseRestaurantData = () => {
      try {
        if (params.restaurantData) {
          const parsedData = JSON.parse(params.restaurantData as string);
          console.log('Received restaurant data:', parsedData);
          setRestaurantData(parsedData);
        } else {
          console.log('No restaurant data in params');
          if (!hasRedirectedRef.current) {
            hasRedirectedRef.current = true;
            router.replace('/(auth-restaurant)/registerForm');
          }
        }
      } catch (error) {
        console.error('Error parsing restaurant data:', error);
        if (!hasRedirectedRef.current) {
          hasRedirectedRef.current = true;
          router.replace('/(auth-restaurant)/registerForm');
        }
      } finally {
        setParsingData(false);
      }
    };

    parseRestaurantData();
  }, [params, restaurantData]); // Add restaurantData to dependencies

  // Upload to Cloudinary function
  const uploadToCloudinary = async (uri: string, type: 'profile' | 'header') => {
    try {
      if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
        throw new Error('Cloudinary configuration is missing');
      }

      console.log('Uploading image:', { uri, type });
      
      // Different handling for web vs mobile
      let file: any;
      
      if (Platform.OS === 'web') {
        // WEB: Fetch the image and convert to blob
        const response = await fetch(uri);
        const blob = await response.blob();
        file = blob;
      } else {
        // MOBILE: Use the file object structure
        const filename = uri.split('/').pop();
        file = {
          uri,
          type: 'image/jpeg',
          name: filename || `image_${Date.now()}.jpg`,
        };
      }
      
      const formData = new FormData();
      const timestamp = Date.now();
      const publicId = `restaurant_${user?.uid}_${type}_${timestamp}`;
      
      // Append file correctly based on platform
      formData.append('file', file);
      
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
      formData.append('public_id', publicId);
      formData.append('folder', 'restaurant_app');
      
      console.log('Sending to Cloudinary:', {
        cloudName: CLOUDINARY_CLOUD_NAME,
        uploadPreset: CLOUDINARY_UPLOAD_PRESET,
        publicId
      });
      
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );
      
      console.log('Cloudinary response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Cloudinary error response:', errorText);
        throw new Error(`Upload failed: ${errorText}`);
      }
      
      const data = await response.json();
      console.log('Upload successful:', data.secure_url);
      return data.secure_url;
      
    } catch (error) {
      console.error('Cloudinary upload error:', error);
      throw error;
    }
  };

  // Complete setup - save everything to Firestore
  const completeSetup = async () => {
    console.log('Starting completeSetup...');
    
    if (!profilePicture || !headerPicture) {
      Alert.alert("Images Required", "Please upload both images");
      return;
    }

    if (!restaurantData) {
      Alert.alert("Data Missing", "Restaurant information is missing");
      return;
    }

    if (!user?.uid) {
      Alert.alert("Error", "User not authenticated");
      return;
    }

    // Prevent multiple clicks
    if (loading) return;
    
    setLoading(true);
    setUploadProgress(0);
    
    try {
      console.log('Uploading images...');
      setUploadProgress(10);
      
      // Upload images to Cloudinary
      const profileUrl = await uploadToCloudinary(profilePicture, 'profile');
      setUploadProgress(50);
      
      const headerUrl = await uploadToCloudinary(headerPicture, 'header');
      setUploadProgress(80);

      console.log('Saving to Firestore...');
      // Import Firebase dynamically
      const { doc, setDoc } = await import('firebase/firestore');
      const { getApp } = await import('firebase/app');
      const { getFirestore } = await import('firebase/firestore');
      
      const app = getApp();
      const db = getFirestore(app);
      
      // Save ALL data to Firestore
      const userDoc = {
        uid: user.uid,
        email: user.email,
        displayName: restaurantData.restaurantName,
        
        // Images from Cloudinary
        profileImage: profileUrl,
        headerImage: headerUrl,
        
        // Restaurant data from registerForm
        restaurantName: restaurantData.restaurantName,
        categories: restaurantData.categories,
        ingredients: restaurantData.ingredients,
        
        // Setup completed
        setupCompleted: true,
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
      };
      
      await setDoc(doc(db, 'users', user.uid), userDoc, { merge: true });
      setUploadProgress(100);
      
      console.log('All data saved to Firestore, navigating to /(web)...');
      
      // CRITICAL: Use setTimeout to ensure state updates complete before navigation
      setTimeout(() => {
        router.replace("/(restaurant)");
      }, 100);
      
    } catch (error) {
      console.error("Setup error:", error);
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "Failed to save. Please try again.",
        [{ text: "OK" }]
      );
    } finally {
      // Don't reset loading immediately if we're navigating
      if (uploadProgress < 100) {
        setLoading(false);
        setUploadProgress(0);
      }
    }
  };

  // Image picker functions
  const pickImage = async (type: 'profile' | 'header') => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Sorry, we need camera roll permissions');
        return;
      }
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: type === 'profile' ? [1, 1] : [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        if (type === 'profile') {
          setProfilePicture(result.assets[0].uri);
        } else {
          setHeaderPicture(result.assets[0].uri);
        }
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to pick image");
    }
  };

  const takePhoto = async (type: 'profile' | 'header') => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Sorry, we need camera permissions');
        return;
      }
    }

    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: type === 'profile' ? [1, 1] : [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        if (type === 'profile') {
          setProfilePicture(result.assets[0].uri);
        } else {
          setHeaderPicture(result.assets[0].uri);
        }
      }
    } catch (error) {
      console.error("Error taking photo:", error);
      Alert.alert("Error", "Failed to take photo");
    }
  };

  const removeImage = (type: 'profile' | 'header') => {
    if (type === 'profile') {
      setProfilePicture(null);
    } else {
      setHeaderPicture(null);
    }
  };

  // Show loading while parsing data
  if (parsingData) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text>Loading your information...</Text>
      </View>
    );
  }

  // Show error if no restaurant data
  if (!restaurantData) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text>Redirecting to registration form...</Text>
      </View>
    );
  }

  return (
    <View style={styles.background}>
      <ScrollView 
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Profile Pictures</Text>
          <Text style={styles.subtitle}>
            Upload your restaurant's profile and header images
          </Text>
        </View>

        {/* Progress Bar */}
        {loading && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${uploadProgress}%` }
                ]} 
              />
            </View>
            <Text style={styles.progressText}>
              {uploadProgress < 100 ? `Uploading... ${uploadProgress}%` : 'Saving...'}
            </Text>
          </View>
        )}

        {/* Profile Image Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile Picture</Text>
          <Text style={styles.sectionDescription}>
            Your restaurant's main profile image (Square, 1:1 ratio)
          </Text>
          
          <View style={styles.imageContainer}>
            {profilePicture ? (
              <View style={styles.profileImageWrapper}>
                <Image 
                  source={{ uri: profilePicture }} 
                  style={styles.profileImagePreview}
                  resizeMode="cover"
                />
                <TouchableOpacity 
                  style={styles.removeProfileImageButton}
                  onPress={() => removeImage('profile')}
                  disabled={loading}
                >
                  <Ionicons name="close-circle" size={28} color="#ff4444" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity 
                style={styles.profileUploadArea}
                onPress={() => pickImage('profile')}
                disabled={loading}
              >
                <FontAwesome name="user-circle-o" size={80} color={colors.defaultColor} />
                <Text style={styles.uploadText}>Upload Profile Picture</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Header Image Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Header Image</Text>
          <Text style={styles.sectionDescription}>
            Displayed at the top of your restaurant profile (16:9 ratio)
          </Text>
          
          <View style={styles.imageContainer}>
            {headerPicture ? (
              <View style={styles.imagePreviewWrapper}>
                <Image 
                  source={{ uri: headerPicture }} 
                  style={styles.headerImagePreview}
                  resizeMode="cover"
                />
                <TouchableOpacity 
                  style={styles.removeImageButton}
                  onPress={() => removeImage('header')}
                  disabled={loading}
                >
                  <Ionicons name="close-circle" size={28} color="#ff4444" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity 
                style={styles.uploadArea}
                onPress={() => pickImage('header')}
                disabled={loading}
              >
                <FontAwesome name="picture-o" size={60} color={colors.defaultColor} />
                <Text style={styles.uploadText}>Upload Header Image</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Navigation Buttons */}
        <View style={styles.navigationButtons}>
          <TouchableOpacity 
            style={[styles.navButton, styles.backButton]}
            onPress={() => router.back()}
            disabled={loading}
          >
            <Ionicons name="arrow-back" size={20} color={colors.defaultColor} />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.navButton, 
              styles.completeButton,
              (!profilePicture || !headerPicture || loading) && styles.completeButtonDisabled
            ]}
            onPress={completeSetup}
            disabled={!profilePicture || !headerPicture || loading}
          >
            {loading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <>
                <Text style={styles.completeButtonText}>Complete Setup</Text>
                <Ionicons name="checkmark-circle" size={20} color="white" />
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 20,
    paddingVertical: 40,
    alignItems: 'center',
  },
  header: {
    width: '100%',
    maxWidth: 1000,
    marginBottom: 30,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.defaultColor,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.text,
    textAlign: 'center',
    opacity: 0.8,
  },
  progressContainer: {
    width: '100%',
    maxWidth: 1000,
    marginBottom: 20,
    backgroundColor: colors.second,
    padding: 15,
    borderRadius: 10,
  },
  progressBar: {
    height: 6,
    backgroundColor: colors.background,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.defaultColor,
    borderRadius: 3,
  },
  progressText: {
    fontSize: 14,
    color: colors.text,
    textAlign: 'center',
  },
  section: {
    width: '100%',
    maxWidth: 1000,
    marginBottom: 30,
    backgroundColor: colors.second,
    padding: 20,
    borderRadius: 15,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.defaultColor,
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 20,
    opacity: 0.7,
  },
  imageContainer: {
    width: '100%',
    alignItems: 'center',
  },
  uploadArea: {
    width: '100%',
    height: 180,
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.defaultColor,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  profileUploadArea: {
    width: 180,
    height: 180,
    backgroundColor: colors.background,
    borderRadius: 90,
    borderWidth: 2,
    borderColor: colors.defaultColor,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  uploadText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.defaultColor,
    marginTop: 10,
    textAlign: 'center',
  },
  headerImagePreview: {
    width: '100%',
    height: 180,
    borderRadius: 12,
  },
  profileImagePreview: {
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 3,
    borderColor: colors.defaultColor,
  },
  imagePreviewWrapper: {
    width: '100%',
    position: 'relative',
  },
  profileImageWrapper: {
    position: 'relative',
    alignItems: 'center',
  },
  removeImageButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 2,
  },
  removeProfileImageButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 2,
  },
  navigationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 1000,
    marginTop: 20,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 25,
    borderRadius: 10,
    minWidth: 150,
  },
  backButton: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.defaultColor,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.defaultColor,
    marginLeft: 8,
  },
  completeButton: {
    backgroundColor: colors.defaultColor,
    flex: 1,
    marginLeft: 20,
  },
  completeButtonDisabled: {
    opacity: 0.5,
  },
  completeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginRight: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});