// app/(customer)/subscriptions/index.tsx
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { restaurantApi } from '@/services/api/restaurantApi';
import { subscriptionApi } from '@/services/api/subscriptionApi';
import { Subscription } from '@/types/subscription';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

export default function SubscriptionsScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const styles = createStyles(colors);
  
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Restaurant images cache
  const [restaurantImages, setRestaurantImages] = useState<Record<string, string>>({});
  
  useEffect(() => {
    if (user?.customerId) {
      loadSubscriptions();
    }
  }, [user?.customerId]);

  const loadSubscriptions = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!user?.customerId) {
        setError('User not authenticated');
        return;
      }

      const result = await subscriptionApi.getCustomerSubscriptions(
        user.customerId, 
        ['active', 'paused']
      );
      
      if (result.success && result.data) {
        setSubscriptions(result.data);
        
        // Load restaurant images for each subscription
        const imagePromises = result.data.map(async (subscription) => {
          try {
            const restaurantResult = await restaurantApi.getRestaurant(subscription.restaurantId);
            if (restaurantResult.success && restaurantResult.data?.profileImage) {
              return {
                restaurantId: subscription.restaurantId,
                imageUrl: restaurantResult.data.profileImage
              };
            }
          } catch (err) {
            console.error(`Error loading image for restaurant ${subscription.restaurantId}:`, err);
          }
          return null;
        });

        const imageResults = await Promise.all(imagePromises);
        const images: Record<string, string> = {};
        imageResults.forEach(result => {
          if (result) {
            images[result.restaurantId] = result.imageUrl;
          }
        });
        setRestaurantImages(images);
      } else {
        setError(result.error || 'Failed to load subscriptions');
      }
    } catch (err) {
      console.error('Error loading subscriptions:', err);
      setError('An error occurred while loading subscriptions');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadSubscriptions();
  };

  const handleCancelSubscription = (subscription: Subscription) => {
    Alert.alert(
      'Cancel Subscription',
      `Are you sure you want to cancel your subscription to ${subscription.restaurantName}?`,
      [
        { text: 'Keep Subscription', style: 'cancel' },
        { 
          text: 'Cancel Subscription', 
          style: 'destructive',
          onPress: () => confirmCancelSubscription(subscription.id)
        }
      ]
    );
  };

  const confirmCancelSubscription = async (subscriptionId: string) => {
    try {
      setLoading(true);
      const result = await subscriptionApi.cancelSubscription(subscriptionId);
      
      if (result.success) {
        loadSubscriptions();
      } else {
        Alert.alert('Error', result.error || 'Failed to cancel subscription');
      }
    } catch (err) {
      console.error('Error cancelling subscription:', err);
      Alert.alert('Error', 'An error occurred while cancelling subscription');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubscription = () => {
    router.push('/(customer)');
  };

  const renderSubscriptionItem = ({ item }: { item: Subscription }) => {
    const imageUrl = restaurantImages[item.restaurantId];
    
    return (
      <View style={styles.subscriptionItem}>
        {/* Profile Picture Circle */}
        <View style={styles.imageContainer}>
          {imageUrl ? (
            <Image 
              source={{ uri: imageUrl }} 
              style={styles.restaurantImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.defaultImage}>
              <Ionicons name="restaurant-outline" size={24} color={colors.second} />
            </View>
          )}
        </View>
        
        {/* Restaurant Name */}
        <Text style={styles.restaurantName} numberOfLines={1}>
          {item.restaurantName}
        </Text>
        
        {/* Trash Can on the Right */}
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleCancelSubscription(item)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialIcons name="delete-outline" size={24} color="#EF4444" />
        </TouchableOpacity>
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.tint} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (error && subscriptions.length === 0) {
    return (
      <View style={styles.container}>
        <Ionicons name="alert-circle-outline" size={64} color="#ff4444" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadSubscriptions}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>My Subscriptions</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={handleAddSubscription}
        >
          <Ionicons name="add" size={24} color={colors.second} />
        </TouchableOpacity>
      </View>
      
      {subscriptions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="receipt-outline" size={80} color={colors.second} />
          <Text style={styles.emptyTitle}>No Subscriptions</Text>
          <TouchableOpacity 
            style={styles.findRestaurantsButton}
            onPress={handleAddSubscription}
          >
            <Text style={styles.findRestaurantsButtonText}>Find Restaurants</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={subscriptions}
          renderItem={renderSubscriptionItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.tint]}
              tintColor={colors.tint}
            />
          }
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 15,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.defaultColor,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  subscriptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  imageContainer: {
    marginRight: 16,
  },
  restaurantImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  defaultImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.second,
    justifyContent: 'center',
    alignItems: 'center',
  },
  restaurantName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  deleteButton: {
    padding: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 20,
    marginBottom: 30,
  },
  findRestaurantsButton: {
    backgroundColor: colors.defaultColor,
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
  },
  findRestaurantsButtonText: {
    color: colors.second,
    fontSize: 16,
    fontWeight: '600',
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
  },
  retryButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});