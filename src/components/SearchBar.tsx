// components/SearchBar.tsx
import { useTheme } from '@/context/ThemeContext';
import { menuApi } from '@/services/api/menuApi';
import { restaurantApi } from '@/services/api/restaurantApi';
import EvilIcons from '@expo/vector-icons/EvilIcons';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    FlatList,
    Image,
    Modal,
    Platform,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

interface SearchResult {
  id: string;
  name: string;
  imageUrl?: string;
  type: 'restaurant' | 'plate';
  categoryId?: string | null;
  restaurantId?: string;
}

interface SearchBarProps {
  placeholder?: string;
  searchMode?: 'restaurants' | 'plates';
  restaurantId?: string;
  categoryId?: string;
}

export default function SearchBar({
  placeholder = 'Search...',
  searchMode = 'restaurants',
  restaurantId,
  categoryId
}: SearchBarProps) {
  const { colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [opacityAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.95));

  const styles = createStyles(colors);

  // Calculate header height (StatusBar + header)
  const headerHeight = (Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 44) + 56; // 56 is typical header height

    // Debounced search function
    const performSearch = useCallback(
    async (query: string) => {
        if (!query.trim()) {
        setResults([]);
        setShowResults(false);
        return;
        }

        setLoading(true);
        
        try {
        let searchResults: SearchResult[] = [];

        if (searchMode === 'plates' && restaurantId) {
            // Search plates within a restaurant
            const menuResult = await menuApi.getActiveMenu(restaurantId);
            if (menuResult.success && menuResult.data) {
            const plates = menuResult.data.plates || [];
            const filteredPlates = plates.filter(plate =>
                plate.name.toLowerCase().includes(query.toLowerCase()) ||
                plate.description.toLowerCase().includes(query.toLowerCase())
            );

            searchResults = filteredPlates.map(plate => ({
                id: plate.id,
                name: plate.name,
                imageUrl: plate.imageUrl,
                type: 'plate' as const,
                restaurantId,
                categoryId
            }));
            }
        } else {
            // Search restaurants
            if (searchMode === 'restaurants' && categoryId) {
            console.log(`[SearchBar] Getting restaurants by category: ${categoryId}`);
            const restaurantsResult = await restaurantApi.getRestaurantsByCategory(categoryId);
            console.log('[SearchBar] Restaurants by category result:', restaurantsResult);
            
            if (restaurantsResult.success && restaurantsResult.data) {
                console.log(`[SearchBar] Found ${restaurantsResult.data.length} restaurants in category`);
                
                // Filter by search query client-side
                const filteredRestaurants = restaurantsResult.data.filter(restaurant =>
                restaurant.restaurantName.toLowerCase().includes(query.toLowerCase()) ||
                restaurant.displayName?.toLowerCase().includes(query.toLowerCase()) ||
                restaurant.description?.toLowerCase().includes(query.toLowerCase())
                );
                
                console.log(`[SearchBar] Filtered to ${filteredRestaurants.length} restaurants`);
                
                searchResults = filteredRestaurants.map(restaurant => ({
                id: restaurant.id,
                name: restaurant.restaurantName,
                imageUrl: restaurant.profileImage,
                type: 'restaurant' as const,
                categoryId // Use the categoryId passed as prop
                }));
            }
            } else {
            console.log(`[SearchBar] Getting ALL restaurants for client-side filtering`);
            const restaurantsResult = await restaurantApi.getAllRestaurants();
            console.log('[SearchBar] All restaurants result:', restaurantsResult);
            
            if (restaurantsResult.success && restaurantsResult.data) {
                console.log(`[SearchBar] Found ${restaurantsResult.data.length} total restaurants`);
                
                // Filter by search query client-side
                const filteredRestaurants = restaurantsResult.data.filter(restaurant =>
                restaurant.restaurantName.toLowerCase().includes(query.toLowerCase()) ||
                restaurant.displayName?.toLowerCase().includes(query.toLowerCase()) ||
                restaurant.description?.toLowerCase().includes(query.toLowerCase())
                );
                
                console.log(`[SearchBar] Filtered to ${filteredRestaurants.length} restaurants`);
                
                searchResults = filteredRestaurants.map(restaurant => ({
                id: restaurant.id,
                name: restaurant.restaurantName,
                imageUrl: restaurant.profileImage,
                type: 'restaurant' as const,
                categoryId: restaurant.categories?.[0] || null
                }));
            }
            }
        }

        setResults(searchResults);
        if (searchResults.length > 0) {
            showResultsDropdown();
        } else {
            hideResultsDropdown();
        }
        } catch (error) {
        console.error('Search error:', error);
        setResults([]);
        } finally {
        setLoading(false);
        }
    },
    [searchMode, restaurantId, categoryId]
    );

  // Debounce the search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      performSearch(searchQuery);
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [searchQuery, performSearch]);

  const showResultsDropdown = () => {
    setShowResults(true);
    Animated.parallel([
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const hideResultsDropdown = () => {
    Animated.parallel([
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowResults(false);
    });
  };

  const handleResultPress = (result: SearchResult) => {
    console.log(`[SearchBar] Result pressed:`, result);
    
    // Close dropdown and clear search
    setShowResults(false);
    setSearchQuery('');
    
    // Navigate based on result type
    if (result.type === 'restaurant') {
      console.log(`[SearchBar] Navigating to restaurant: ${result.id} in category: ${result.categoryId}`);
      if (result.categoryId) {
        router.push(`/(customer)/restaurants/${result.categoryId}/${result.id}`);
      } else {
        console.error('[SearchBar] Missing categoryId for restaurant navigation');
      }
    } else if (result.type === 'plate') {
      console.log(`[SearchBar] Navigating to plate: ${result.id} in restaurant: ${result.restaurantId}, category: ${result.categoryId}`);
      
      if (result.restaurantId && result.categoryId) {
        router.push(`/(customer)/restaurants/${result.categoryId}/${result.restaurantId}/plate/${result.id}`);
      } else {
        console.error('[SearchBar] Missing restaurantId or categoryId for plate navigation');
      }
    }
  };

  const renderResultItem = ({ item }: { item: SearchResult }) => (
    <TouchableOpacity
      style={styles.resultItem}
      onPress={() => handleResultPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.resultImageContainer}>
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={styles.resultImage} />
        ) : (
          <View style={styles.resultImagePlaceholder}>
            <EvilIcons
              name={item.type === 'restaurant' ? 'location' : 'image'}
              size={24}
              color={colors.second}
            />
          </View>
        )}
      </View>
      <View style={styles.resultTextContainer}>
        <Text style={styles.resultName} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.resultType}>
          {item.type === 'restaurant' ? 'Restaurant' : 'Menu Item'}
        </Text>
      </View>
      <EvilIcons name="chevron-right" size={20} color={colors.second} />
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <EvilIcons name="search" size={40} color={colors.second} />
      <Text style={styles.emptyStateText}>
        {searchQuery.trim() 
          ? `No ${searchMode === 'plates' ? 'dishes' : 'restaurants'} found`
          : 'Start typing to search'}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchBarContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder={placeholder}
          placeholderTextColor={colors.second}
          value={searchQuery}
          onChangeText={setSearchQuery}
          onFocus={() => {
            if (results.length > 0) showResultsDropdown();
          }}
          underlineColorAndroid="transparent"
        />
        {loading ? (
          <ActivityIndicator size="small" color={colors.defaultColor} />
        ) : (
          <EvilIcons name="search" size={25} color={colors.defaultColor} />
        )}
      </View>

      <Modal
        visible={showResults}
        transparent={true}
        animationType="none"
        onRequestClose={hideResultsDropdown}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1}
          onPress={hideResultsDropdown}
        >
          <Animated.View
            style={[
              styles.resultsContainer,
              {
                marginTop: headerHeight,
                opacity: opacityAnim,
                transform: [{ scale: scaleAnim }],
              },
            ]}
            onStartShouldSetResponder={() => true}
          >
            <FlatList
              data={results}
              renderItem={renderResultItem}
              keyExtractor={(item) => `${item.type}-${item.id}`}
              ListEmptyComponent={renderEmptyState}
              keyboardShouldPersistTaps="handled"
              style={styles.resultsList}
              contentContainerStyle={results.length === 0 && styles.emptyListContainer}
            />
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    width: '100%',
  },
  searchBarContainer: {
    flexDirection: 'row',
    backgroundColor: colors.headerBackground,
    width: 220,
    height: 40,
    alignItems: 'center',
    paddingHorizontal: 12,
    borderWidth: 2,
    borderRadius: 20,
    borderColor: colors.defaultColor,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    color: colors.defaultColor,
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'transparent', // Transparent background
    paddingHorizontal: 20,
  },
  resultsContainer: {
    backgroundColor: colors.background,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    maxHeight: 400,
    marginHorizontal: 20,
  },
  resultsList: {
    width: '100%',
  },
  emptyListContainer: {
    flex: 1,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  resultImageContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 12,
    backgroundColor: colors.cardBackground,
  },
  resultImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  resultImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
  },
  resultTextContainer: {
    flex: 1,
    marginRight: 8,
  },
  resultName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.defaultColor,
    marginBottom: 2,
  },
  resultType: {
    fontSize: 12,
    color: colors.second,
  },
  emptyState: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    marginTop: 8,
    fontSize: 14,
    color: colors.second,
    textAlign: 'center',
  },
});