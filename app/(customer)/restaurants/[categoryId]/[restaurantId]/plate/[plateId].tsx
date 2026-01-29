// (customer)/restaurants/[categoryId]/[restaurantId]/plate/[plateId].tsx
import { useTheme } from '@/context/ThemeContext';
import { menuApi } from '@/services/api/menuApi';
import { Plate } from '@/types/menu';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function PlateDetailScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const { restaurantId, plateId, plateName } = useLocalSearchParams<{
    restaurantId: string;
    plateId: string;
    plateName: string;
  }>();
  
  const [plate, setPlate] = useState<Plate | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string[]>>({});

  useEffect(() => {
    loadPlate();
  }, [restaurantId, plateId]);

  const loadPlate = async () => {
    try {
      if (!restaurantId || !plateId) return;
      
      // You might want to get the menu first, then find the plate
      const menuResult = await menuApi.getActiveMenu(restaurantId);
      if (menuResult.success && menuResult.data) {
        const foundPlate = menuResult.data.plates.find(p => p.id === plateId);
        setPlate(foundPlate || null);
      }
    } catch (error) {
      console.error('Error loading plate:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleOption = (sectionId: string, optionId: string, multiple: boolean) => {
    setSelectedOptions(prev => {
      const current = prev[sectionId] || [];
      
      if (multiple) {
        // Toggle the option
        if (current.includes(optionId)) {
          return {
            ...prev,
            [sectionId]: current.filter(id => id !== optionId)
          };
        } else {
          return {
            ...prev,
            [sectionId]: [...current, optionId]
          };
        }
      } else {
        // Single selection - replace
        return {
          ...prev,
          [sectionId]: [optionId]
        };
      }
    });
  };

  const calculateTotalPrice = () => {
    if (!plate) return 0;
    
    let total = plate.basePrice;
    
    Object.entries(selectedOptions).forEach(([sectionId, optionIds]) => {
      const section = plate.sections.find(s => s.id === sectionId);
      if (section) {
        optionIds.forEach(optionId => {
          const option = section.options.find(o => o.id === optionId);
          if (option?.additionalCost) {
            total += option.additionalCost;
          }
        });
      }
    });
    
    return total;
  };

  const handleAddToOrder = async () => {
    if (!plate) return;
    
    // Convert selected options to the format expected by menuApi.calculateCustomizedPlate
    const selectedOptionArray = Object.entries(selectedOptions).flatMap(([sectionId, optionIds]) =>
      optionIds.map(optionId => ({ sectionId, optionId }))
    );
    
    // Calculate the customized plate
    const result = await menuApi.calculateCustomizedPlate(
      restaurantId!,
      plateId!,
      selectedOptionArray
    );
    
    if (result.success && result.data) {
      // You can add this to a cart/order context
      console.log('Added to order:', result.data);
      
      // Navigate back or to cart
      router.back();
    }
  };

  if (loading || !plate) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Plate Image */}
      {plate.imageUrl ? (
        <Image 
          source={{ uri: plate.imageUrl }} 
          style={styles.plateImage}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.plateImage, styles.noImage]}>
          <Text style={styles.noImageText}>No Image Available</Text>
        </View>
      )}
      
      {/* Plate Info */}
      <View style={styles.content}>
        <Text style={styles.plateName}>{plate.name}</Text>
        <Text style={styles.plateDescription}>{plate.description}</Text>
        <Text style={styles.basePrice}>Base Price: ${plate.basePrice.toFixed(2)}</Text>
        
        {/* Base Ingredients */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ingredients</Text>
          <View style={styles.ingredientsList}>
            {plate.baseIngredients.map((ingredient, index) => (
              <Text key={index} style={styles.ingredientItem}>
                • {ingredient}
              </Text>
            ))}
          </View>
        </View>
        
        {/* Customizable Sections */}
        {plate.sections.map(section => (
          <View key={section.id} style={styles.section}>
            <Text style={styles.sectionTitle}>
              {section.name}
              {section.required && <Text style={styles.required}> *</Text>}
              {section.multiple && <Text style={styles.multipleNote}> (Choose multiple)</Text>}
            </Text>
            
            <View style={styles.optionsContainer}>
              {section.options.map(option => {
                const isSelected = selectedOptions[section.id]?.includes(option.id);
                
                return (
                  <TouchableOpacity
                    key={option.id}
                    style={[
                      styles.optionButton,
                      isSelected && styles.optionButtonSelected
                    ]}
                    onPress={() => toggleOption(section.id, option.id, section.multiple)}
                    disabled={section.required && section.options.length === 1}
                  >
                    {section.ingredientDependent && option.ingredients && option.ingredients.length > 0 && (
                      <Text style={styles.optionIngredients}>
                        Adds: {option.ingredients.join(', ')}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}
        
        {/* Total Price */}
        <View style={styles.totalSection}>
          <Text style={styles.totalLabel}>Total:</Text>
          <Text style={styles.totalPrice}>${calculateTotalPrice().toFixed(2)}</Text>
        </View>
        
        {/* Add to Order Button */}
        <TouchableOpacity 
          style={styles.addButton}
          onPress={handleAddToOrder}
        >
          <Text style={styles.addButtonText}>Add to Order</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
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
  },
  plateImage: {
    width: '100%',
    height: 250,
  },
  noImage: {
    backgroundColor: colors.second,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noImageText: {
    fontSize: 16,
    color: colors.secondaryText,
  },
  content: {
    padding: 20,
  },
  plateName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 10,
  },
  plateDescription: {
    fontSize: 16,
    color: colors.secondaryText,
    lineHeight: 24,
    marginBottom: 15,
  },
  basePrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 25,
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 15,
  },
  required: {
    color: colors.error,
  },
  multipleNote: {
    fontSize: 14,
    color: colors.secondaryText,
    fontStyle: 'italic',
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  optionButton: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    minWidth: 100,
  },
  optionButtonSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  optionText: {
    fontSize: 14,
    color: colors.text,
    textAlign: 'center',
  },
  optionTextSelected: {
    color: 'white',
    fontWeight: '600',
  },
  optionPrice: {
    color: colors.success,
    fontWeight: '600',
  },
  optionIngredients: {
    fontSize: 12,
    color: colors.secondaryText,
    marginTop: 5,
    textAlign: 'center',
  },
  ingredientsList: {
    marginTop: 10,
  },
  ingredientItem: {
    fontSize: 14,
    color: colors.secondaryText,
    marginBottom: 5,
  },
  totalSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: 20,
  },
  totalLabel: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
  },
  totalPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
  },
  addButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  addButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});