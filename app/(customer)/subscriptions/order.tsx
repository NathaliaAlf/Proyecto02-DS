// (customer)/subscriptions/order.tsx
import { useSubscription } from '@/context/SubscriptionContext';
import { useTheme } from '@/context/ThemeContext';
import { menuApi } from '@/services/api/menuApi';
import { restaurantApi } from '@/services/api/restaurantApi';
import { Plate } from '@/types/menu';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

export default function OrderScreen() {
  const { colors } = useTheme();
  const { selectedSchedule, updateMealCompletion, getNextUncompletedMeal } = useSubscription();
  const styles = createStyles(colors);
  
  const { restaurantId, restaurantName, categoryId, dayId, mealTimeId, subscriptionFlow } = useLocalSearchParams<{
    restaurantId: string;
    restaurantName: string;
    categoryId?: string;
    dayId?: string;
    mealTimeId?: string;
    subscriptionFlow?: string;
  }>();
  
  const [plates, setPlates] = useState<Plate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlates, setSelectedPlates] = useState<Record<string, number>>({});
  const [restaurantData, setRestaurantData] = useState<{ id: string; name: string } | null>(null);

  const isSubscriptionFlow = subscriptionFlow === 'true';

  useEffect(() => {
    loadData();
  }, [restaurantId, dayId, mealTimeId]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load restaurant info
      if (restaurantId) {
        const restaurantResult = await restaurantApi.getRestaurant(restaurantId);
        if (restaurantResult.success && restaurantResult.data) {
          setRestaurantData({
            id: restaurantId,
            name: restaurantResult.data.restaurantName
          });
        }
      } else {
        setRestaurantData({
          id: restaurantId || '',
          name: restaurantName || 'Restaurant'
        });
      }

      // Load menu plates
      if (restaurantId) {
        const menuResult = await menuApi.getActiveMenu(restaurantId);
        if (menuResult.success && menuResult.data) {
          setPlates(menuResult.data.plates || []);
        }
      }

      // Load selected plates
      if (isSubscriptionFlow && dayId && mealTimeId && selectedSchedule.length) {
        const currentDayIndex = selectedSchedule.findIndex(day => day.day === dayId);
        if (currentDayIndex !== -1) {
          const currentMealIndex = selectedSchedule[currentDayIndex].meals.findIndex(
            meal => meal.type === mealTimeId
          );
          if (currentMealIndex !== -1) {
            const existingPlates = selectedSchedule[currentDayIndex].meals[currentMealIndex].selectedPlates;
            if (existingPlates) {
              setSelectedPlates(existingPlates);
            }
          }
        }
      }
    } catch (err) {
      console.error('Error loading order data:', err);
      setError('An error occurred while loading order data');
    } finally {
      setLoading(false);
    }
  };

  const handleQuantityChange = (plateId: string, newQuantity: number) => {
    const updatedPlates = { ...selectedPlates };
    
    if (newQuantity <= 0) {
      delete updatedPlates[plateId];
    } else {
      updatedPlates[plateId] = newQuantity;
    }
    
    setSelectedPlates(updatedPlates);
    
    // Update context if in subscription flow
    if (isSubscriptionFlow && dayId && mealTimeId) {
      const currentDayIndex = selectedSchedule.findIndex(day => day.day === dayId);
      const currentMealIndex = selectedSchedule[currentDayIndex]?.meals.findIndex(
        meal => meal.type === mealTimeId
      );
      if (currentDayIndex !== -1 && currentMealIndex !== -1) {
        updateMealCompletion(currentDayIndex, currentMealIndex, false, updatedPlates);
      }
    }
  };

  const handleRemoveItem = (plateId: string, plateName: string) => {
    Alert.alert(
      'Remove Item',
      `Are you sure you want to remove ${plateName} from your order?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive', 
          onPress: () => handleQuantityChange(plateId, 0)
        }
      ]
    );
  };

  const handleNext = () => {
    if (!isSubscriptionFlow) {
      // Regular flow - just show alert
      Alert.alert(
        'Order Summary',
        `You have selected ${getSelectedCount()} items.`,
        [{ text: 'OK' }]
      );
      return;
    }

    // Subscription flow logic - same as menu screen
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
      
      // Navigate to next meal menu
      router.replace({
        pathname: '/subscriptions/[restaurantId]/menu',
        params: { 
          restaurantId,
          categoryId: categoryId || '',
          dayId: nextDay.day,
          mealTimeId: nextMealItem.type,
          restaurantName: restaurantData?.name || '',
          subscriptionFlow: 'true'
        }
      });
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

  const handleBackToMenu = () => {
    router.back();
  };

  const getSelectedCount = () => {
    return Object.values(selectedPlates).reduce((sum, quantity) => sum + quantity, 0);
  };

  const calculateSubtotal = () => {
    let subtotal = 0;
    
    Object.entries(selectedPlates).forEach(([plateId, quantity]) => {
      const plate = plates.find(p => p.id === plateId);
      if (plate) {
        subtotal += plate.basePrice * quantity;
      }
    });
    
    return subtotal;
  };

  const renderOrderItem = ({ item }: { item: Plate }) => {
    const quantity = selectedPlates[item.id] || 0;
    
    if (quantity === 0) return null;
    
    const itemTotal = item.basePrice * quantity;
    
    return (
      <View style={styles.cartItem}>
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={styles.itemImage} />
        ) : (
          <View style={[styles.itemImage, styles.defaultImage]}>
            <Ionicons name="fast-food-outline" size={40} color={colors.second} />
          </View>
        )}
        
        <View style={styles.itemDetails}>
          <Text style={styles.itemName}>{item.name}</Text>
          <Text style={styles.itemDescription} numberOfLines={2}>
            {item.description}
          </Text>
          
          <View style={styles.itemFooter}>
            <View style={styles.quantityContainer}>
              <TouchableOpacity 
                style={styles.quantityButton}
                onPress={() => handleQuantityChange(item.id, quantity - 1)}
                disabled={quantity <= 1}
              >
                <Ionicons name="remove" size={20} color={colors.defaultColor} />
              </TouchableOpacity>
              
              <Text style={styles.quantityText}>{quantity}</Text>
              
              <TouchableOpacity 
                style={styles.quantityButton}
                onPress={() => handleQuantityChange(item.id, quantity + 1)}
              >
                <Ionicons name="add" size={20} color={colors.defaultColor} />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.itemPrice}>
              ${itemTotal.toFixed(2)}
            </Text>
            
            <TouchableOpacity 
              style={styles.removeButton}
              onPress={() => handleRemoveItem(item.id, item.name)}
            >
              <Ionicons name="trash-outline" size={20} color="#ff4444" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.tint} />
        <Text style={styles.loadingText}>Loading order...</Text>
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

  const selectedItems = plates.filter(plate => selectedPlates[plate.id] > 0);
  const hasItems = selectedItems.length > 0;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBackToMenu} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        
        <View style={styles.titleContainer}>
          <Text style={styles.restaurantName}>
            {restaurantData?.name || 'Order Summary'}
          </Text>
          {isSubscriptionFlow && dayId && mealTimeId && (
            <Text style={styles.mealInfo}>
              {dayId?.charAt(0).toUpperCase() + dayId?.slice(1)} - {mealTimeId}
            </Text>
          )}
        </View>
        
        {hasItems && (
          <TouchableOpacity onPress={() => setSelectedPlates({})}>
            <Text style={styles.clearText}>Clear All</Text>
          </TouchableOpacity>
        )}
      </View>
      
      {!hasItems ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Your order is empty</Text>
          <Text style={styles.emptySubtext}>Add items from the menu</Text>
          <TouchableOpacity 
            style={styles.backToMenuButton}
            onPress={handleBackToMenu}
          >
            <Text style={styles.backToMenuButtonText}>Back to Menu</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <FlatList
            data={plates}
            renderItem={renderOrderItem}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            ListFooterComponent={<View style={styles.listFooter} />}
          />
          
          <View style={styles.summary}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Items</Text>
              <Text style={styles.summaryValue}>{getSelectedCount()}</Text>
            </View>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>${calculateSubtotal().toFixed(2)}</Text>
            </View>
          </View>
        </>
      )}
      
      {/* Next Order Button */}
      <TouchableOpacity 
        style={[
          styles.nextButton, 
          { backgroundColor: colors.defaultColor },
          isSubscriptionFlow && getSelectedCount() === 0 && { opacity: 0.5 }
        ]}
        onPress={handleNext}
        disabled={isSubscriptionFlow && getSelectedCount() === 0}
      >
        <Text style={styles.nextButtonText}>
          {isSubscriptionFlow ? 'Next Order' : 'Complete Order'}
        </Text>
        <Ionicons 
          name="arrow-forward" 
          size={20} 
          color={colors.second}
          style={styles.nextButtonIcon} 
        />
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
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
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.defaultColor,
  },
  mealInfo: {
    fontSize: 14,
    color: colors.second,
    marginTop: 4,
  },
  clearText: {
    color: '#ff4444',
    fontSize: 14,
    fontWeight: '500',
  },
  listContainer: {
    paddingBottom: 16,
  },
  listFooter: {
    height: 100,
  },
  cartItem: {
    flexDirection: 'row',
    backgroundColor: colors.cardBackground,
    marginBottom: 12,
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
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
    color: colors.defaultColor,
    marginBottom: 4,
  },
  itemDescription: {
    fontSize: 12,
    color: '#777',
    marginBottom: 8,
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    backgroundColor: colors.secondaryBackground,
  },
  quantityButton: {
    padding: 6,
    paddingHorizontal: 10,
  },
  quantityText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.defaultColor,
    marginHorizontal: 12,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.defaultColor,
  },
  removeButton: {
    padding: 6,
  },
  summary: {
    backgroundColor: colors.cardBackground,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    padding: 5,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.second,
  },
  summaryLabel: {
    fontSize: 16,
    color: colors.defaultColor,
  },
  summaryValue: {
    fontSize: 16,
    color: colors.defaultColor,
    fontWeight: '500',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 50,
    marginHorizontal: 15,
    borderRadius: 20,
    zIndex: 1000,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  nextButtonText: {
    color: colors.second,
    fontSize: 16,
    fontWeight: '600',
    margin: 'auto',
  },
  nextButtonIcon: {
    marginLeft: 2,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.defaultColor,
    textAlign: 'center',
    marginBottom: 10,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.second,
    textAlign: 'center',
    marginBottom: 20,
  },
  backToMenuButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  backToMenuButtonText: {
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