// (customer)/restaurants/[categoryId]/[restaurantId]/index.tsx
import { useTheme } from '@/context/ThemeContext';
import { menuApi } from '@/services/api/menuApi';
import { restaurantApi } from '@/services/api/restaurantApi';
import { Menu, Plate } from '@/types/menu';
import { Restaurant } from '@/types/restaurant';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function RestaurantDetailScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const { restaurantId, restaurantName, categoryId } = useLocalSearchParams<{ 
    restaurantId: string; 
    restaurantName: string;
    categoryId: string;
  }>();
  
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menu, setMenu] = useState<Menu | null>(null);
  const [plates, setPlates] = useState<Plate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRestaurantData();
  }, [restaurantId]);

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

  const handlePlatePress = (plate: Plate) => {
    // Navigate to plate detail screen (you can create this later)
    router.push({
      pathname: "/(customer)/restaurants/[categoryId]/[restaurantId]/plate/[plateId]",
      params: { 
        categoryId,
        restaurantId,
        restaurantName: restaurant?.restaurantName || '',
        plateId: plate.id,
        plateName: plate.name
      }
    });
  };

  const renderPlateItem = ({ item }: { item: Plate }) => (
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
        <Text style={styles.plateDescription} numberOfLines={3}>
          {item.description}
        </Text>
        <Text style={styles.platePrice}>${item.basePrice.toFixed(2)}</Text>
      </View>
    </TouchableOpacity>
  );

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
    <View style={styles.container}>
      {/* Restaurant Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={router.back}>
          <Ionicons name="arrow-back" style={styles.backButton} />
        </TouchableOpacity>
        <Text style={styles.restaurantName}>
          {restaurant?.restaurantName || restaurantName}
        </Text>
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
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 15,
    backgroundColor: colors.background,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    fontSize: 30,
    color: colors.text,
    paddingRight: 20,
  },
  restaurantName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    flex: 1,
  },
  platesList: {
    paddingHorizontal: 15,
    paddingTop: 15,
    paddingBottom: 30,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  plateCard: {
    backgroundColor: colors.third,
    borderRadius: 12,
    overflow: 'hidden',
    width: '48%', // Adjust this value if you want more/less spacing
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
    fontSize: 16,
  },
  plateInfo: {
    padding: 12,
  },
  plateName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
    height: 40, // Fixed height to ensure consistent layout
  },
  plateDescription: {
    fontSize: 13,
    color: colors.secondaryText,
    marginBottom: 8,
    lineHeight: 18,
    height: 54, // Fixed height for 3 lines (3 * 18)
  },
  platePrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
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