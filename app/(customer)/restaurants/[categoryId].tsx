// app/(customer)/restaurants/[categoryId].tsx
import { useTheme } from '@/context/ThemeContext';
import { restaurantApi } from '@/services/api/restaurantApi';
import { Restaurant } from '@/types/restaurant';
import { ImageButtonsData } from '@/utils/categories';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function RestaurantsByCategoryScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const { categoryId } = useLocalSearchParams<{ categoryId: string }>();
  
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryName, setCategoryName] = useState('');

  useEffect(() => {
    loadRestaurants();
  }, [categoryId]);

  const loadRestaurants = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!categoryId) {
        setError('No category selected');
        return;
      }

      // Get category name from ImageButtonsData
      const category = ImageButtonsData.find(cat => cat.id === categoryId);
      if (category) {
        setCategoryName(category.title);
      }

      // Fetch restaurants by category using the API
      const result = await restaurantApi.getRestaurantsByCategory(categoryId);
      
      if (result.success && result.data) {
        setRestaurants(result.data);
      } else {
        setError(result.error || 'Failed to load restaurants');
      }
    } catch (err) {
      console.error('Error loading restaurants:', err);
      setError('An error occurred while loading restaurants');
    } finally {
      setLoading(false);
    }
  };

  const handleRestaurantPress = (restaurantId: string, restaurantName: string) => {
    router.push({
      pathname: "/(customer)/restaurant/[restaurantId]",
      params: { 
        restaurantId,
        restaurantName 
      }
    });
  };

  const renderRestaurantItem = ({ item }: { item: Restaurant }) => (
    <TouchableOpacity 
      style={styles.restaurantCard}
      onPress={() => handleRestaurantPress(item.id, item.restaurantName)}
    >
      <View style={styles.restaurantInfo}>
        <Text style={styles.restaurantName}>{item.restaurantName}</Text>
      </View>

      {item.headerImage ? (
        <Image 
          source={{ uri: item.headerImage }} 
          style={styles.restaurantImage}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.restaurantImage, styles.noImage]}>
          <Text style={styles.noImageText}>No Image</Text>
        </View>
      )}
      

    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading restaurants...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadRestaurants}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
        onPress={router.back}
        >
            <Ionicons name="arrow-back" style={styles.backButton} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{categoryName} </Text>
      </View>
      <View>
        <Text style={styles.restaurantCount}>
            {restaurants.length} restaurant{restaurants.length !== 1 ? 's' : ''} found
        </Text>
      </View>

      {restaurants.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No restaurants found in this category</Text>
          <Text style={styles.emptySubtext}>Check back later or try another category</Text>
        </View>
      ) : (
        <FlatList
          data={restaurants}
          renderItem={renderRestaurantItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
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
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 3,
    backgroundColor: colors.background,
    flexDirection: 'row',
  },
  backButton: {
    marginVertical: 'auto',
    fontSize: 30,
    color: colors.text,
  },
  headerTitle: {
    marginLeft: 10,
    fontSize: 35,
    fontWeight: 'bold',
    color: colors.text,
  },
  restaurantCount: {
    paddingLeft: 20,
    marginBottom: 10,
    fontSize: 14,
    color: colors.secondaryText,
  },
  listContent: {
    paddingHorizontal: 15,
    paddingTop: 15,
    paddingBottom: 30,
  },
  restaurantCard: {
    backgroundColor: colors.card,
    marginBottom: 15,
    overflow: 'hidden',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  restaurantImage: {
    width: '100%',
    height: 150,
  },
  noImage: {
    backgroundColor: colors.second,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noImageText: {
    color: colors.secondaryText,
    fontSize: 16,
  },
  restaurantInfo: {
    paddingTop: 15,
    paddingBottom: 5,
  },
  restaurantName: {
    fontSize: 25,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 5,
  },
  restaurantDescription: {
    fontSize: 14,
    color: colors.secondaryText,
    marginBottom: 10,
    lineHeight: 20,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginRight: 10,
  },
  reviewsText: {
    fontSize: 14,
    color: colors.secondaryText,
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  moreCategories: {
    fontSize: 12,
    color: colors.secondaryText,
    fontStyle: 'italic',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
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
});