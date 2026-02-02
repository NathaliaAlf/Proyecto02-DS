// (customer)/restaurants/[categoryId]/[restaurantId]/index.tsx
import { useSubscription } from '@/context/SubscriptionContext';
import { useTheme } from '@/context/ThemeContext';
import { menuApi } from '@/services/api/menuApi';
import { restaurantApi } from '@/services/api/restaurantApi';
import { Menu, Plate } from '@/types/menu';
import { Restaurant } from '@/types/restaurant';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

// Helper function to format day and meal
const formatDayAndMeal = (dayId?: string, mealTimeId?: string) => {
  const days: Record<string, string> = {
    'monday': 'Monday',
    'tuesday': 'Tuesday', 
    'wednesday': 'Wednesday',
    'thursday': 'Thursday',
    'friday': 'Friday',
    'saturday': 'Saturday',
    'sunday': 'Sunday'
  };
  
  const meals: Record<string, string> = {
    'breakfast': 'first',
    'lunch': 'second',
    'dinner': 'third'
  };
  
  const dayName = dayId ? days[dayId] || 'Day' : 'Day';
  const mealName = mealTimeId ? meals[mealTimeId] || 'meal' : 'meal';
  
  return `Create an order for ${dayName} ${mealName} meal`;
};

export default function RestaurantDetailScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const { restaurantId, restaurantName, categoryId, dayId, mealTimeId, subscriptionFlow } = useLocalSearchParams<{ 
    restaurantId: string; 
    dayId: string;
    mealTimeId: string;
    restaurantName: string;
    categoryId: string;
    subscriptionFlow?: string;
  }>();
  
  const { selectedSchedule, updateMealCompletion, getNextUncompletedMeal } = useSubscription();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menu, setMenu] = useState<Menu | null>(null);
  const [plates, setPlates] = useState<Plate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlates, setSelectedPlates] = useState<Record<string, number>>({});

  const isSubscribed = false;
  const dayAndTimeText = formatDayAndMeal(dayId, mealTimeId);
  const isSubscriptionFlow = subscriptionFlow === 'true';

  useEffect(() => {
    loadRestaurantData();
  }, [restaurantId]);

  // Use useFocusEffect to reload selections when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadExistingSelections();
    }, [dayId, mealTimeId, selectedSchedule])
  );

  const loadRestaurantData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!restaurantId) {
        setError('No restaurant selected');
        return;
      }

      // Load restaurant info
      const restaurantResult = await restaurantApi.getRestaurant(restaurantId);
      if (restaurantResult.success && restaurantResult.data) {
        setRestaurant(restaurantResult.data);
      } else {
        setError(restaurantResult.error || 'Restaurant not found');
        return;
      }

      // Load menu for this restaurant
      const menuResult = await menuApi.getActiveMenu(restaurantId);
      if (menuResult.success && menuResult.data) {
        const menuData = menuResult.data;
        setMenu(menuData);
        setPlates(menuData.plates || []);
      } else {
        // No active menu or error
        console.log('No active menu found:', menuResult.error);
        setPlates([]);
      }
    } catch (err) {
      console.error('Error loading restaurant data:', err);
      setError('An error occurred while loading restaurant data');
    } finally {
      setLoading(false);
    }
  };

  const loadExistingSelections = () => {
    if (!isSubscriptionFlow || !dayId || !mealTimeId || !selectedSchedule.length) {
      return;
    }

    // Find current meal in schedule
    const currentDayIndex = selectedSchedule.findIndex(day => day.day === dayId);
    if (currentDayIndex === -1) return;
    
    const currentMealIndex = selectedSchedule[currentDayIndex].meals.findIndex(
      meal => meal.type === mealTimeId
    );
    if (currentMealIndex === -1) return;

    // Load previously selected plates for this meal
    const existingPlates = selectedSchedule[currentDayIndex].meals[currentMealIndex].selectedPlates;
    if (existingPlates) {
      console.log('Loading existing plates:', existingPlates);
      setSelectedPlates(existingPlates);
    } else {
      setSelectedPlates({});
    }
  };

  const handleSubscribePress = () => {
    if (isSubscribed){
      //show message to confirm cancelation
    }else{
      router.push({
        pathname: "/subscriptions/[restaurantId]",
        params: { restaurantId }
      });
    }
  };

  const handlePlatePress = (plate: Plate) => {
    // Save current selections before navigating
    if (isSubscriptionFlow && dayId && mealTimeId) {
      const currentDayIndex = selectedSchedule.findIndex(day => day.day === dayId);
      const currentMealIndex = selectedSchedule[currentDayIndex]?.meals.findIndex(
        meal => meal.type === mealTimeId
      );
      if (currentDayIndex !== -1 && currentMealIndex !== -1) {
        updateMealCompletion(currentDayIndex, currentMealIndex, false, selectedPlates);
      }
    }

    // Navigate to plate detail screen
    router.push({
      pathname: "/(customer)/subscriptions/[restaurantId]/[dayId]/[mealTimeId]/[plateId]",
      params: { 
        restaurantId,
        dayId: dayId || '',
        mealTimeId: mealTimeId || '',
        restaurantName: restaurant?.restaurantName || '',
        plateId: plate.id,
        plateName: plate.name,
        subscriptionFlow: isSubscriptionFlow ? 'true' : undefined
      }
    });
  };

  const handleAddToOrder = (plateId: string) => {
    setSelectedPlates(prev => {
      const newPlates = {
        ...prev,
        [plateId]: (prev[plateId] || 0) + 1
      };
      
      // Also update context immediately
      if (isSubscriptionFlow && dayId && mealTimeId) {
        const currentDayIndex = selectedSchedule.findIndex(day => day.day === dayId);
        const currentMealIndex = selectedSchedule[currentDayIndex]?.meals.findIndex(
          meal => meal.type === mealTimeId
        );
        if (currentDayIndex !== -1 && currentMealIndex !== -1) {
          updateMealCompletion(currentDayIndex, currentMealIndex, false, newPlates);
        }
      }
      
      return newPlates;
    });
  };

  const handleRemoveFromOrder = (plateId: string) => {
    setSelectedPlates(prev => {
      const currentQuantity = prev[plateId] || 0;
      let newPlates;
      
      if (currentQuantity <= 1) {
        newPlates = { ...prev };
        delete newPlates[plateId];
      } else {
        newPlates = {
          ...prev,
          [plateId]: currentQuantity - 1
        };
      }
      
      // Also update context immediately
      if (isSubscriptionFlow && dayId && mealTimeId) {
        const currentDayIndex = selectedSchedule.findIndex(day => day.day === dayId);
        const currentMealIndex = selectedSchedule[currentDayIndex]?.meals.findIndex(
          meal => meal.type === mealTimeId
        );
        if (currentDayIndex !== -1 && currentMealIndex !== -1) {
          updateMealCompletion(currentDayIndex, currentMealIndex, false, newPlates);
        }
      }
      
      return newPlates;
    });
  };

  const getSelectedCount = () => {
    return Object.values(selectedPlates).reduce((sum, quantity) => sum + quantity, 0);
  };

  const getPreviousMeal = () => {
    if (!dayId || !mealTimeId || !selectedSchedule.length) return null;

    // Find current meal
    const currentDayIndex = selectedSchedule.findIndex(day => day.day === dayId);
    if (currentDayIndex === -1) return null;
    
    const currentMealIndex = selectedSchedule[currentDayIndex].meals.findIndex(
      meal => meal.type === mealTimeId
    );
    if (currentMealIndex === -1) return null;

    // Look for previous meal
    if (currentMealIndex > 0) {
      return { dayIndex: currentDayIndex, mealIndex: currentMealIndex - 1 };
    } else if (currentDayIndex > 0) {
      const prevDay = selectedSchedule[currentDayIndex - 1];
      return { dayIndex: currentDayIndex - 1, mealIndex: prevDay.meals.length - 1 };
    }
    
    return null;
  };

  const handlePrevious = () => {
    const prevMeal = getPreviousMeal();
    if (!prevMeal) return;

    // Save current selections before navigating
    if (dayId && mealTimeId) {
      const currentDayIndex = selectedSchedule.findIndex(day => day.day === dayId);
      const currentMealIndex = selectedSchedule[currentDayIndex]?.meals.findIndex(
        meal => meal.type === mealTimeId
      );
      if (currentDayIndex !== -1 && currentMealIndex !== -1) {
        // Save without marking as completed
        updateMealCompletion(currentDayIndex, currentMealIndex, false, selectedPlates);
      }
    }

    const prevDay = selectedSchedule[prevMeal.dayIndex];
    const prevMealItem = prevDay.meals[prevMeal.mealIndex];
    
    // Navigate to previous meal
    router.replace({
      pathname: '/subscriptions/[restaurantId]/menu',
      params: { 
        restaurantId,
        categoryId: categoryId || '',
        dayId: prevDay.day,
        mealTimeId: prevMealItem.type,
        restaurantName: restaurant?.restaurantName || '',
        subscriptionFlow: 'true'
      }
    });
  };

  const handleNext = () => {
    if (!isSubscriptionFlow) {
      // Regular flow - just show alert
      Alert.alert(
        'Next Step',
        `You have selected ${getSelectedCount()} items for ${dayAndTimeText}.`,
        [{ text: 'OK' }]
      );
      return;
    }

    // Subscription flow logic
    if (!dayId || !mealTimeId || !selectedSchedule.length) {
      Alert.alert('Error', 'Missing required information.');
      return;
    }

    // Validate that at least one plate is selected
    if (getSelectedCount() === 0) {
      Alert.alert('No Items Selected', 'Please select at least one item before continuing.');
      return;
    }

    // Find current day/meal indices
    const currentDayIndex = selectedSchedule.findIndex(day => day.day === dayId);
    if (currentDayIndex === -1) {
      Alert.alert('Error', 'Could not find current day in schedule.');
      return;
    }
    
    const currentMealIndex = selectedSchedule[currentDayIndex].meals.findIndex(meal => meal.type === mealTimeId);
    if (currentMealIndex === -1) {
      Alert.alert('Error', 'Could not find current meal in schedule.');
      return;
    }

    // Mark current meal as completed with selected plates
    updateMealCompletion(currentDayIndex, currentMealIndex, true, selectedPlates);

    // Get next uncompleted meal
    const nextMeal = getNextUncompletedMeal();
    
    if (nextMeal) {
      const nextDay = selectedSchedule[nextMeal.dayIndex];
      const nextMealItem = nextDay.meals[nextMeal.mealIndex];
      
      // Navigate to next meal
      router.replace({
        pathname: '/subscriptions/[restaurantId]/menu',
        params: { 
          restaurantId,
          categoryId: categoryId || '',
          dayId: nextDay.day,
          mealTimeId: nextMealItem.type,
          restaurantName: restaurant?.restaurantName || '',
          subscriptionFlow: 'true'
        }
      });
      
      // Clear selected plates for the new meal
      setSelectedPlates({});
    } else {
      // All meals completed - navigate to subscription confirmation
      router.push({
        pathname: '/(customer)/subscriptions/[restaurantId]/confirmation',
        params: { 
          restaurantId,
          scheduleData: JSON.stringify(selectedSchedule)
        }
      });
    }
  };

  const handleViewOrder = () => {
    router.push({
      pathname: '/(customer)/subscriptions/order',
      params: {
        restaurantId,
        restaurantName: restaurant?.restaurantName || '',
        categoryId: categoryId || '',
        dayId: dayId || '',
        mealTimeId: mealTimeId || '',
        subscriptionFlow: isSubscriptionFlow ? 'true' : undefined
      }
    });
  };

  const renderPlateItem = ({ item }: { item: Plate }) => {
    const quantity = selectedPlates[item.id] || 0;
    
    return (
      <View style={styles.plateCardContainer}>
        <TouchableOpacity 
          style={styles.plateCard}
          onPress={() => handlePlatePress(item)}
          activeOpacity={0.8}
        >
          {item.imageUrl ? (
            <Image 
              source={{ uri: item.imageUrl }} 
              style={styles.plateImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.plateImage, styles.noImage]}>
              <Text style={styles.noImageText}>No Image</Text>
            </View>
          )}
          
          <View style={styles.plateInfo}>
            <Text style={styles.plateName} numberOfLines={2}>
              {item.name}
            </Text>
            <Text style={styles.plateDescription} numberOfLines={2}>
              {item.description}
            </Text>
            <Text style={styles.platePrice}>${item.basePrice.toFixed(2)}</Text>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  // Show progress indicator in subscription flow
  const renderProgressIndicator = () => {
    if (!isSubscriptionFlow || !selectedSchedule.length) return null;

    const totalMeals = selectedSchedule.reduce((sum, day) => sum + day.meals.length, 0);
    const completedMeals = selectedSchedule.reduce(
      (sum, day) => sum + day.meals.filter(meal => meal.completed).length, 
      0
    );
    
    // Find current meal position (1-indexed)
    let currentMealNumber = 1;
    let found = false;
    for (const day of selectedSchedule) {
      for (const meal of day.meals) {
        if (day.day === dayId && meal.type === mealTimeId) {
          found = true;
          break;
        }
        if (!found) currentMealNumber++;
      }
      if (found) break;
    }

    return (
      <View style={styles.progressContainer}>
        <Text style={[styles.progressText, { color: colors.defaultColor }]}>
          Meal {currentMealNumber} of {totalMeals} ({completedMeals} completed)
        </Text>
        <View style={[styles.progressBar, { backgroundColor: colors.second }]}>
          <View 
            style={[
              styles.progressFill, 
              { 
                backgroundColor: colors.defaultColor,
                width: `${(completedMeals / totalMeals) * 100}%`
              }
            ]} 
          />
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.tint} />
        <Text style={styles.loadingText}>Loading restaurant menu...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={loadRestaurantData}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Floating Previous Button */}
      {isSubscriptionFlow && getPreviousMeal() && (
        <TouchableOpacity 
          style={[styles.floatingPrevButton, { backgroundColor: colors.second }]}
          onPress={handlePrevious}
          activeOpacity={0.8}
        >
          <Ionicons 
            name="arrow-back" 
            size={20} 
            color={colors.defaultColor} 
            style={styles.floatingPrevIcon} 
          />
          <Text style={[styles.floatingPrevButtonText, { color: colors.defaultColor }]}>
            Previous
          </Text>
        </TouchableOpacity>
      )}

      {/* Floating Next Button - Always on top */}
      <TouchableOpacity 
        style={[
          styles.floatingNextButton, 
          { backgroundColor: colors.defaultColor },
          isSubscriptionFlow && getSelectedCount() === 0 && { opacity: 0.5 }
        ]}
        onPress={handleNext}
        activeOpacity={0.8}
        disabled={isSubscriptionFlow && getSelectedCount() === 0}
      >
        <Text style={styles.floatingNextButtonText}>
          {isSubscriptionFlow ? 'Next Meal' : 'Next'}
        </Text>
        <Ionicons 
          name="arrow-forward" 
          size={20} 
          color={colors.second}
          style={styles.floatingNextIcon} 
        />
      </TouchableOpacity>

      {/* Restaurant Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        
        <View style={styles.titleContainer}>
          <Text style={styles.restaurantName} numberOfLines={1}>
            {restaurant?.restaurantName || restaurantName}
          </Text>
        </View>
        
        {/* Circular List Button */}
        <TouchableOpacity 
          style={[styles.listButton, { backgroundColor: colors.defaultColor }]}
          onPress={handleViewOrder}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="clipboard-list-outline" size={22} color={colors.second} />
          {getSelectedCount() > 0 && (
            <View style={[styles.badge, { backgroundColor: colors.second }]}>
              <Text style={[styles.badgeText, { color: colors.defaultColor }]}>
                {getSelectedCount()}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Progress Indicator (only in subscription flow) */}
      {renderProgressIndicator()}

      {/* Day and Time Text */}
      <View style={styles.dayTimeContainer}>
        <Text style={[styles.dayAndTimeText, { color: colors.defaultColor }]}>
          {dayAndTimeText}
        </Text>
        {isSubscriptionFlow && selectedPlates && Object.keys(selectedPlates).length > 0 && (
          <Text style={[styles.selectedCountText, { color: colors.second }]}>
            {getSelectedCount()} item{getSelectedCount() !== 1 ? 's' : ''} selected
          </Text>
        )}
      </View>

      {/* Plates List */}
      {plates.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No menu items available</Text>
          <Text style={styles.emptySubtext}>
            This restaurant hasn't set up their menu yet
          </Text>
        </View>
      ) : (
        <FlatList
          data={plates}
          renderItem={renderPlateItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.platesList}
          showsVerticalScrollIndicator={false}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          ListFooterComponent={<View style={styles.listFooter} />}
        />
      )}
    </SafeAreaView>
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
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: colors.text,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: 16,
    color: colors.error,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  // Floating Previous Button
  floatingPrevButton: {
    position: 'absolute',
    bottom: 25,
    left: 25,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    zIndex: 1000,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  floatingPrevButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 4,
  },
  floatingPrevIcon: {
    marginRight: 2,
  },
  // Floating Next Button
  floatingNextButton: {
    position: 'absolute',
    bottom: 25,
    right: 25,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    zIndex: 1000,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  floatingNextButtonText: {
    color: colors.second,
    fontSize: 16,
    fontWeight: '600',
    marginRight: 4,
  },
  floatingNextIcon: {
    marginLeft: 2,
  },
  // Progress Indicator
  progressContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.background,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
    textAlign: 'center',
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
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
  // Circular List Button
  listButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  // Day and Time
  dayTimeContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: colors.second,
  },
  dayAndTimeText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
    shadowColor: colors.defaultColor,
  },
  selectedCountText: {
    fontSize: 14,
    textAlign: 'center',
  },
  // Plates List
  platesList: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 100, // Extra padding for floating button
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  plateCardContainer: {
    width: '48%',
    marginBottom: 8,
  },
  plateCard: {
    backgroundColor: colors.third,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  plateImage: {
    width: '100%',
    height: 120,
  },
  noImage: {
    backgroundColor: colors.second,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noImageText: {
    color: colors.secondaryText,
    fontSize: 14,
  },
  plateInfo: {
    padding: 12,
  },
  plateName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
    height: 36,
    lineHeight: 18,
  },
  plateDescription: {
    fontSize: 12,
    color: colors.secondaryText,
    marginBottom: 8,
    height: 32,
    lineHeight: 16,
  },
  platePrice: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.primary,
  },
  // Quantity Controls
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  quantityButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityButtonText: {
    color: colors.second,
    fontSize: 16,
    fontWeight: 'bold',
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '600',
    marginHorizontal: 12,
    minWidth: 20,
    textAlign: 'center',
  },
  addButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  addButtonText: {
    color: colors.second,
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 10,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.secondaryText,
    textAlign: 'center',
  },
  listFooter: {
    height: 80,
  },
});