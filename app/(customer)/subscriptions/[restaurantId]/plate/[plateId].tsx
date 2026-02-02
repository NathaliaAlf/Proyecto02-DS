// (customer)/restaurants/[categoryId]/[restaurantId]/plate/[plateId].tsx
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useCart } from '@/hooks/useCart';
import { menuApi } from '@/services/api/menuApi';
import { restaurantApi } from '@/services/api/restaurantApi';
import { Plate } from '@/types/menu';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { Checkbox } from 'react-native-paper';

export default function PlateDetailScreen() {
  const { colors } = useTheme();
  const { user } = useAuth(); // Get user from auth context
  const styles = createStyles(colors);
  const { restaurantId, plateId, plateName } = useLocalSearchParams<{
    restaurantId: string;
    plateId: string;
    plateName: string;
  }>();
  
  const { addToCart, loading: cartLoading } = useCart();
  
  const [plate, setPlate] = useState<Plate | null>(null);
  const [restaurantName, setRestaurantName] = useState<string>('');
  const [menuId, setMenuId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string[]>>({});
  const [selectedIngredients, setSelectedIngredients] = useState<number[]>([]);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    loadPlate();
  }, [restaurantId, plateId]);

  const loadPlate = async () => {
    try {
      if (!restaurantId || !plateId) return;
      
      // Get active menu for the restaurant
      const menuResult = await menuApi.getActiveMenu(restaurantId);
      if (menuResult.success && menuResult.data) {
        setMenuId(menuResult.data.id);
        const foundPlate = menuResult.data.plates.find(p => p.id === plateId);
        setPlate(foundPlate || null);
        
        // Get restaurant name
        const restaurantResult = await restaurantApi.getRestaurant(restaurantId);
        if (restaurantResult.success && restaurantResult.data) {
          setRestaurantName(restaurantResult.data.restaurantName);
        }
      }
    } catch (error) {
      console.error('Error loading plate:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleIngredient = (index: number) => {
    setSelectedIngredients(prev => {
      if (prev.includes(index)) {
        return prev.filter(i => i !== index);
      } else {
        return [...prev, index];
      }
    });
  };

  const toggleOption = (sectionId: string, optionId: string, multiple: boolean) => {
    setSelectedOptions(prev => {
      const current = prev[sectionId] || [];
      
      if (multiple) {
        // Toggle the option
        if (current.includes(optionId)) {
          return {
            ...prev,
            [sectionId]: current.filter(id => id !== optionId)
          };
        } else {
          return {
            ...prev,
            [sectionId]: [...current, optionId]
          };
        }
      } else {
        // Single selection - replace
        return {
          ...prev,
          [sectionId]: [optionId]
        };
      }
    });
  };

  const incrementQuantity = () => {
    setQuantity(prev => prev + 1);
  };

  const decrementQuantity = () => {
    if (quantity > 1) {
      setQuantity(prev => prev - 1);
    }
  };

  const calculateTotalPrice = () => {
    if (!plate) return 0;
    
    let total = plate.basePrice;
    
    Object.entries(selectedOptions).forEach(([sectionId, optionIds]) => {
      const section = plate.sections.find(s => s.id === sectionId);
      if (section) {
        optionIds.forEach(optionId => {
          const option = section.options.find(o => o.id === optionId);
          if (option?.additionalCost) {
            total += option.additionalCost;
          }
        });
      }
    });
    
    return total * quantity;
  };

  const getSelectedOptionDetails = () => {
    if (!plate) return [];
    
    const selectedOptionDetails: Array<{
      sectionId: string;
      sectionName: string;
      optionId: string;
      optionName: string;
      additionalCost: number;
    }> = [];
    
    Object.entries(selectedOptions).forEach(([sectionId, optionIds]) => {
      const section = plate.sections.find(s => s.id === sectionId);
      if (section) {
        optionIds.forEach(optionId => {
          const option = section.options.find(o => o.id === optionId);
          if (option) {
            selectedOptionDetails.push({
              sectionId,
              sectionName: section.name,
              optionId,
              optionName: option.name,
              additionalCost: option.additionalCost || 0
            });
          }
        });
      }
    });
    
    return selectedOptionDetails;
  };

  const getCustomIngredients = () => {
    if (!plate) return [];
    
    // Filter out deselected ingredients
    const customIngredients = plate.baseIngredients.filter((_, index) => 
      !selectedIngredients.includes(index)
    );
    
    return customIngredients;
  };

  const handleAddToOrder = async () => {
    // Check if user is logged in
    if (!user) {
      Alert.alert(
        'Login Required',
        'You need to be logged in to add items to your cart.',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Login',
            onPress: () => router.push('/(auth-customer)/login')
          }
        ]
      );
      return;
    }

    // Check if user is a customer
    if (user.userType !== 'customer') {
      Alert.alert(
        'Account Type Error',
        'Only customer accounts can add items to cart.',
        [
          {
            text: 'OK',
            style: 'default',
          }
        ]
      );
      return;
    }

    if (!plate || !restaurantId || !menuId) {
      Alert.alert('Error', 'Missing required information');
      return;
    }
    
    // Validate required sections
    for (const section of plate.sections) {
      if (section.required && (!selectedOptions[section.id] || selectedOptions[section.id].length === 0)) {
        Alert.alert('Required Option', `Please select an option for "${section.name}"`);
        return;
      }
    }
    
    setAddingToCart(true);
    
    try {
      // Calculate the price
      const selectedOptionArray = Object.entries(selectedOptions).flatMap(([sectionId, optionIds]) =>
        optionIds.map(optionId => ({ sectionId, optionId }))
      );
      
      const priceResult = await menuApi.calculateCustomizedPlate(
        menuId,
        plateId!,
        selectedOptionArray
      );
      
      if (!priceResult.success || !priceResult.data) {
        throw new Error(priceResult.error || 'Failed to calculate price');
      }
      
      const customizedPlate = priceResult.data;
      
      // Prepare cart item data
      const cartItem = {
        menuId,
        plateId: plate.id,
        plateName: plate.name,
        restaurantId,
        restaurantName,
        price: customizedPlate.finalPrice / quantity, // Price per item
        quantity,
        selectedOptions: getSelectedOptionDetails(),
        variantId: customizedPlate.variantId,
        customIngredients: customizedPlate.customIngredients || getCustomIngredients(),
        imageUrl: plate.imageUrl
      };
      
      // Add to cart
      const result = await addToCart(
        menuId,
        plate.id,
        plate.name,
        restaurantId,
        restaurantName,
        customizedPlate.finalPrice / quantity, // Price per item
        quantity,
        getSelectedOptionDetails(),
        customizedPlate.variantId,
        customizedPlate.customIngredients || getCustomIngredients(),
        plate.imageUrl
      );
      
      if (result) {
        Alert.alert(
          'Added to Cart',
          `${quantity}x "${plate.name}" added to your cart`,
          [
            {
              text: 'Continue Shopping',
              style: 'cancel',
              onPress: () => router.back()
            },
            {
              text: 'Go to Cart',
              onPress: () => router.push('/Cart')
            }
          ]
        );
      }
      
    } catch (error) {
      console.error('Error adding to cart:', error);
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to add item to cart'
      );
    } finally {
      setAddingToCart(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.tint} />
        <Text style={styles.loadingText}>Loading plate details...</Text>
      </View>
    );
  }

  if (!plate) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Plate not found</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={() => router.back()}
        >
          <Text style={styles.retryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Plate Image with Overlay Text */}
        <View style={styles.imageContainer}>
          {plate.imageUrl ? (
            <Image 
              source={{ uri: plate.imageUrl }} 
              style={styles.plateImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.plateImage, styles.noImage]}>
              <Text style={styles.noImageText}>No Image Available</Text>
            </View>
          )}
          
          {/* Gradient Overlay */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.7)']}
            style={styles.gradientOverlay}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 0, y: 1 }}
          />
          
          {/* Text Overlay */}
          <View style={styles.textOverlay}>
            <Text style={styles.plateNameOverlay}>{plate.name}</Text>
            <Text style={styles.plateDescriptionOverlay}>{plate.description}</Text>
          </View>
        </View>
        
        {/* Plate Info */}
        <View style={styles.content}>
          
          {/* Customizable Sections */}
          {plate.sections.map(section => (
            <View key={section.id} style={styles.section}>
              <Text style={styles.sectionTitle}>
                {section.name}
                {section.required && <Text style={styles.required}> *</Text>}
                {section.multiple && <Text style={styles.multipleNote}> (Choose multiple)</Text>}
              </Text>
              
              <View style={styles.optionsList}>
                {section.options.map(option => {
                  const isSelected = selectedOptions[section.id]?.includes(option.id);
                  const optionPrice = option.additionalCost ? `+$${option.additionalCost.toFixed(2)}` : '';
                  
                  return (
                    <TouchableOpacity
                      key={option.id}
                      style={[
                        styles.optionItem,
                        isSelected && styles.optionItemSelected
                      ]}
                      onPress={() => toggleOption(section.id, option.id, section.multiple)}
                      disabled={section.required && section.options.length === 1}
                    >
                      <Checkbox.Android
                        status={isSelected ? 'checked' : 'unchecked'}
                        onPress={() => toggleOption(section.id, option.id, section.multiple)}
                        disabled={section.required && section.options.length === 1}
                        color={colors.defaultColor}
                        uncheckedColor={colors.defaultColor}
                      />
                      
                      <View style={styles.optionInfo}>
                        <View style={styles.optionHeader}>
                          <Text style={[
                            styles.optionName,
                            isSelected && styles.optionNameSelected
                          ]}>
                            {option.name}
                          </Text>
                          {optionPrice ? (
                            <Text style={styles.optionPrice}>{optionPrice}</Text>
                          ) : null}
                        </View>
                        
                        {section.ingredientDependent && option.ingredients && option.ingredients.length > 0 && (
                          <Text style={styles.optionIngredients}>
                            Adds: {option.ingredients.join(', ')}
                          </Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))}

          {/* Base Ingredients as Toggle Buttons */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ingredients</Text>
            <Text style={styles.ingredientsSubtitle}>Tap to remove ingredients</Text>
            <View style={styles.ingredientsContainer}>
              {plate.baseIngredients.map((ingredient, index) => {
                const isSelected = selectedIngredients.includes(index);
                
                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.ingredientButton,
                      isSelected ? styles.ingredientButtonSelected : styles.ingredientButtonDefault
                    ]}
                    onPress={() => toggleIngredient(index)}
                  >
                    <Text style={[
                      styles.ingredientButtonText,
                      isSelected ? styles.ingredientButtonTextSelected : styles.ingredientButtonTextDefault
                    ]}>
                      {ingredient}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
          <View style={styles.priceContainer}>
            <Text style={styles.totalPriceLabel}>Total:</Text>
            <Text style={styles.totalPriceValue}>${calculateTotalPrice().toFixed(2)}</Text>
          </View>
        </View>
      </ScrollView>
      
      {/* Fixed Bottom Add to Cart Section */}
      <View style={styles.footerContainer}>
        <View style={styles.quantityContainer}>
          <TouchableOpacity 
            style={[styles.quantityButton, quantity === 1 && styles.quantityButtonDisabled]}
            onPress={decrementQuantity}
            disabled={quantity === 1}
          >
            <Text style={[styles.quantityButtonText, quantity === 1 && styles.quantityButtonTextDisabled]}>
              -
            </Text>
          </TouchableOpacity>
          
          <Text style={styles.quantityText}>{quantity}</Text>
          
          <TouchableOpacity 
            style={styles.quantityButton}
            onPress={incrementQuantity}
          >
            <Text style={styles.quantityButtonText}>+</Text>
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity 
          style={[
            styles.addToCartButton,
            (addingToCart || cartLoading) && styles.addToCartButtonDisabled
          ]}
          onPress={handleAddToOrder}
          disabled={addingToCart || cartLoading}
        >
          {addingToCart ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Text style={styles.addToCartButtonText}>
              {user ? 'Add to Cart' : 'Login to Order'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    color: colors.secondaryText,
    fontSize: 16,
  },
  errorText: {
    fontSize: 18,
    color: colors.error,
    marginBottom: 20,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120, // Space for fixed footer
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 250,
  },
  plateImage: {
    width: '100%',
    height: '100%',
  },
  noImage: {
    backgroundColor: colors.second,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noImageText: {
    fontSize: 16,
    color: colors.secondaryText,
  },
  gradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
  },
  textOverlay: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
  },
  plateNameOverlay: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  plateDescriptionOverlay: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 22,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 25,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 10,
  },
  ingredientsSubtitle: {
    fontSize: 14,
    color: colors.secondaryText,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  required: {
    color: colors.error,
  },
  multipleNote: {
    fontSize: 14,
    color: colors.secondaryText,
    fontStyle: 'italic',
  },

  ingredientsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  ingredientButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  ingredientButtonDefault: {
    backgroundColor: '#000000',
    borderColor: colors.border,
  },
  ingredientButtonSelected: {
    backgroundColor: colors.second,
    borderColor: 'transparent',
  },
  ingredientButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  ingredientButtonTextDefault: {
    color: 'white',
  },
  ingredientButtonTextSelected: {
    color: colors.defaultColor || 'white',
  },
  // Options as checkbox list
  optionsList: {
    gap: 5,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionItemSelected: {
    backgroundColor: colors.primary + '20', // 20% opacity
    borderColor: colors.primary,
  },
  optionInfo: {
    flex: 1,
    marginLeft: 8,
  },
  optionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  optionName: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
    flex: 1,
    marginRight: 10,
  },
  optionNameSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  optionPrice: {
    fontSize: 16,
    color: colors.success,
    fontWeight: '600',
  },
  optionIngredients: {
    fontSize: 12,
    color: colors.secondaryText,
    fontStyle: 'italic',
  },
  // Fixed footer styles
  footerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.defaultColor,
    borderTopWidth: 1,
    borderRadius: 35,
    margin: 20,
    height: 70,
    borderTopColor: colors.border,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 4,
    marginRight: 16,
  },
  quantityButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    color: colors.backgroundColor,
  },
  quantityButtonDisabled: {
    opacity: 0.5,
  },
  quantityButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  quantityButtonTextDisabled: {
    color: colors.third,
  },
  quantityText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.background,
    marginHorizontal: 12,
    minWidth: 20,
    textAlign: 'center',
  },
  priceContainer: {
    flex: 1,
    marginRight: 16,
    flexDirection: 'row',
    alignItems: 'center'
  },
  totalPriceLabel: {
    fontSize: 30,
    fontWeight:700,
    color: colors.secondaryText,
    marginBottom: 2,
  },
  totalPriceValue: {
    fontSize: 30,
    fontWeight: 'bold',
    color: colors.primary,
    marginLeft: 10,
  },
  addToCartButton: {
    paddingHorizontal: 24,
    borderRadius: 12,
    minWidth: 140,
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
  },
  addToCartButtonDisabled: {
    opacity: 0.7,
  },
  addToCartButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});