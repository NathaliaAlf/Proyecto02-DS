// (customer)/restaurants/[categoryId]/[restaurantId]/plate/[plateId].tsx
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useCart } from '@/hooks/useCart';
import { menuApi } from '@/services/api/menuApi';
import { restaurantApi } from '@/services/api/restaurantApi';
import { Ingredient, Plate } from '@/types/menu';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { Checkbox, RadioButton } from 'react-native-paper';

export default function PlateDetailScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
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
  const [removedIngredients, setRemovedIngredients] = useState<Set<string>>(new Set());
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState<string>('');
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [modalNotes, setModalNotes] = useState('');

  useEffect(() => {
    loadPlate();
  }, [restaurantId, plateId]);

  const loadPlate = async () => {
    try {
      if (!restaurantId || !plateId) return;
      
      const menuResult = await menuApi.getActiveMenu(restaurantId);
      if (menuResult.success && menuResult.data) {
        setMenuId(menuResult.data.id);
        const foundPlate = menuResult.data.plates.find(p => p.id === plateId);
        setPlate(foundPlate || null);
        
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

  const toggleIngredient = (ingredientName: string, isObligatory: boolean) => {
    // Don't allow toggling obligatory ingredients
    if (isObligatory) {
      return;
    }

    setRemovedIngredients(prev => {
      const newSet = new Set(prev);
      if (newSet.has(ingredientName)) {
        newSet.delete(ingredientName);
      } else {
        newSet.add(ingredientName);
      }
      return newSet;
    });
  };

  const toggleOption = (sectionId: string, optionId: string, multiple: boolean) => {
    setSelectedOptions(prev => {
      const current = prev[sectionId] || [];
      
      if (multiple) {
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

  const getCurrentIngredients = () => {
    if (!plate) return [];
    
    // Start with base ingredients
    let allIngredients = [...plate.baseIngredients];
    
    // Add ingredients from selected options that are ingredient-dependent
    Object.entries(selectedOptions).forEach(([sectionId, optionIds]) => {
      const section = plate.sections.find(s => s.id === sectionId);
      if (section?.ingredientDependent) {
        optionIds.forEach(optionId => {
          const option = section.options.find(o => o.id === optionId);
          if (option?.ingredients) {
            allIngredients = [...allIngredients, ...option.ingredients];
          }
        });
      }
    });
    
    // Remove duplicates based on ingredient name while preserving the first occurrence
    const uniqueIngredients = allIngredients.reduce((acc, ing) => {
      if (!acc.some(i => i.name === ing.name)) {
        acc.push(ing);
      }
      return acc;
    }, [] as Ingredient[]);
    
    return uniqueIngredients;
  };

  const getFilteredIngredientsForCart = (): Ingredient[] => {
    if (!plate) return [];
    
    // Get all ingredients (same as getCurrentIngredients)
    let allIngredients = [...plate.baseIngredients];
    
    Object.entries(selectedOptions).forEach(([sectionId, optionIds]) => {
      const section = plate.sections.find(s => s.id === sectionId);
      if (section?.ingredientDependent) {
        optionIds.forEach(optionId => {
          const option = section.options.find(o => o.id === optionId);
          if (option?.ingredients) {
            allIngredients = [...allIngredients, ...option.ingredients];
          }
        });
      }
    });
    
    // Remove duplicates
    const uniqueIngredients = allIngredients.reduce((acc, ing) => {
      if (!acc.some(i => i.name === ing.name)) {
        acc.push(ing);
      }
      return acc;
    }, [] as Ingredient[]);
    
    // Filter out removed ingredients (but keep obligatory ones)
    return uniqueIngredients.filter(ing => 
      ing.obligatory || !removedIngredients.has(ing.name)
    );
  };

  const handleOpenNotesModal = () => {
    setModalNotes(notes);
    setShowNotesModal(true);
  };

  const handleSaveNotes = () => {
    setNotes(modalNotes);
    setShowNotesModal(false);
  };

  const handleCancelNotes = () => {
    setShowNotesModal(false);
  };

  const handleAddToOrder = async () => {
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
    
    for (const section of plate.sections) {
      if (section.required && (!selectedOptions[section.id] || selectedOptions[section.id].length === 0)) {
        Alert.alert('Required Option', `Please select an option for "${section.name}"`);
        return;
      }
    }
    
    setAddingToCart(true);
    
    try {
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
      
      // Use the filtered ingredients for cart
      const filteredIngredients = getFilteredIngredientsForCart();
      
      const result = await addToCart(
        menuId,
        plate.id,
        plate.name,
        restaurantId,
        restaurantName,
        customizedPlate.finalPrice / quantity,
        quantity,
        getSelectedOptionDetails().map(option => ({
          ...option,
          ingredientDependent: plate.sections.find(s => s.id === option.sectionId)?.ingredientDependent || false,
          optionIngredients: plate.sections
            .find(s => s.id === option.sectionId)
            ?.options.find(o => o.id === option.optionId)
            ?.ingredients || []
        })),
        customizedPlate.variantId,
        filteredIngredients,
        plate.imageUrl,
        notes.trim(),
        // NEW: Add plate details
        {
          basePrice: plate.basePrice,
          description: plate.description,
          baseIngredients: plate.baseIngredients,
          sections: plate.sections.map(section => ({
            id: section.id,
            name: section.name,
            required: section.required,
            multiple: section.multiple,
            ingredientDependent: section.ingredientDependent,
            options: section.options.map(option => ({
              id: option.id,
              name: option.name,
              additionalCost: option.additionalCost,
              ingredients: option.ingredients || []
            }))
          })),
          customizationState: {
            removedIngredients: Array.from(removedIngredients),
            selectedOptions: { ...selectedOptions },
            quantity,
            notes: notes.trim()
          },
          currentIngredients: getFilteredIngredientsForCart()
        }
      );
      
      if (result) {
        Alert.alert(
          'Added to Cart',
          `${quantity}x "${plate.name}" added to your cart${notes ? ' with notes' : ''}`,
          [
            {
              text: 'Continue Shopping',
              style: 'cancel',
              onPress: () => {
                setNotes('');
                router.back();
              }
            },
            {
              text: 'Go to Cart',
              onPress: () => {
                setNotes('');
                router.push('/Cart');
              }
            }
          ]
        );
      }
      
    } catch (error) {
      console.error('Error adding to cart:', error);
      
      // Check if it's a restaurant mismatch error
      const errorMessage = error instanceof Error ? error.message : 'Failed to add item to cart';
      
      if (errorMessage.includes('Your cart contains items from')) {
        // Extract restaurant names from error message
        const match = errorMessage.match(/Your cart contains items from (.*?)\. Please checkout or clear cart before adding items from (.*)/);
        
        if (match) {
          const currentRestaurant = match[1];
          const newRestaurant = match[2] || restaurantName;
          
          Alert.alert(
            'Different Restaurant',
            `Your cart contains items from "${currentRestaurant}".\n\nYou're trying to add an item from "${newRestaurant}".\n\nWould you like to:`,
            [
              {
                text: 'Keep Current Cart',
                style: 'cancel',
                onPress: () => {
                  // Option 1: Keep current cart, go to cart screen
                  router.push('/Cart');
                }
              },
              {
                text: 'View Current Cart',
                onPress: () => {
                  router.push('/Cart');
                }
              },
              {
                text: 'Clear & Add New Item',
                style: 'destructive',
                onPress: async () => {
                  // Option 3: Clear cart and add new item
                  try {
                    setAddingToCart(true);
                    
                    // Calculate price again (in case it wasn't calculated before error)
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
                    const filteredIngredients = getFilteredIngredientsForCart();
                    
                    // Store the item data to add after clearing
                    const itemToAdd = {
                      menuId,
                      plateId: plate.id,
                      plateName: plate.name,
                      restaurantId,
                      restaurantName,
                      price: customizedPlate.finalPrice / quantity,
                      quantity,
                      selectedOptions: getSelectedOptionDetails(),
                      variantId: customizedPlate.variantId,
                      customIngredients: filteredIngredients,
                      imageUrl: plate.imageUrl,
                      notes: notes.trim()
                    };
                    
                    // Navigate to cart with instructions to clear and add this item
                    router.push({
                      pathname: '/Cart',
                      params: { 
                        clearAndAddItem: 'true',
                        itemData: JSON.stringify(itemToAdd)
                      }
                    });
                    
                  } catch (navError) {
                    console.error('Error preparing to clear cart:', navError);
                    Alert.alert('Error', 'Failed to prepare item for adding. Please try again.');
                    setAddingToCart(false);
                  }
                }
              }
            ]
          );
        } else {
          // Fallback if regex doesn't match
          Alert.alert(
            'Different Restaurant',
            errorMessage + '\n\nPlease checkout or clear your cart first.',
            [
              { 
                text: 'Go to Cart', 
                onPress: () => router.push('/Cart') 
              },
              { text: 'OK', style: 'default' }
            ]
          );
        }
      } else {
        // Other errors
        Alert.alert('Error', errorMessage);
      }
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

  const currentIngredients = getCurrentIngredients();

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
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
          
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.7)']}
            style={styles.gradientOverlay}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 0, y: 1 }}
          />
          
          <View style={styles.textOverlay}>
            <Text style={styles.plateNameOverlay}>{plate.name}</Text>
            <Text style={styles.plateDescriptionOverlay}>{plate.description}</Text>
          </View>
        </View>
        
        <View style={styles.content}>
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
                      {section.multiple ? (
                        <Checkbox.Android
                          status={isSelected ? 'checked' : 'unchecked'}
                          onPress={() => toggleOption(section.id, option.id, section.multiple)}
                          disabled={section.required && section.options.length === 1}
                          color={colors.defaultColor}
                          uncheckedColor={colors.defaultColor}
                        />
                      ) : (
                        <RadioButton.Android
                          value={option.id}
                          status={isSelected ? 'checked' : 'unchecked'}
                          onPress={() => toggleOption(section.id, option.id, section.multiple)}
                          disabled={section.required && section.options.length === 1}
                          color={colors.defaultColor}
                          uncheckedColor={colors.defaultColor}
                        />
                      )}
                      
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
                            Adds: {option.ingredients.map(ing => ing.name).join(', ')}
                          </Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ingredients</Text>
            <Text style={styles.ingredientsSubtitle}>
              Tap to remove ingredients. <Text style={styles.mandatoryNote}>Red items cannot be removed.</Text>
            </Text>
            <View style={styles.ingredientsContainer}>
              {getCurrentIngredients().map((ingredient, index) => {
                const isRemoved = removedIngredients.has(ingredient.name);
                const isMandatory = ingredient.obligatory;
                
                return (
                  <TouchableOpacity
                    key={`${ingredient.name}-${index}`}
                    style={[
                      styles.ingredientButton,
                      isMandatory && styles.ingredientButtonMandatory,
                      isRemoved && !isMandatory && styles.ingredientButtonRemoved
                    ]}
                    onPress={() => toggleIngredient(ingredient.name, isMandatory)}
                    activeOpacity={isMandatory ? 1 : 0.7}
                    disabled={isMandatory}
                  >
                    <Text style={[
                      styles.ingredientButtonText,
                      isMandatory && styles.ingredientButtonTextMandatory,
                      isRemoved && !isMandatory && styles.ingredientButtonTextRemoved
                    ]}>
                      {ingredient.name}
                      {isRemoved && !isMandatory}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Comments/Notes Section */}
          <View style={styles.notesSection}>
            <Text style={styles.sectionTitle}>Comments</Text>
            <Text style={styles.notesSubtitle}>Add any special requests or notes for this item</Text>
            
            {/* Notes Preview Button */}
            <TouchableOpacity 
              style={styles.notesPreviewButton}
              onPress={handleOpenNotesModal}
            >
              <Text style={[
                styles.notesPreviewText,
                !notes && styles.notesPreviewPlaceholder
              ]}>
                {notes || "E.g., Extra spicy, lactose free, separate sauce..."}
              </Text>
            </TouchableOpacity>
            
            {notes ? (
              <Text style={styles.notesCharCount}>
                {notes.length}/500 characters
              </Text>
            ) : null}
          </View>

          <View style={styles.priceContainer}>
            <Text style={styles.totalPriceLabel}>Total:</Text>
            <Text style={styles.totalPriceValue}>${calculateTotalPrice().toFixed(2)}</Text>
          </View>
        </View>
      </ScrollView>
      
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

      {/* Notes Modal */}
      <Modal
        visible={showNotesModal}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCancelNotes}
      >
        <KeyboardAvoidingView 
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <TouchableOpacity 
            style={styles.modalBackground}
            activeOpacity={1}
            onPress={handleCancelNotes}
          />
          
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Special Instructions</Text>
              <Text style={styles.modalSubtitle}>Add any special requests or notes for this item</Text>
            </View>
            
            <TextInput
              style={styles.modalTextInput}
              placeholder="E.g., Extra spicy, lactose free, separate sauce..."
              placeholderTextColor={colors.second}
              multiline
              numberOfLines={6}
              maxLength={500}
              value={modalNotes}
              onChangeText={setModalNotes}
              autoFocus={true}
              textAlignVertical="top"
            />
            
            <Text style={styles.modalCharCount}>
              {modalNotes.length}/500 characters
            </Text>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.modalCancelButton}
                onPress={handleCancelNotes}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.modalSaveButton}
                onPress={handleSaveNotes}
              >
                <Text style={styles.modalSaveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
    color: '#DC2626',
    marginBottom: 20,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: colors.tint,
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
    paddingBottom: 120,
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
  notesSection: {
    marginBottom: 20,
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
  mandatoryNote: {
    color: '#DC2626',
    fontWeight: '600',
  },
  notesSubtitle: {
    fontSize: 14,
    color: colors.secondaryText,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  required: {
    color: '#DC2626',
  },
  multipleNote: {
    fontSize: 14,
    color: colors.secondaryText,
    fontStyle: 'italic',
  },
  notesPreviewButton: {
    backgroundColor: colors.third,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    minHeight: 150,
  },
  notesPreviewText: {
    fontSize: 15,
    color: colors.text,
    flex: 1,
    marginRight: 12,
  },
  notesPreviewPlaceholder: {
    color: colors.second,
    fontStyle: 'italic',
  },
  notesCharCount: {
    fontSize: 12,
    color: colors.secondaryText,
    textAlign: 'right',
    marginTop: 8,
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
    backgroundColor: colors.defaultColor,
  },
  ingredientButtonMandatory: {
    backgroundColor: '#7F1D1D',
    borderColor: '#DC2626',
    borderWidth: 2,
  },
  ingredientButtonRemoved: {
    backgroundColor: colors.second,
    borderColor: colors.second,
  },
  ingredientButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.background,
  },
  ingredientButtonTextMandatory: {
    color: '#FCA5A5',
    fontWeight: '600',
  },
  ingredientButtonTextRemoved: {
    color: colors.defaultColor,
  },
  ingredientButtonSelected: {
    backgroundColor: colors.second,
    borderColor: 'transparent',
  },
  ingredientButtonTextSelected: {
    color: colors.defaultColor,
  },
  optionsList: {
    gap: 5,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionItemSelected: {
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
    fontWeight: '700',
  },
  optionPrice: {
    fontSize: 16,
    color: colors.defaultColor,
    fontWeight: '600',
  },
  optionIngredients: {
    fontSize: 12,
    color: colors.secondaryText,
    fontStyle: 'italic',
  },

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
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
  },
  totalPriceLabel: {
    fontSize: 30,
    fontWeight: '700',
    color: colors.secondaryText,
    marginBottom: 2,
  },
  totalPriceValue: {
    fontSize: 30,
    fontWeight: 'bold',
    color: colors.defaultColor,
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
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    maxHeight: '80%',
  },
  modalHeader: {
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: colors.secondaryText,
  },
  modalTextInput: {
    backgroundColor: colors.third,
    padding: 16,
    fontSize: 16,
    color: colors.text,
    minHeight: 150,
    textAlignVertical: 'top',
  },
  modalCharCount: {
    fontSize: 12,
    color: colors.secondaryText,
    textAlign: 'right',
    marginTop: 8,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalCancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.secondaryText,
  },
  modalSaveButton: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: colors.defaultColor,
  },
  modalSaveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.background,
  },
});
