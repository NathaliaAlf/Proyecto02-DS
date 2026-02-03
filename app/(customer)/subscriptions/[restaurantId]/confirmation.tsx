// app/(customer)/subscriptions/[restaurantId]/confirmation/index.tsx
import { useAuth } from '@/context/AuthContext';
import { DaySchedule, SelectedMeal, useSubscription } from '@/context/SubscriptionContext';
import { useTheme } from '@/context/ThemeContext';
import { menuApi } from '@/services/api/menuApi';
import { restaurantApi } from '@/services/api/restaurantApi';
import { subscriptionApi } from '@/services/api/subscriptionApi';
import { Plate } from '@/types/menu';
import {
  CreateSubscriptionDayDTO,
  CreateSubscriptionDTO,
  CreateSubscriptionMealDTO,
  DayOfWeek,
  IngredientModification,
  SubscriptionDeliveryAddress,
  SubscriptionPlateItem,
  SubscriptionSelectedOption
} from '@/types/subscription';
import { Ionicons } from '@expo/vector-icons';
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

// Define the type for detailed plate customization (should match other files)
interface DetailedPlateCustomization {
  plateId: string;
  plateName: string;
  quantity: number;
  customization: {
    selectedOptions: Array<{
      sectionId: string;
      sectionName: string;
      optionId: string;
      optionName: string;
      additionalCost: number;
      ingredientDependent?: boolean;
      optionIngredients?: any[];
    }>;
    removedIngredients: string[];
    notes: string;
    totalPrice: number;
    plateDetails?: {
      basePrice: number;
      description: string;
      baseIngredients: any[];
      sections: any[];
      customizationState: any;
      currentIngredients: any[];
      imageUrl?: string;
    };
  };
}

// Helper function to format day name
const formatDayName = (dayId: string) => {
  const days: Record<string, string> = {
    'monday': 'Monday',
    'tuesday': 'Tuesday', 
    'wednesday': 'Wednesday',
    'thursday': 'Thursday',
    'friday': 'Friday',
    'saturday': 'Saturday',
    'sunday': 'Sunday'
  };
  
  return days[dayId] || dayId.charAt(0).toUpperCase() + dayId.slice(1);
};

// Helper function to format meal name
const formatMealName = (mealType: string) => {
  const meals: Record<string, string> = {
    'breakfast': 'Breakfast',
    'lunch': 'Lunch', 
    'dinner': 'Dinner'
  };
  
  return meals[mealType] || mealType.charAt(0).toUpperCase() + mealType.slice(1);
};

// Helper function to convert context schedule to API format
const convertToApiSchedule = (selectedSchedule: DaySchedule[], plates: Plate[]): CreateSubscriptionDayDTO[] => {
  return selectedSchedule
    .filter(day => 
      day.meals.some((meal: SelectedMeal) => 
        meal.selectedPlates && meal.selectedPlates.length > 0
      )
    )
    .map(day => {
      // Filter and map meals
      const meals: CreateSubscriptionMealDTO[] = day.meals
        .filter(meal => meal.selectedPlates && meal.selectedPlates.length > 0)
        .map(meal => {
          // Create items array from detailed plates
          const items: Omit<SubscriptionPlateItem, 'id' | 'addedAt' | 'totalPrice'>[] = [];
          
          (meal.selectedPlates as DetailedPlateCustomization[]).forEach((detailedPlate: DetailedPlateCustomization) => {
            const plate = plates.find(p => p.id === detailedPlate.plateId);
            if (plate) {
              // Convert selected options to SubscriptionSelectedOption format
              const selectedOptions: SubscriptionSelectedOption[] = detailedPlate.customization.selectedOptions.map(option => ({
                sectionId: option.sectionId,
                sectionName: option.sectionName,
                optionId: option.optionId,
                optionName: option.optionName,
                additionalCost: option.additionalCost
              }));

              // Convert removed ingredients to IngredientModification format
              const ingredientModifications: IngredientModification[] = detailedPlate.customization.removedIngredients.map(ingredientName => ({
                ingredientId: '', // We need to map ingredient name to ID
                ingredientName: ingredientName,
                action: 'remove',
                priceDifference: 0
              }));

              // Calculate costs
              const optionsCost = selectedOptions.reduce((sum, option) => sum + option.additionalCost, 0);
              const ingredientsCost = ingredientModifications.reduce((sum, mod) => sum + (mod.priceDifference || 0), 0);
              
              items.push({
                plateId: plate.id,
                plateName: plate.name,
                plateDescription: plate.description || '',
                imageUrl: plate.imageUrl || '',
                variantId: null,
                variantName: null,
                basePrice: plate.basePrice,
                variantPrice: 0,
                selectedOptions: selectedOptions,
                ingredientModifications: ingredientModifications,
                customIngredients: null,
                optionsCost: optionsCost,
                ingredientsCost: ingredientsCost,
                quantity: detailedPlate.quantity,
                notes: detailedPlate.customization.notes
              });
            }
          });

          return {
            type: meal.type as 'breakfast' | 'lunch' | 'dinner',
            deliveryTime: `${meal.startTime.getHours().toString().padStart(2, '0')}:${meal.startTime.getMinutes().toString().padStart(2, '0')}`,
            items: items,
            specialInstructions: '',
            completed: false
          };
        });

      return {
        day: day.day as DayOfWeek,
        meals: meals,
        skipDelivery: false
      };
    });
};

