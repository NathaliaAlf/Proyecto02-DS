import { useTheme } from '@/context/ThemeContext';
import { menuApi } from '@/services/api/menuApi';
import { restaurantApi } from '@/services/api/restaurantApi';
import { Menu, Plate } from '@/types/menu';
import { Restaurant } from '@/types/restaurant';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function RestaurantDetailScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const { restaurantId, restaurantName } = useLocalSearchParams<{ 
    restaurantId: string; 
    restaurantName: string 
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
      pathname: "/(customer)/restaurant/[restaurantId]/plate/[plateId]",
      params: { 
        restaurantId,
        restaurantName: restaurant?.restaurantName || '',
        plateId: plate.id,
        plateName: plate.name
      }
    });
  };

  const renderPlateItem = ({ item }: { item: Plate }) => (
    <View style={styles.plateCard}>
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
        <Text style={styles.plateName}>{item.name}</Text>
        <Text style={styles.plateDescription} numberOfLines={2}>
          {item.description}
        </Text>
        <Text style={styles.platePrice}>${item.basePrice.toFixed(2)}</Text>
        
        {/* Show available customizations */}
        {item.sections.length > 0 && (
          <View style={styles.customizationsContainer}>
            <Text style={styles.customizationsTitle}>Customizable:</Text>
            <View style={styles.sectionsContainer}>
              {item.sections.slice(0, 3).map((section, index) => (
                <View key={index} style={styles.sectionTag}>
                  <Text style={styles.sectionText}>
                    {section.name} ({section.options.length} options)
                  </Text>
                </View>
              ))}
              {item.sections.length > 3 && (
                <Text style={styles.moreSections}>
                  +{item.sections.length - 3} more sections
                </Text>
              )}
            </View>
          </View>
        )}
        
        {/* Show base ingredients */}
        <View style={styles.ingredientsContainer}>
          <Text style={styles.ingredientsTitle}>Ingredients:</Text>
          <Text style={styles.ingredientsText} numberOfLines={2}>
            {item.baseIngredients.slice(0, 3).join(', ')}
            {item.baseIngredients.length > 3 && '...'}
          </Text>
        </View>
      </View>
    </View>
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
        <Text style={styles.restaurantName}>
          {restaurant?.restaurantName || restaurantName}
        </Text>
        
        {restaurant?.description && (
          <Text style={styles.restaurantDescription}>
            {restaurant.description}
          </Text>
        )}
        
      </View>

      {/* Menu Section */}
      <View style={styles.menuSection}>
        <Text style={styles.menuTitle}>
          {menu?.name || 'Menu'}
        </Text>
        
        {menu?.description && (
          <Text style={styles.menuDescription}>{menu.description}</Text>
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
          ListHeaderComponent={
            <Text style={styles.platesCount}>
              {plates.length} item{plates.length !== 1 ? 's' : ''} available
            </Text>
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
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  restaurantName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  restaurantDescription: {
    fontSize: 16,
    color: colors.secondaryText,
    lineHeight: 22,
    marginBottom: 15,
  },
  restaurantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginRight: 8,
  },
  reviewsText: {
    fontSize: 14,
    color: colors.secondaryText,
  },
  addressText: {
    fontSize: 14,
    color: colors.secondaryText,
    fontStyle: 'italic',
  },
  menuSection: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: colors.card,
    marginTop: 10,
    marginHorizontal: 20,
    borderRadius: 12,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  menuTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 5,
  },
  menuDescription: {
    fontSize: 14,
    color: colors.secondaryText,
    lineHeight: 20,
  },
  platesList: {
    paddingHorizontal: 15,
    paddingTop: 15,
    paddingBottom: 30,
  },
  platesCount: {
    fontSize: 16,
    color: colors.secondaryText,
    marginBottom: 15,
    paddingHorizontal: 5,
  },
  plateCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    marginBottom: 15,
    overflow: 'hidden',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  plateImage: {
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
  plateInfo: {
    padding: 15,
  },
  plateName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 5,
  },
  plateDescription: {
    fontSize: 14,
    color: colors.secondaryText,
    marginBottom: 10,
    lineHeight: 20,
  },
  platePrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 12,
  },
  customizationsContainer: {
    marginBottom: 10,
  },
  customizationsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 5,
  },
  sectionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  sectionTag: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    marginRight: 8,
    marginBottom: 5,
  },
  sectionText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '500',
  },
  moreSections: {
    fontSize: 12,
    color: colors.secondaryText,
    fontStyle: 'italic',
  },
  ingredientsContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border + '40',
  },
  ingredientsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 3,
  },
  ingredientsText: {
    fontSize: 13,
    color: colors.secondaryText,
    fontStyle: 'italic',
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