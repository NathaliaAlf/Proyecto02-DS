// app/(customer)/subscriptions/[subscriptionId]/index.tsx
import { useTheme } from '@/context/ThemeContext';
import { restaurantApi } from '@/services/api/restaurantApi';
import { subscriptionApi } from '@/services/api/subscriptionApi';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

// Helper function to format day name
const formatDayName = (day: string) => {
  const days: Record<string, string> = {
    'monday': 'Monday',
    'tuesday': 'Tuesday', 
    'wednesday': 'Wednesday',
    'thursday': 'Thursday',
    'friday': 'Friday',
    'saturday': 'Saturday',
    'sunday': 'Sunday'
  };
  
  return days[day] || day.charAt(0).toUpperCase() + day.slice(1);
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

// Helper function to format time
const formatTime = (timeString: string) => {
  if (!timeString) return '';
  const [hours, minutes] = timeString.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
};

export default function SubscriptionDetailsScreen() {
  const { subscriptionId } = useLocalSearchParams<{ subscriptionId: string }>();
  const { colors } = useTheme();
  const [subscription, setSubscription] = useState<any>(null);
  const [restaurant, setRestaurant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const styles = createStyles(colors);

  useEffect(() => {
    loadData();
  }, [subscriptionId]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      if (!subscriptionId) {
        setError('No subscription ID provided');
        return;
      }

      // Load subscription details
      const subscriptionResult = await subscriptionApi.getSubscription(subscriptionId);
      if (subscriptionResult.success && subscriptionResult.data) {
        setSubscription(subscriptionResult.data);
        
        // Load restaurant info
        const restaurantResult = await restaurantApi.getRestaurant(subscriptionResult.data.restaurantId);
        if (restaurantResult.success && restaurantResult.data) {
          setRestaurant(restaurantResult.data);
        }
      } else {
        setError(subscriptionResult.error || 'Subscription not found');
      }
    } catch (err) {
      console.error('Error loading data:', err);
      setError('An error occurred while loading data');
    } finally {
      setLoading(false);
    }
  };

  const renderPlateItem = ({ item }: { item: any }) => {
    return (
      <View style={styles.plateItem}>
        <View style={styles.plateImageContainer}>
          {item.imageUrl ? (
            <Image source={{ uri: item.imageUrl }} style={styles.plateImage} />
          ) : (
            <View style={[styles.plateImage, styles.defaultImage]}>
              <Ionicons name="fast-food-outline" size={24} color={colors.second} />
            </View>
          )}
        </View>
        
        <View style={styles.plateDetails}>
          <Text style={styles.plateName} numberOfLines={1}>
            {item.plateName} × {item.quantity}
          </Text>
          <Text style={styles.platePrice}>
            ${((item.basePrice + item.optionsCost + item.ingredientsCost) * item.quantity).toFixed(2)}
          </Text>
          
          {/* Show selected options */}
          {item.selectedOptions && item.selectedOptions.length > 0 && (
            <Text style={styles.plateOptions} numberOfLines={1}>
              {item.selectedOptions.map((opt: any) => opt.optionName).join(', ')}
            </Text>
          )}
          
          {/* Show removed ingredients */}
          {item.ingredientModifications && item.ingredientModifications.length > 0 && (
            <Text style={styles.plateIngredients} numberOfLines={1}>
              No: {item.ingredientModifications.filter((mod: any) => mod.action === 'remove').map((mod: any) => mod.ingredientName).join(', ')}
            </Text>
          )}
          
          {/* Show notes */}
          {item.notes && (
            <Text style={styles.plateNotes} numberOfLines={1}>
              Note: {item.notes}
            </Text>
          )}
        </View>
      </View>
    );
  };

  const renderDaySection = ({ item: day }: { item: any }) => {
    // Collect all plates from all meals in this day
    const allPlates: any[] = [];
    
    if (day.meals && Array.isArray(day.meals)) {
      day.meals.forEach((meal: any) => {
        if (meal.items && Array.isArray(meal.items)) {
          meal.items.forEach((item: any) => {
            allPlates.push({
              ...item,
              mealType: meal.type,
              deliveryTime: meal.deliveryTime
            });
          });
        }
      });
    }
    
    if (allPlates.length === 0) return null;

    return (
      <View style={styles.daySection}>
        <View style={styles.dayHeader}>
          <Text style={styles.dayLabel}>
            {formatDayName(day.day)}
          </Text>
        </View>
        
        {allPlates.map((plate, index) => (
          <View key={`${plate.plateId}-${index}`}>
            {/* Meal header for first plate in each meal */}
            {index === 0 || allPlates[index-1].mealType !== plate.mealType ? (
              <View style={styles.mealHeader}>
                <Text style={styles.mealLabel}>
                  {formatMealName(plate.mealType)}
                </Text>
                <Text style={styles.mealTime}>
                  {formatTime(plate.deliveryTime)}
                </Text>
              </View>
            ) : null}
            
            {renderPlateItem({ item: plate })}
          </View>
        ))}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.tint} />
        <Text style={styles.loadingText}>Loading subscription details...</Text>
      </View>
    );
  }

  if (error || !subscription) {
    return (
      <View style={styles.container}>
        <Ionicons name="alert-circle-outline" size={64} color="#ff4444" />
        <Text style={styles.errorText}>{error || 'Subscription not found'}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadData}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.backButtonStyle} 
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const schedule = subscription.schedule || [];
  const hasItems = schedule.some((day: any) => 
    day.meals && day.meals.some((meal: any) => 
      meal.items && meal.items.length > 0
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
          <Text style={styles.restaurantName} numberOfLines={1}>
            {restaurant?.restaurantName || subscription.restaurantName || 'Subscription'}
          </Text>

        </View>
      </View>
      
      {!hasItems ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="restaurant-outline" size={64} color={colors.second} />
          <Text style={styles.emptyText}>No items in this subscription</Text>
        </View>
      ) : (
        <FlatList
          data={schedule}
          renderItem={renderDaySection}
          keyExtractor={(item, index) => `${item.day}-${index}`}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}

        />
      )}
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
    fontSize: 12,
    color: colors.defaultColor,
    marginTop: 2,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.cardBackground,
    marginHorizontal: 16,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    fontSize: 14,
    color: colors.text,
    marginLeft: 6,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  daySection: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
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
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  dayStatus: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '500',
  },
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    marginTop: 4,
  },
  mealLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.defaultColor,
  },
  mealTime: {
    fontSize: 12,
    color: colors.defaultColor,
  },
  plateItem: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: colors.third,
    borderRadius: 8,
    marginBottom: 8,
  },
  plateImageContainer: {
    marginRight: 12,
  },
  plateImage: {
    width: 50,
    height: 50,
    borderRadius: 6,
    backgroundColor: colors.secondaryBackground,
  },
  defaultImage: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  plateDetails: {
    flex: 1,
  },
  plateName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  platePrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.defaultColor,
    marginBottom: 4,
  },
  plateOptions: {
    fontSize: 11,
    color: colors.defaultColor,
    fontStyle: 'italic',
    marginBottom: 2,
  },
  plateIngredients: {
    fontSize: 11,
    color: '#EF4444',
    fontStyle: 'italic',
    marginBottom: 2,
  },
  plateNotes: {
    fontSize: 11,
    color: colors.defaultColor,
    fontStyle: 'italic',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 16,
    color: colors.defaultColor,
    textAlign: 'center',
    marginTop: 16,
  },
  loadingText: {
    marginTop: 16,
    color: colors.defaultColor,
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
    marginBottom: 12,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  backButtonStyle: {
    backgroundColor: colors.defaultColor,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  backButtonText: {
    color: colors.second,
    fontSize: 14,
    fontWeight: '600',
  },
});