// Helper to format time as HH:mm
const formatTime = (date: Date): string => {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};

// delivery address
const getMockDeliveryAddress = (): SubscriptionDeliveryAddress => {
  return {
    id: '',
    label: '',
    address: '',
    city: '',
    postalCode: '',
    isDefault: true
  };
};

export default function SubscriptionConfirmationScreen() {
  const { restaurantId } = useLocalSearchParams<{ restaurantId: string }>();
  const { colors } = useTheme();
  const { selectedSchedule, clearSchedule } = useSubscription();
  const [restaurant, setRestaurant] = useState<any>(null);
  const [plates, setPlates] = useState<Plate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const styles = createStyles(colors);

  const { user } = useAuth();

  useEffect(() => {
    loadData();
  }, [restaurantId]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load restaurant info
      const restaurantResult = await restaurantApi.getRestaurant(restaurantId!);
      if (restaurantResult.success && restaurantResult.data) {
        setRestaurant(restaurantResult.data);
      } else {
        setError(restaurantResult.error || 'Restaurant not found');
        return;
      }

      // Load menu plates
      const menuResult = await menuApi.getActiveMenu(restaurantId!);
      if (menuResult.success && menuResult.data) {
        setPlates(menuResult.data.plates || []);
      }
    } catch (err) {
      console.error('Error loading data:', err);
      setError('An error occurred while loading data');
    } finally {
      setLoading(false);
    }
  };

  const getPlateById = (plateId: string) => {
    return plates.find(plate => plate.id === plateId);
  };

  const getMealTotal = (selectedPlates: DetailedPlateCustomization[]) => {
    return selectedPlates.reduce((sum, plate) => {
      return sum + (plate.customization.totalPrice * plate.quantity);
    }, 0);
  };

  const getDayTotal = (day: DaySchedule) => {
    let total = 0;
    day.meals.forEach((meal: SelectedMeal) => {
      if (meal.selectedPlates && Array.isArray(meal.selectedPlates)) {
        total += getMealTotal(meal.selectedPlates as DetailedPlateCustomization[]);
      }
    });
    return total;
  };

  const getSubscriptionTotal = () => {
    let total = 0;
    selectedSchedule.forEach((day: DaySchedule) => {
      total += getDayTotal(day);
    });
    return total;
  };

  const getTotalItemsCount = () => {
    let count = 0;
    selectedSchedule.forEach((day: DaySchedule) => {
      day.meals.forEach((meal: SelectedMeal) => {
        if (meal.selectedPlates && Array.isArray(meal.selectedPlates)) {
          count += (meal.selectedPlates as DetailedPlateCustomization[]).reduce(
            (sum, plate) => sum + plate.quantity, 
            0
          );
        }
      });
    });
    return count;
  };

  const handleConfirmSubscription = async () => {
    if (!restaurantId || !restaurant) {
      Alert.alert('Error', 'Restaurant information is missing');
      return;
    }

    const { customerApi } = await import('@/services/api/customerApi');
    const customerResult = await customerApi.getCustomerByUid(user?.uid || '');
    
    if (!customerResult.success || !customerResult.data) {
      Alert.alert('Error', 'Customer information not found. Please complete your profile.');
      return;
    }
    
    const customerId = customerResult.data.id;
    const mockDeliveryAddress = getMockDeliveryAddress();
    const now = new Date();
    const startDate = now.toISOString();
    const endDate = new Date(now.setMonth(now.getMonth() + 1)).toISOString(); // 1 month subscription

    try {
      setIsSubmitting(true);

      // Convert the schedule to API format
      const apiSchedule = convertToApiSchedule(selectedSchedule, plates);
      
      if (apiSchedule.length === 0) {
        Alert.alert('Error', 'No valid meals in subscription');
        return;
      }

      // Create subscription DTO
      const subscriptionData: CreateSubscriptionDTO = {
        customerId: customerId,
        restaurantId: restaurantId,
        frequency: 'weekly', // Default to weekly, you can make this configurable
        schedule: apiSchedule,
        deliveryAddress: mockDeliveryAddress,
        defaultDeliveryTime: '12:00', // Default time
        paymentMethod: 'card', // Replace with actual payment method
        startDate: startDate,
        endDate: endDate
      };

      console.log('Creating subscription with data:', subscriptionData);

      // Call the API to create subscription
      const result = await subscriptionApi.createSubscription(subscriptionData);
      
      if (result.success && result.data) {
        Alert.alert(
          'Subscription Created!',
          `Your subscription has been successfully created for ${getTotalItemsCount()} items across ${selectedSchedule.length} days.`,
          [
            { 
              text: 'OK', 
              onPress: () => {
                clearSchedule();
                router.replace('/(customer)');
              }
            }
          ]
        );
      } else {
        Alert.alert(
          'Subscription Failed',
          result.error || 'Failed to create subscription. Please try again.'
        );
      }
    } catch (error) {
      console.error('Error creating subscription:', error);
      Alert.alert(
        'Error',
        'An unexpected error occurred while creating your subscription. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderDaySection = ({ item: day, index: dayIndex }: { item: DaySchedule, index: number }) => {
    const hasMealsWithItems = day.meals.some((meal: SelectedMeal) => 
      meal.selectedPlates && Array.isArray(meal.selectedPlates) && meal.selectedPlates.length > 0
    );
    
    if (!hasMealsWithItems) return null;
    
    return (
      <View style={styles.daySection} key={day.day}>
        <View style={styles.dayHeader}>
          <Text style={[styles.dayLabel, { color: colors.defaultColor }]}>
            {formatDayName(day.day)}
          </Text>
          <Text style={[styles.dayTotal, { color: colors.defaultColor }]}>
            ${getDayTotal(day).toFixed(2)}
          </Text>
        </View>
        
        {day.meals.map((meal: SelectedMeal, mealIndex: number) => {
          if (!meal.selectedPlates || !Array.isArray(meal.selectedPlates) || meal.selectedPlates.length === 0) {
            return null;
          }
          
          const detailedPlates = meal.selectedPlates as DetailedPlateCustomization[];
          
          return (
            <View key={`${day.day}-${meal.type}`} style={styles.mealSection}>
              <Text style={[styles.mealLabel, { color: colors.defaultColor }]}>
                {formatMealName(meal.type)}
              </Text>
              
              {detailedPlates.map((detailedPlate: DetailedPlateCustomization) => {
                const plate = getPlateById(detailedPlate.plateId);
                if (!plate) return null;
                
                const itemTotal = detailedPlate.customization.totalPrice * detailedPlate.quantity;
                
                return (
                  <View key={`${detailedPlate.plateId}-${mealIndex}`} style={styles.orderItem}>
                    {plate.imageUrl ? (
                      <Image source={{ uri: plate.imageUrl }} style={styles.itemImage} />
                    ) : (
                      <View style={[styles.itemImage, styles.defaultImage]}>
                        <Ionicons name="fast-food-outline" size={32} color={colors.second} />
                      </View>
                    )}
                    
                    <View style={styles.itemDetails}>
                      <Text style={styles.itemName}>{detailedPlate.plateName || plate.name}</Text>
                      <Text style={styles.itemDescription} numberOfLines={2}>
                        {plate.description}
                      </Text>
                      
                      {/* Show customization details */}
                      {(detailedPlate.customization.selectedOptions.length > 0 || 
                        detailedPlate.customization.removedIngredients.length > 0 ||
                        detailedPlate.customization.notes) && (
                        <View style={styles.customizationDetails}>
                          {detailedPlate.customization.selectedOptions.length > 0 && (
                            <Text style={styles.customizationText} numberOfLines={1}>
                              Options: {detailedPlate.customization.selectedOptions.map(opt => opt.optionName).join(', ')}
                            </Text>
                          )}
                          {detailedPlate.customization.removedIngredients.length > 0 && (
                            <Text style={styles.customizationText} numberOfLines={1}>
                              Removed: {detailedPlate.customization.removedIngredients.join(', ')}
                            </Text>
                          )}
                          {detailedPlate.customization.notes && (
                            <Text style={styles.customizationText} numberOfLines={1} ellipsizeMode="tail">
                              Notes: {detailedPlate.customization.notes}
                            </Text>
                          )}
                        </View>
                      )}
                      
                      <View style={styles.itemFooter}>
                        <View style={styles.quantityContainer}>
                          <Text style={styles.quantityText}>{detailedPlate.quantity}x</Text>
                        </View>
                        
                        <Text style={styles.itemPrice}>
                          ${itemTotal.toFixed(2)}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          );
        })}
      </View>
    );
  };

  const renderOrderItem = ({ item }: { item: any }) => {
    // This is for the flatlist approach
    return null;
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.tint} />
        <Text style={styles.loadingText}>Loading subscription summary...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Ionicons name="alert-circle-outline" size={64} color="#ff4444" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadData}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const hasItems = selectedSchedule.some((day: DaySchedule) => 
    day.meals.some((meal: SelectedMeal) => 
      meal.selectedPlates && Array.isArray(meal.selectedPlates) && meal.selectedPlates.length > 0
    )
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        
        <View style={styles.titleContainer}>
          <Text style={styles.restaurantName}>
            {restaurant?.restaurantName || 'Subscription Summary'}
          </Text>
          <Text style={styles.subtitle}>
            Review your weekly subscription
          </Text>
        </View>
      </View>
      
      {!hasItems ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="restaurant-outline" size={64} color={colors.second} />
          <Text style={styles.emptyText}>No items in subscription</Text>
          <Text style={styles.emptySubtext}>Go back to add items to your meals</Text>
          <TouchableOpacity 
            style={styles.backButtonStyle}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Back to Menu</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.summaryHeader}>
              <View style={styles.summaryStats}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{selectedSchedule.length}</Text>
                  <Text style={styles.statLabel}>Days</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{getTotalItemsCount()}</Text>
                  <Text style={styles.statLabel}>Items</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>
                    ${getSubscriptionTotal().toFixed(2)}
                  </Text>
                  <Text style={styles.statLabel}>Total</Text>
                </View>
              </View>
            </View>
            
            {/* Daily Sections */}
            {selectedSchedule.map((day: DaySchedule, index: number) => renderDaySection({ item: day, index }))}
            
            {/* Final Summary */}
            <View style={styles.finalSummary}>
              <View style={styles.finalSummaryRow}>
                <Text style={styles.finalSummaryLabel}>Weekly Subtotal</Text>
                <Text style={styles.finalSummaryValue}>
                  ${getSubscriptionTotal().toFixed(2)}
                </Text>
              </View>
            </View>
          </ScrollView>
        </>
      )}
      
      {/* Confirm Button */}
      <TouchableOpacity 
        style={[
          styles.confirmButton, 
          { backgroundColor: colors.defaultColor },
          (!hasItems || isSubmitting) && { opacity: 0.5 }
        ]}
        onPress={handleConfirmSubscription}
        disabled={!hasItems || isSubmitting}
      >
        {isSubmitting ? (
          <ActivityIndicator size="small" color={colors.second} />
        ) : (
          <>
            <Text style={styles.confirmButtonText}>
              Confirm Subscription
            </Text>
            <Ionicons 
              name="checkmark-circle" 
              size={20} 
              color={colors.second}
              style={styles.confirmButtonIcon} 
            />
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
    backgroundColor: colors.background,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  titleContainer: {
    flex: 1,
    marginRight: 8,
  },
  restaurantName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: colors.second,
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 100,
  },
  summaryHeader: {
    marginBottom: 20,
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.defaultColor,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: colors.defaultColor,
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginHorizontal: 8,
  },
  daySection: {
    marginBottom: 24,
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dayLabel: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  dayTotal: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  mealSection: {
    marginBottom: 16,
  },
  mealLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    paddingLeft: 4,
  },
  orderItem: {
    flexDirection: 'row',
    marginBottom: 12,
    padding: 12,
    backgroundColor: colors.third,
    borderRadius: 8,
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: 6,
    marginRight: 12,
    backgroundColor: colors.secondaryBackground,
  },
  defaultImage: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  itemDescription: {
    fontSize: 12,
    color: colors.defaultColor,
    marginBottom: 8,
    lineHeight: 16,
  },
  customizationDetails: {
    marginBottom: 8,
    padding: 6,
    backgroundColor: colors.secondaryBackground,
    borderRadius: 6,
    borderColor: colors.border,
  },
  customizationText: {
    fontSize: 11,
    color: colors.defaultColor,
    fontStyle: 'italic',
    marginBottom: 2,
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  quantityText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.defaultColor,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.defaultColor,
  },
  finalSummary: {
    backgroundColor: colors.backgroundColor,
    borderRadius: 12,
    padding: 20,
    marginTop: 8,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  finalSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  finalSummaryLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.defaultColor,
  },
  finalSummaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.defaultColor,
  },
  confirmButton: {
    position: 'absolute',
    bottom: 25,
    left: 25,
    right: 25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 30,
    zIndex: 1000,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  confirmButtonText: {
    color: colors.second,
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 8,
  },
  confirmButtonIcon: {
    marginLeft: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.defaultColor,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.second,
    textAlign: 'center',
    marginBottom: 24,
  },
  backButtonStyle: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingText: {
    marginTop: 16,
    color: colors.second,
    textAlign: 'center',
  },
  errorText: {
    color: '#ff4444',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 16,
    fontSize: 16,
  },
  retryButton: {
    backgroundColor: colors.primary,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  retryButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});