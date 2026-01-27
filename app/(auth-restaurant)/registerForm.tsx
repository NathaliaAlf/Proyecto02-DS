// app/(auth-restaurant)/registerForm.tsx
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { restaurantApi } from "@/services/api/restaurantApi";
import { getImagesForImageButtons, ImageButtonsData } from "@/utils/categories";
import { FontAwesome, Ionicons, MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, FlatList, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

export default function RegisterFormScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const { user } = useAuth();
  
  // State for form data
  const [restaurantName, setRestaurantName] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [newIngredient, setNewIngredient] = useState("");
  const [loading, setLoading] = useState(false);
  const [existingRestaurant, setExistingRestaurant] = useState<any>(null);

  // Check if user already has a restaurant
  useEffect(() => {
    const checkExistingRestaurant = async () => {
      if (!user?.uid) return;

      try {
        const result = await restaurantApi.getRestaurantByUid(user.uid);
        if (result.success && result.data) {
          const restaurant = result.data;
          setExistingRestaurant(restaurant);
          
          // Pre-fill form with existing data
          if (restaurant.restaurantName) {
            setRestaurantName(restaurant.restaurantName);
          }
          if (restaurant.categories) {
            setSelectedCategories(restaurant.categories);
          }
          if (restaurant.ingredients) {
            setIngredients(restaurant.ingredients);
          }
        }
      } catch (error) {
        console.error('Error checking existing restaurant:', error);
      }
    };

    checkExistingRestaurant();
  }, [user]);

  // Toggle category selection
  const toggleCategory = (categoryId: string) => {
    setSelectedCategories(prev => {
      if (prev.includes(categoryId)) {
        return prev.filter(id => id !== categoryId);
      } else {
        return [...prev, categoryId];
      }
    });
  };

  // Add new ingredient
  const addIngredient = () => {
    if (newIngredient.trim()) {
      setIngredients(prev => [...prev, newIngredient.trim()]);
      setNewIngredient("");
    }
  };

  // Remove ingredient
  const removeIngredient = (index: number) => {
    setIngredients(prev => prev.filter((_, i) => i !== index));
  };

  // Handle ingredient input submit
  const handleIngredientSubmit = () => {
    addIngredient();
  };

  // Save restaurant info and navigate to profile pictures
  const saveAndContinue = async () => {
    if (!restaurantName.trim()) {
      Alert.alert('Error', 'Please enter a restaurant name');
      return;
    }

    if (selectedCategories.length === 0) {
      Alert.alert('Error', 'Please select at least one category');
      return;
    }

    if (!user?.uid) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    setLoading(true);
    try {
      const formData = {
        restaurantName: restaurantName.trim(),
        categories: selectedCategories,
        ingredients
      };
      
      console.log("Saving restaurant info:", formData);
      
      // Always check for existing restaurant first
      const existingResult = await restaurantApi.getRestaurantByUid(user.uid);
      
      if (existingResult.success && existingResult.data) {
        // UPDATE existing restaurant
        const updateResult = await restaurantApi.updateRestaurant(existingResult.data.id, {
          restaurantName: formData.restaurantName,
          displayName: formData.restaurantName,
          categories: formData.categories,
          ingredients: formData.ingredients,
          setupCompleted: false // Keep as false until images are uploaded
        });
        
        if (!updateResult.success) {
          throw new Error(updateResult.error || 'Failed to update restaurant');
        }
        
        console.log('Restaurant info updated');
      } else {
        // CREATE new restaurant (only if doesn't exist)
        const createResult = await restaurantApi.createRestaurant({
          uid: user.uid,
          restaurantName: formData.restaurantName,
          displayName: formData.restaurantName,
          categories: formData.categories,
          ingredients: formData.ingredients,
          setupCompleted: false
        });
        
        if (!createResult.success) {
          // If creation fails because restaurant exists, try to update
          if (createResult.error?.includes('already exists')) {
            console.log('Restaurant already exists, trying to find and update');
            
            const findResult = await restaurantApi.getRestaurantByUid(user.uid);
            if (findResult.success && findResult.data) {
              const updateResult = await restaurantApi.updateRestaurant(findResult.data.id, {
                restaurantName: formData.restaurantName,
                displayName: formData.restaurantName,
                categories: formData.categories,
                ingredients: formData.ingredients,
                setupCompleted: false
              });
              
              if (!updateResult.success) {
                throw new Error(updateResult.error || 'Failed to update existing restaurant');
              }
            } else {
              throw new Error('Restaurant exists but could not be found for update');
            }
          } else {
            throw new Error(createResult.error || 'Failed to create restaurant');
          }
        }
        
        console.log('Restaurant info created');
      }
      
      // Pass data as navigation parameters
      router.push({
        pathname: "/(auth-restaurant)/profile-pictures",
        params: { 
          restaurantData: JSON.stringify(formData)
        }
      });
      
    } catch (error) {
      console.error('Error saving restaurant info:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to save restaurant information');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.background}>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>General information</Text>
          <Text style={styles.subtitle}>
            Upload your restaurant's general information
          </Text>
        </View>

        <View style={styles.formContainer}>
          {/* Restaurant name */}
          <Text style={styles.sectionTitle} >Restaurant name</Text>
          <TextInput 
            style={styles.textField} 
            placeholder="ex: My Restaurant"
            placeholderTextColor={'#888'}
            value={restaurantName}
            onChangeText={setRestaurantName}
            editable={!loading}
          />

          <View style={styles.separator}></View>

          {/* Categories */}
          <Text style={styles.sectionTitle} >Categories</Text>
          <View style={styles.flatListContainer}>
            <FlatList
              data={ImageButtonsData}
              numColumns={3}
              keyExtractor={(imageButtonItem) => imageButtonItem.id}
              contentContainerStyle={styles.imageButtonContainer}
              columnWrapperStyle={styles.columnWrapper}
              scrollEnabled={false}
              renderItem={({item}) => {
                const isSelected = selectedCategories.includes(item.id);
                return (
                  <TouchableOpacity 
                    style={[
                      styles.imageButton,
                      isSelected && styles.imageButtonSelected
                    ]}
                    onPress={() => toggleCategory(item.id)}
                    activeOpacity={0.7}
                    disabled={loading}
                  >
                    {isSelected && (
                      <View style={styles.checkmarkContainer}>
                        <MaterialIcons name="check-circle" style={styles.checkmarkIcon} />
                      </View>
                    )}
                    <Image
                      source={getImagesForImageButtons(item.imageKey)}
                      style={[
                        styles.picImageButton,
                        isSelected && styles.imageSelected
                      ]}
                      resizeMode='contain'
                    />
                    <Text style={[
                      styles.imageButtonTitle,
                      isSelected && styles.textSelected
                    ]}>{item.title}</Text>
                  </TouchableOpacity>
                );
              }}
            />
          </View>

          <View style={styles.separator}></View>

          {/* Ingredients */}
          <Text style={styles.sectionTitle} >Ingredients</Text>

          <View style={styles.ingredientsContainer}>
            {/* List of ingredients */}
            {ingredients.map((ingredient, index) => (
              <View key={index} style={styles.ingredientListItem}>
                <FontAwesome name="circle" style={styles.bulletPoint} />
                <Text style={styles.ingredientText}>{ingredient}</Text>
                <TouchableOpacity 
                  onPress={() => removeIngredient(index)}
                  style={styles.removeButton}
                  disabled={loading}
                >
                  <Ionicons name="close-circle" style={styles.removeIcon} />
                </TouchableOpacity>
              </View>
            ))}
            
            {/* Add ingredient input */}
            <View style={styles.ingredientListInput}>
              <TouchableOpacity onPress={addIngredient} disabled={loading}>
                <Ionicons name="add-circle" style={styles.addButton} />
              </TouchableOpacity>
              <TextInput
                style={styles.listInput}
                placeholder="Add an ingredient..."
                placeholderTextColor="#888"
                value={newIngredient}
                onChangeText={setNewIngredient}
                onSubmitEditing={handleIngredientSubmit}
                returnKeyType="done"
                editable={!loading}
              />
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
              style={[styles.navButton, styles.completeButton, loading && styles.completeButtonDisabled]}
              onPress={saveAndContinue}
              disabled={!restaurantName.trim() || selectedCategories.length === 0 || loading}
            >
              <Text style={styles.completeButtonText}>
                {loading ? 'Saving...' : 'Next'}
              </Text>
            </TouchableOpacity>
          </View>
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
  container: {
    flex: 1,
  },
  formContainer: {
    flex: 1,
    width: '100%',
    maxWidth: 1000,
    marginHorizontal: 'auto',
  },
  scrollContent: {
    flexGrow: 1,
    backgroundColor: colors.third,
    paddingHorizontal: 20,
    paddingVertical: 40,
    alignItems: 'center',
  },
  sectionTitle: {
    fontWeight: '700',
    fontSize: 30,
    color: colors.defaultColor,
    marginBottom: 10,
    width: '100%',
    maxWidth: 1000,
    textAlign: 'left',
  },
  textField: {
    backgroundColor: colors.second,
    borderBottomWidth: 1,
    borderBottomColor: colors.defaultColor,
    height: 50,
    paddingHorizontal: 15,
    fontSize: 16,
    width: '100%',
    maxWidth: 1000,
    borderRadius: 8,
    color: colors.text,
  },
  separator: {
    height: 40,
  },
  flatListContainer: {
    width: '100%',
    maxWidth: 1000,
  },
  columnWrapper: {
    justifyContent: 'space-evenly',
    width: '100%',
    marginBottom: 20,
  },
  imageButtonContainer: {
    width: '100%',
    paddingBottom: 50,
  },
  imageButton:{
    flex: 1,
    marginHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100,
    maxWidth: '33%',
    paddingVertical: 15,
    borderRadius: 12,
    backgroundColor: colors.second,
    position: 'relative',
  },
  imageButtonSelected: {
    backgroundColor: colors.defaultColor + '20',
    borderWidth: 2,
    borderColor: colors.defaultColor,
  },
  picImageButton: {
    width: 80,
    height: 80,
    aspectRatio: 1,
  },
  imageSelected: {
    opacity: 0.8,
  },
  checkmarkContainer: {
    position: 'absolute',
    top: 5,
    right: 5,
    zIndex: 1,
  },
  checkmarkIcon: {
    fontSize: 24,
    color: colors.defaultColor,
  },
  imageButtonTitle: {
    fontSize: 14,
    color: colors.text,
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '500',
  },
  textSelected: {
    color: colors.defaultColor,
    fontWeight: '700',
  },
  listInput: {
    backgroundColor: colors.second,
    borderBottomWidth: 1,
    borderBottomColor: colors.defaultColor,
    height: 40,
    flex: 1,
    paddingHorizontal: 10,
    fontSize: 16,
    marginLeft: 10,
    borderRadius: 8,
    color: colors.text,
  },
  ingredientListInput: {
    marginVertical: 10,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  ingredientListItem: {
    marginVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 5,
    paddingVertical: 8,
    backgroundColor: colors.second,
    borderRadius: 8,
  },
  bulletPoint: {
    fontSize: 7,
    color: colors.defaultColor,
    marginHorizontal: 8,
  },
  ingredientText: {
    fontSize: 16,
    color: colors.text,
    flex: 1,
    marginLeft: 5,
  },
  ingredientsContainer: {
    width: '100%',
    maxWidth: 1000,
  },
  addButton: {
    fontSize: 24,
    color: colors.defaultColor,
  },
  removeButton: {
    padding: 5,
  },
  removeIcon: {
    fontSize: 20,
    color: '#ff4444',
  },
  submitButton: {
    backgroundColor: colors.defaultColor,
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 10,
    marginTop: 20,
    alignItems: 'center',
    width: '100%',
    maxWidth: 1000,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  navigationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 1000,
    marginTop: 100,
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
});