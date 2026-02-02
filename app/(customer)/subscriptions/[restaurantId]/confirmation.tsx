// app/(customer)/subscriptions/[restaurantId]/confirmation/index.tsx
import { useSubscription } from '@/context/SubscriptionContext';
import { useTheme } from '@/context/ThemeContext';
import { restaurantApi } from '@/services/api/restaurantApi';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function SubscriptionConfirmationScreen() {
  const { restaurantId } = useLocalSearchParams<{ restaurantId: string }>();
  const { colors } = useTheme();
  const { selectedSchedule, clearSchedule } = useSubscription();
  const [restaurant, setRestaurant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const styles = createStyles(colors);

  useEffect(() => {
    loadRestaurantData();
  }, [restaurantId]);

  const loadRestaurantData = async () => {
    try {
      const result = await restaurantApi.getRestaurant(restaurantId!);
      if (result.success && result.data) {
        setRestaurant(result.data);
      }
    } catch (error) {
      console.error('Error loading restaurant:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateTotalPrice = () => {
    let total = 0;
    selectedSchedule.forEach(day => {
      day.meals.forEach(meal => {
        // Calculate price for each meal based on selected plates
        // This is just an example - you'll need to implement your own logic
        total += 10; // $10 per meal as placeholder
      });
    });
    return total;
  };

  const handleConfirmSubscription = async () => {
    try {
      // Here you would save the subscription to your backend
      // await subscriptionApi.createSubscription(restaurantId, selectedSchedule);
      
      Alert.alert(
        'Subscription Created!',
        'Your subscription has been successfully created.',
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
    } catch (error) {
      Alert.alert('Error', 'Failed to create subscription. Please try again.');
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.defaultColor }}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.content}>
        <Text style={[styles.title, { color: colors.defaultColor }]}>
          Subscription Summary
        </Text>
        
        <Text style={[styles.restaurantName, { color: colors.defaultColor }]}>
          {restaurant?.restaurantName}
        </Text>
        
        <View style={[styles.summaryCard, { backgroundColor: colors.second }]}>
          <Text style={[styles.summaryTitle, { color: colors.defaultColor }]}>
            Your Subscription Plan
          </Text>
          
          {selectedSchedule.map((day, dayIndex) => (
            <View key={day.day} style={styles.daySection}>
              <Text style={[styles.dayLabel, { color: colors.defaultColor }]}>
                {day.dayLabel}
              </Text>
              
              {day.meals.map((meal, mealIndex) => (
                <View key={`${day.day}-${meal.type}`} style={styles.mealRow}>
                  <View style={styles.mealInfo}>
                    <Text style={[styles.mealType, { color: colors.defaultColor }]}>
                      {meal.typeLabel} Meal
                    </Text>
                    <Text style={[styles.mealTime, { color: colors.second }]}>
                      {meal.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                    </Text>
                  </View>
                  <Text style={[styles.mealPrice, { color: colors.defaultColor }]}>
                    $10.00
                  </Text>
                </View>
              ))}
            </View>
          ))}
          
          <View style={styles.totalSection}>
            <Text style={[styles.totalLabel, { color: colors.defaultColor }]}>
              Weekly Total
            </Text>
            <Text style={[styles.totalPrice, { color: colors.defaultColor }]}>
              ${calculateTotalPrice().toFixed(2)}
            </Text>
          </View>
        </View>
        
        <TouchableOpacity
          style={[styles.confirmButton, { backgroundColor: colors.defaultColor }]}
          onPress={handleConfirmSubscription}
        >
          <Text style={[styles.confirmButtonText, { color: colors.second }]}>
            Confirm Subscription
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.backButton, { borderColor: colors.defaultColor }]}
          onPress={() => router.back()}
        >
          <Text style={[styles.backButtonText, { color: colors.defaultColor }]}>
            Back to Edit
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  restaurantName: {
    fontSize: 20,
    textAlign: 'center',
    marginBottom: 30,
  },
  summaryCard: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 30,
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  daySection: {
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.defaultColor,
  },
  dayLabel: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
  },
  mealRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  mealInfo: {
    flex: 1,
  },
  mealType: {
    fontSize: 16,
    fontWeight: '500',
  },
  mealTime: {
    fontSize: 14,
  },
  mealPrice: {
    fontSize: 16,
    fontWeight: '600',
  },
  totalSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 2,
    borderTopColor: colors.defaultColor,
  },
  totalLabel: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  totalPrice: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  confirmButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  confirmButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  backButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});