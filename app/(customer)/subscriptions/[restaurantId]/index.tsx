// app/(customer)/subscriptions/[restaurantId]/index.tsx
import { useTheme } from '@/context/ThemeContext';
import { restaurantApi } from '@/services/api/restaurantApi';
import Ionicons from '@expo/vector-icons/Ionicons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  Dimensions,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { ActivityIndicator, Checkbox } from 'react-native-paper';

// Define types
type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
type MealType = 'breakfast' | 'lunch' | 'dinner';

const DAYS: { key: DayOfWeek; label: string; short: string }[] = [
  { key: 'monday', label: 'Monday', short: 'M' },
  { key: 'tuesday', label: 'Tuesday', short: 'T' },
  { key: 'wednesday', label: 'Wednesday', short: 'W' },
  { key: 'thursday', label: 'Thursday', short: 'T' },
  { key: 'friday', label: 'Friday', short: 'F' },
  { key: 'saturday', label: 'Saturday', short: 'S' },
  { key: 'sunday', label: 'Sunday', short: 'S' }
];

const MEALS: { key: MealType; label: string }[] = [
  { key: 'breakfast', label: '1st' },
  { key: 'lunch', label: '2nd' },
  { key: 'dinner', label: '3rd' }
];

const { width: screenWidth } = Dimensions.get('window');
const CELL_WIDTH = (screenWidth - 80 - 16) / 7;
const CELL_HEIGHT = 60;

interface MealTime {
  start: Date;
  end: Date;
}

interface SubscriptionConfig {
  matrix: Record<DayOfWeek, Record<MealType, boolean>>;
  mealTimes: Record<MealType, MealTime>;
}

// Helper function to initialize matrix
const initializeMatrix = (): Record<DayOfWeek, Record<MealType, boolean>> => {
  const matrix: Record<DayOfWeek, Record<MealType, boolean>> = {
    monday: { breakfast: false, lunch: false, dinner: false },
    tuesday: { breakfast: false, lunch: false, dinner: false },
    wednesday: { breakfast: false, lunch: false, dinner: false },
    thursday: { breakfast: false, lunch: false, dinner: false },
    friday: { breakfast: false, lunch: false, dinner: false },
    saturday: { breakfast: false, lunch: false, dinner: false },
    sunday: { breakfast: false, lunch: false, dinner: false }
  };
  return matrix;
};

