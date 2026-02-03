// app/(customer)/subscriptions/[subscriptionId]/index.tsx
import { useTheme } from '@/context/ThemeContext';
import { restaurantApi } from '@/services/api/restaurantApi';
import { subscriptionApi } from '@/services/api/subscriptionApi';
import { Subscription, SubscriptionStatus } from '@/types/subscription';
import { Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
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

export default function SubscriptionDetailScreen() {
  const { colors } = useTheme();
  const { subscriptionId } = useLocalSearchParams<{ subscriptionId: string }>();
  const styles = createStyles(colors);
  
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [restaurantImage, setRestaurantImage] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  
  useEffect(() => {
    loadSubscription();
  }, [subscriptionId]);

  const loadSubscription = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!subscriptionId) {
        setError('No subscription selected');
        return;
      }

      const result = await subscriptionApi.getSubscription(subscriptionId);
      
      if (result.success && result.data) {
        setSubscription(result.data);
        
        // Load restaurant image
        const restaurantResult = await restaurantApi.getRestaurant(result.data.restaurantId);
        if (restaurantResult.success && restaurantResult.data?.profileImage) {
          setRestaurantImage(restaurantResult.data.profileImage);
        }
      } else {
        setError(result.error || 'Subscription not found');
      }
    } catch (err) {
      console.error('Error loading subscription:', err);
      setError('An error occurred while loading subscription');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = () => {
    if (!subscription) return;
    
    Alert.alert(
      'Cancel Subscription',
      `Are you sure you want to cancel your subscription to ${subscription.restaurantName}?`,
      [
        { text: 'Keep Subscription', style: 'cancel' },
        { 
          text: 'Cancel Subscription', 
          style: 'destructive',
          onPress: () => confirmCancelSubscription()
        }
      ]
    );
  };

  const confirmCancelSubscription = async () => {
    if (!subscription) return;
    
    try {
      setCancelling(true);
      
      const result = await subscriptionApi.cancelSubscription(subscription.id);
      
      if (result.success) {
        Alert.alert(
          'Subscription Cancelled',
          `Your subscription to ${subscription.restaurantName} has been cancelled.`,
          [
            { 
              text: 'OK',
              onPress: () => {
                // Navigate back to subscriptions list
                router.back();
              }
            }
          ]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to cancel subscription');
      }
    } catch (err) {
      console.error('Error cancelling subscription:', err);
      Alert.alert('Error', 'An error occurred while cancelling subscription');
    } finally {
      setCancelling(false);
    }
  };

  const handlePauseSubscription = () => {
    if (!subscription) return;
    
    Alert.alert(
      'Pause Subscription',
      'How long would you like to pause your subscription?',
      [
        { text: '1 Week', onPress: () => pauseSubscription(7) },
        { text: '2 Weeks', onPress: () => pauseSubscription(14) },
        { text: '1 Month', onPress: () => pauseSubscription(30) },
        { text: 'Custom', onPress: () => {/* Open date picker */} },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const pauseSubscription = async (days: number) => {
    if (!subscription) return;
    
    try {
      const pausedUntil = new Date();
      pausedUntil.setDate(pausedUntil.getDate() + days);
      
      const result = await subscriptionApi.pauseSubscription(
        subscription.id,
        pausedUntil.toISOString()
      );
      
      if (result.success) {
        Alert.alert(
          'Subscription Paused',
          `Your subscription has been paused until ${pausedUntil.toLocaleDateString()}.`,
          [{ text: 'OK', onPress: () => loadSubscription() }]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to pause subscription');
      }
    } catch (err) {
      console.error('Error pausing subscription:', err);
      Alert.alert('Error', 'An error occurred while pausing subscription');
    }
  };

  const handleResumeSubscription = async () => {
    if (!subscription) return;
    
    try {
      const result = await subscriptionApi.resumeSubscription(subscription.id);
      
      if (result.success) {
        Alert.alert(
          'Subscription Resumed',
          'Your subscription has been resumed.',
          [{ text: 'OK', onPress: () => loadSubscription() }]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to resume subscription');
      }
    } catch (err) {
      console.error('Error resuming subscription:', err);
      Alert.alert('Error', 'An error occurred while resuming subscription');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: SubscriptionStatus) => {
    switch (status) {
      case 'active':
        return '#10B981'; // Green
      case 'paused':
        return '#F59E0B'; // Yellow/Orange
      case 'cancelled':
        return '#EF4444'; // Red
      case 'expired':
        return '#6B7280'; // Gray
      default:
        return colors.defaultColor;
    }
  };

  const getStatusText = (status: SubscriptionStatus) => {
    switch (status) {
      case 'active':
        return 'Active';
      case 'paused':
        return 'Paused';
      case 'cancelled':
        return 'Cancelled';
      case 'expired':
        return 'Expired';
      default:
        return status;
    }
  };

  const formatFrequency = (frequency: string) => {
    switch (frequency) {
      case 'daily':
        return 'Daily';
      case 'weekly':
        return 'Weekly';
      case 'biweekly':
        return 'Every 2 Weeks';
      case 'monthly':
        return 'Monthly';
      default:
        return frequency;
    }
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
        <TouchableOpacity style={styles.retryButton} onPress={loadSubscription}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Back to Subscriptions</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isActive = subscription.status === 'active';
  const isPaused = subscription.status === 'paused';

  return (
    <View style={styles.container}>
      {/* Header with image */}
      <View style={styles.header}>
        {restaurantImage ? (
          <Image 
            source={{ uri: restaurantImage }} 
            style={styles.headerImage}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.headerImage, styles.defaultHeaderImage]}>
            <Ionicons name="restaurant-outline" size={60} color={colors.second} />
          </View>
        )}
        
        <View style={styles.headerOverlay}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          
          <View style={styles.headerContent}>
            <Text style={styles.restaurantName}>{subscription.restaurantName}</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(subscription.status) }]}>
              <Text style={styles.statusBadgeText}>{getStatusText(subscription.status)}</Text>
            </View>
          </View>
        </View>
      </View>
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Subscription Info Card */}
        <View style={styles.infoCard}>
          <Text style={styles.sectionTitle}>Subscription Details</Text>
          
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Ionicons name="calendar-outline" size={20} color={colors.defaultColor} />
              <Text style={styles.infoLabel}>Frequency</Text>
              <Text style={styles.infoValue}>{formatFrequency(subscription.frequency)}</Text>
            </View>
            
            <View style={styles.infoItem}>
              <Ionicons name="cash-outline" size={20} color={colors.defaultColor} />
              <Text style={styles.infoLabel}>Amount</Text>
              <Text style={styles.infoValue}>${subscription.billing.total.toFixed(2)}</Text>
            </View>
            
            <View style={styles.infoItem}>
              <Ionicons name="time-outline" size={20} color={colors.defaultColor} />
              <Text style={styles.infoLabel}>Start Date</Text>
              <Text style={styles.infoValue}>{formatDate(subscription.startDate)}</Text>
            </View>
            
            <View style={styles.infoItem}>
              <Ionicons name="calendar-clear-outline" size={20} color={colors.defaultColor} />
              <Text style={styles.infoLabel}>Next Delivery</Text>
              <Text style={styles.infoValue}>{formatDate(subscription.nextDeliveryDate)}</Text>
            </View>
          </View>
          
          <View style={styles.subscriptionNumberContainer}>
            <Text style={styles.subscriptionNumberLabel}>Subscription ID:</Text>
            <Text style={styles.subscriptionNumber}>{subscription.subscriptionNumber}</Text>
          </View>
        </View>
        
        {/* Delivery Address Card */}
        {subscription.deliveryAddress && (
          <View style={styles.addressCard}>
            <Text style={styles.sectionTitle}>Delivery Address</Text>
            
            <View style={styles.addressContent}>
              <MaterialIcons name="location-on" size={24} color={colors.defaultColor} style={styles.addressIcon} />
              <View style={styles.addressDetails}>
                <Text style={styles.addressLabel}>{subscription.deliveryAddress.label}</Text>
                <Text style={styles.addressText}>{subscription.deliveryAddress.address}</Text>
                {subscription.deliveryAddress.apartment && (
                  <Text style={styles.addressText}>Apt: {subscription.deliveryAddress.apartment}</Text>
                )}
                <Text style={styles.addressText}>
                  {subscription.deliveryAddress.city}, {subscription.deliveryAddress.postalCode}
                </Text>
                {subscription.deliveryAddress.instructions && (
                  <Text style={styles.addressInstructions}>
                    Notes: {subscription.deliveryAddress.instructions}
                  </Text>
                )}
              </View>
            </View>
          </View>
        )}
        
        {/* Schedule Summary Card */}
        <View style={styles.scheduleCard}>
          <Text style={styles.sectionTitle}>Weekly Schedule</Text>
          
          {subscription.schedule
            .filter(day => !day.skipDelivery && day.meals.length > 0)
            .map((day, index) => (
              <View key={day.id} style={styles.daySchedule}>
                <Text style={styles.dayName}>
                  {day.day.charAt(0).toUpperCase() + day.day.slice(1)}
                </Text>
                <View style={styles.mealsContainer}>
                  {day.meals.map(meal => (
                    <View key={meal.id} style={styles.mealItem}>
                      <Text style={styles.mealType}>
                        {meal.type.charAt(0).toUpperCase() + meal.type.slice(1)}
                      </Text>
                      <Text style={styles.mealTime}>
                        {meal.deliveryTime || subscription.defaultDeliveryTime || '12:00'}
                      </Text>
                      <Text style={styles.mealItems}>
                        {meal.items.length} item{meal.items.length !== 1 ? 's' : ''}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
        </View>
        
        {/* Action Buttons */}
        <View style={styles.actionsCard}>
          {isActive && (
            <TouchableOpacity 
              style={[styles.actionButton, styles.pauseButton]}
              onPress={handlePauseSubscription}
              disabled={cancelling}
            >
              <MaterialCommunityIcons name="pause" size={20} color="#F59E0B" />
              <Text style={[styles.actionButtonText, { color: '#F59E0B' }]}>Pause Subscription</Text>
            </TouchableOpacity>
          )}
          
          {isPaused && (
            <TouchableOpacity 
              style={[styles.actionButton, styles.resumeButton]}
              onPress={handleResumeSubscription}
              disabled={cancelling}
            >
              <MaterialCommunityIcons name="play" size={20} color="#10B981" />
              <Text style={[styles.actionButtonText, { color: '#10B981' }]}>Resume Subscription</Text>
            </TouchableOpacity>
          )}
          
          {(isActive || isPaused) && (
            <TouchableOpacity 
              style={[styles.actionButton, styles.cancelButton]}
              onPress={handleCancelSubscription}
              disabled={cancelling}
            >
              {cancelling ? (
                <ActivityIndicator size="small" color="#EF4444" />
              ) : (
                <>
                  <MaterialIcons name="delete-outline" size={20} color="#EF4444" />
                  <Text style={[styles.actionButtonText, { color: '#EF4444' }]}>Cancel Subscription</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
        
        {/* Footer Space */}
        <View style={styles.footer} />
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    height: 200,
    position: 'relative',
  },
  headerImage: {
    width: '100%',
    height: '100%',
  },
  defaultHeaderImage: {
    backgroundColor: colors.second,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    paddingTop: 50,
    paddingHorizontal: 16,
  },
  backButton: {
    padding: 8,
    alignSelf: 'flex-start',
  },
  headerContent: {
    marginTop: 30,
  },
  restaurantName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 8,
  },
  statusBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 40,
  },
  infoCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  infoItem: {
    width: '48%',
    marginBottom: 16,
  },
  infoLabel: {
    fontSize: 12,
    color: colors.secondaryText,
    marginTop: 4,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  subscriptionNumberContainer: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  subscriptionNumberLabel: {
    fontSize: 12,
    color: colors.secondaryText,
    marginBottom: 4,
  },
  subscriptionNumber: {
    fontSize: 14,
    fontFamily: 'monospace',
    color: colors.text,
  },
  addressCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  addressContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  addressIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  addressDetails: {
    flex: 1,
  },
  addressLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  addressText: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 2,
  },
  addressInstructions: {
    fontSize: 14,
    color: colors.secondaryText,
    fontStyle: 'italic',
    marginTop: 8,
  },
  scheduleCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  daySchedule: {
    marginBottom: 16,
  },
  dayName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  mealsContainer: {
    marginLeft: 8,
  },
  mealItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  mealType: {
    fontSize: 14,
    color: colors.text,
    width: 80,
  },
  mealTime: {
    fontSize: 14,
    color: colors.secondaryText,
    width: 60,
  },
  mealItems: {
    fontSize: 14,
    color: colors.defaultColor,
    fontWeight: '500',
  },
  actionsCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
  },
  pauseButton: {
    borderColor: '#F59E0B',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
  },
  resumeButton: {
    borderColor: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  cancelButton: {
    borderColor: '#EF4444',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  footer: {
    height: 20,
  },
  loadingText: {
    marginTop: 16,
    color: colors.secondaryText,
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
  backButtonText: {
    color: colors.defaultColor,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});