import { CartItem } from '@/types/customer';
import { Ingredient } from '@/types/menu';

export function reconstructPlateState(cartItem: CartItem) {
  if (!cartItem.plateDetails) {
    return null;
  }
  
  const { plateDetails } = cartItem;
  
  // Reconstruct the plate object
  const reconstructedPlate = {
    id: cartItem.plateId,
    name: cartItem.plateName,
    description: plateDetails.description,
    basePrice: plateDetails.basePrice,
    baseIngredients: plateDetails.baseIngredients,
    imageUrl: cartItem.imageUrl || undefined,
    sections: plateDetails.sections,
    // Note: variants are not stored in cart - they would need to be recalculated
    // or fetched from the menu if needed
  };
  
  // Reconstruct customization state
  const reconstructedState = {
    selectedOptions: { ...plateDetails.customizationState.selectedOptions },
    removedIngredients: new Set(plateDetails.customizationState.removedIngredients),
    quantity: plateDetails.customizationState.quantity,
    notes: plateDetails.customizationState.notes,
    currentIngredients: plateDetails.currentIngredients,
    
    // Helper methods
    getCurrentIngredients: () => plateDetails.currentIngredients,
    calculateTotalPrice: () => {
      let total = plateDetails.basePrice;
      
      // Add costs from selected options
      Object.entries(plateDetails.customizationState.selectedOptions).forEach(([sectionId, optionIds]) => {
        const section = plateDetails.sections.find(s => s.id === sectionId);
        if (section) {
          optionIds.forEach(optionId => {
            const option = section.options.find(o => o.id === optionId);
            if (option) {
              total += option.additionalCost || 0;
            }
          });
        }
      });
      
      return total * plateDetails.customizationState.quantity;
    },
    
    // Get selected option details
    getSelectedOptionDetails: () => {
      const selectedOptionDetails: Array<{
        sectionId: string;
        sectionName: string;
        optionId: string;
        optionName: string;
        additionalCost: number;
        ingredientDependent?: boolean;
        optionIngredients?: Ingredient[];
      }> = [];
      
      Object.entries(plateDetails.customizationState.selectedOptions).forEach(([sectionId, optionIds]) => {
        const section = plateDetails.sections.find(s => s.id === sectionId);
        if (section) {
          optionIds.forEach(optionId => {
            const option = section.options.find(o => o.id === optionId);
            if (option) {
              selectedOptionDetails.push({
                sectionId,
                sectionName: section.name,
                optionId,
                optionName: option.name,
                additionalCost: option.additionalCost || 0,
                ingredientDependent: section.ingredientDependent,
                optionIngredients: option.ingredients || []
              });
            }
          });
        }
      });
      
      return selectedOptionDetails;
    }
  };
  
  return {
    plate: reconstructedPlate,
    state: reconstructedState
  };
}

// Helper to check if two cart items have the same customization
export function areItemsCustomizedSame(item1: CartItem, item2: CartItem): boolean {
  if (item1.plateId !== item2.plateId) return false;
  
  // Compare selected options
  const opts1 = JSON.stringify(item1.selectedOptions.sort((a, b) => a.sectionId.localeCompare(b.sectionId)));
  const opts2 = JSON.stringify(item2.selectedOptions.sort((a, b) => a.sectionId.localeCompare(b.sectionId)));
  
  // Compare custom ingredients
  const ing1 = JSON.stringify(item1.customIngredients?.sort((a, b) => a.name.localeCompare(b.name)));
  const ing2 = JSON.stringify(item2.customIngredients?.sort((a, b) => a.name.localeCompare(b.name)));
  
  return opts1 === opts2 && ing1 === ing2;
}