export default function SubscriptionSetupScreen() {
  const { restaurantId, categoryId } = useLocalSearchParams<{
    restaurantId: string;
    categoryId: string;
  }>();
  const { colors } = useTheme();
  const [restaurant, setRestaurant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Initialize matrix state
  const [config, setConfig] = useState<SubscriptionConfig>(() => {
    return {
      matrix: initializeMatrix(),
      mealTimes: {
        breakfast: { start: new Date(new Date().setHours(8, 0, 0, 0)), end: new Date(new Date().setHours(11, 0, 0, 0)) },
        lunch: { start: new Date(new Date().setHours(12, 0, 0, 0)), end: new Date(new Date().setHours(15, 0, 0, 0)) },
        dinner: { start: new Date(new Date().setHours(18, 0, 0, 0)), end: new Date(new Date().setHours(22, 0, 0, 0)) }
      }
    };
  });

  const [showTimePicker, setShowTimePicker] = useState<{
    meal: MealType;
    type: 'start' | 'end';
  } | null>(null);

  const styles = createStyles(colors);

  useEffect(() => {
    loadRestaurantData();
  }, [restaurantId]);

  const loadRestaurantData = async () => {
    try {
      setLoading(true);
      const result = await restaurantApi.getRestaurant(restaurantId!);
      
      if (result.success && result.data) {
        setRestaurant(result.data);
      }
    } catch (error) {
      console.error('Error loading restaurant:', error);
      Alert.alert('Error', 'Failed to load restaurant data');
    } finally {
      setLoading(false);
    }
  };

  const toggleCell = (day: DayOfWeek, meal: MealType) => {
    setConfig(prev => ({
      ...prev,
      matrix: {
        ...prev.matrix,
        [day]: {
          ...prev.matrix[day],
          [meal]: !prev.matrix[day][meal]
        }
      }
    }));
  };

  const toggleMealRow = (meal: MealType) => {
    // Check if all cells in this meal row are selected
    const allSelected = DAYS.every(day => config.matrix[day.key][meal]);
    
    const newMatrix = { ...config.matrix };
    DAYS.forEach(day => {
      newMatrix[day.key][meal] = !allSelected;
    });
    
    setConfig(prev => ({
      ...prev,
      matrix: newMatrix
    }));
  };

  const toggleAll = () => {
    const allSelected = DAYS.every(day =>
      MEALS.every(meal => config.matrix[day.key][meal.key])
    );
    
    const newMatrix = { ...config.matrix };
    DAYS.forEach(day => {
      const dayKey = day.key;
      MEALS.forEach(meal => {
        const mealKey = meal.key;
        newMatrix[dayKey][mealKey] = !allSelected;
      });
    });
    
    setConfig(prev => ({
      ...prev,
      matrix: newMatrix
    }));
  };

  const openTimePicker = (meal: MealType, type: 'start' | 'end') => {
    setShowTimePicker({ meal, type });
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    if (selectedTime && showTimePicker) {
      const { meal, type } = showTimePicker;
      setConfig(prev => ({
        ...prev,
        mealTimes: {
          ...prev.mealTimes,
          [meal]: {
            ...prev.mealTimes[meal],
            [type]: selectedTime
          }
        }
      }));
    }
    setShowTimePicker(null);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const getSelectedCount = () => {
    let count = 0;
    DAYS.forEach(day => {
      const dayKey = day.key;
      MEALS.forEach(meal => {
        const mealKey = meal.key;
        if (config.matrix[dayKey][mealKey]) {
          count++;
        }
      });
    });
    return count;
  };

  const calculateSubscriptionPrice = () => {
    // Example calculation: $10 per meal per day
    const selectedCount = getSelectedCount();
    const pricePerMealPerDay = 10;
    
    return selectedCount * pricePerMealPerDay;
  };

  const handleCreateSubscription = () => {
    const selectedItems: string[] = [];
    
    DAYS.forEach(day => {
      const dayKey = day.key;
      const dayLabel = day.label;
      MEALS.forEach(meal => {
        const mealKey = meal.key;
        const mealLabel = meal.label;
        if (config.matrix[dayKey][mealKey]) {
          selectedItems.push(`${dayLabel} ${mealLabel}`);
        }
      });
    });

    Alert.alert(
      'Confirm Subscription',
      `You are subscribing to:\n\n` +
      `• ${selectedItems.length} time slots\n` +
      `• Price: $${calculateSubscriptionPrice()} per week\n\n` +
      `Meal times:\n` +
      `• 1st: ${formatTime(config.mealTimes.breakfast.start)}\n` +
      `• 2nd: ${formatTime(config.mealTimes.lunch.start)}\n` +
      `• 3rd: ${formatTime(config.mealTimes.dinner.start)}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Subscribe', 
          onPress: () => {
            // Here you would save the subscription to your backend
            Alert.alert('Success', 'Subscription created successfully!');
            router.back();
          }
        }
      ]
    );
    router.push({
      pathname: '/subscriptions/[restaurantId]/menu',
      params: {restaurantId}
    })
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.tint} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!restaurant) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.defaultColor }}>Restaurant not found</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Back button */}
      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => router.back()}
      >
        <Ionicons name="arrow-back" size={24} color={colors.defaultColor} />
      </TouchableOpacity>

      {/* Restaurant Profile Picture */}
      <View style={styles.profileSection}>
        <View style={styles.profileImageContainer}>
          {restaurant.profileImage ? (
            <Image 
              source={{ uri: restaurant.profileImage }} 
              style={styles.profileImage}
            />
          ) : (
            <View style={[styles.profileImage, styles.profileImagePlaceholder]}>
              <Ionicons name="restaurant" size={40} color={colors.second} />
            </View>
          )}
        </View>
        <Text style={[styles.restaurantName, { color: colors.defaultColor }]}>
          {restaurant.restaurantName}
        </Text>
        <Text style={[styles.restaurantDescription, { color: colors.second }]}>
          Create Subscription
        </Text>
      </View>

      <ScrollView style={styles.contentContainer}>

        {/* Meals Selection */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Select Meals
            </Text>
          </View>
          
          <View>
            {/* Table Header - Days */}
            <View style={styles.tableRow}>
              <View style={[styles.cornerCell, { width: 50 }]}>
                <Text style={styles.dayHeaderText}>
                  Meal
                </Text>
              </View>
              {DAYS.map(day => (
                <View key={day.key} style={[styles.dayHeaderCell, { width: CELL_WIDTH }]}>
                  <Text style={[styles.dayHeaderText, { color: colors.defaultColor }]}>
                    {day.short}
                  </Text>
                </View>
              ))}
            </View>

            {/* Table Rows - Meals */}
            {MEALS.map(meal => (
              <View key={meal.key} style={styles.tableRow}>
                {/* Meal Label Cell */}
                <TouchableOpacity
                  style={[styles.mealLabelCell, { width: 50 }]}
                  onPress={() => toggleMealRow(meal.key)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.mealLabel, { color: colors.defaultColor }]}>
                    {meal.label}
                  </Text>
                </TouchableOpacity>

                {/* Checkbox Cells for each day */}
                {DAYS.map(day => (
                  <TouchableOpacity
                    key={`${day.key}-${meal.key}`}
                    style={[styles.checkboxCell, { width: CELL_WIDTH }]}
                    onPress={() => toggleCell(day.key, meal.key)}
                    activeOpacity={0.7}
                  >
                    <Checkbox.Android
                      status={config.matrix[day.key][meal.key] ? 'checked' : 'unchecked'}
                      color={colors.defaultColor}
                      uncheckedColor={colors.defaultColor}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </View>
        </View>

        {/* Time Settings */}
        <View style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, { color: colors.defaultColor }]}>
            Set Meal Times
          </Text>
          
          {MEALS.map(meal => (
            <View key={meal.key} style={styles.timeSettingContainer}>
              <Text style={[styles.mealTimeLabel, { color: colors.defaultColor }]}>
                {meal.label} Time:
              </Text>
              
              <View style={styles.timeInputsRow}>
                <TouchableOpacity
                  style={[styles.timeInput, { borderColor: colors.defaultColor }]}
                  onPress={() => openTimePicker(meal.key, 'start')}
                  activeOpacity={0.7}
                >
                  <Ionicons name="time-outline" size={20} color={colors.defaultColor} />
                  <Text style={[styles.timeInputText, { color: colors.defaultColor }]}>
                    {formatTime(config.mealTimes[meal.key].start)}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        {/* Action Button */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.subscribeButton, { backgroundColor: colors.defaultColor }]}
            onPress={handleCreateSubscription}
            activeOpacity={0.8}
          >
            <Text style={styles.subscribeButtonText}>
              Next
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Time Picker */}
      {showTimePicker && (
        <DateTimePicker
          value={config.mealTimes[showTimePicker.meal][showTimePicker.type]}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleTimeChange}
        />
      )}
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 10,
    padding: 8,
  },
  profileSection: {
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 20,
  },
  profileImageContainer: {
    marginBottom: 16,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  profileImagePlaceholder: {
    backgroundColor: colors.second,
    justifyContent: 'center',
    alignItems: 'center',
  },
  restaurantName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
    textAlign: 'center',
  },
  restaurantDescription: {
    fontSize: 16,
    textAlign: 'center',
  },
  contentContainer: {
    flex: 1,
    padding: 25,
  },
  summaryCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.defaultColor,
  },
  summaryText: {
    fontSize: 16,
    fontWeight: '600',
  },
  selectAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
  sectionCard: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 21,
    fontWeight: 'bold',
    marginBottom: 20,
    color: colors.defaultColor,
  },
  tableRow: {
    flexDirection: 'row',
    minHeight: CELL_HEIGHT,
    alignItems: 'center',
  },
  cornerCell: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayHeaderCell: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
  },
  dayHeaderText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.defaultColor,
  },
  mealLabelCell: {
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingHorizontal: 12,
  },
  mealLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.defaultColor,
  },
  checkboxCell: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeSettingContainer: {
    marginBottom: 16,
  },
  mealTimeLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: colors.defaultColor,
  },
  timeInputsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timeInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  timeInputText: {
    fontSize: 16,
    marginLeft: 8,
    fontWeight: '500',
    color: colors.defaultColor,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 30,
  },
  subscribeButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subscribeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.second,
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
});