// types/menu.ts

// Ingredient with obligatory flag
export interface Ingredient {
  name: string;
  obligatory: boolean; // If true, cannot be removed by customer
}

export interface MenuSectionOption {
  id: string;
  name: string;
  additionalCost?: number; // Extra cost for this option
  ingredients?: Ingredient[]; // Ingredients to add/remove if ingredientDependent is true
}

export interface MenuSection {
  id: string;
  name: string;
  required: boolean; // Whether customer must select an option
  multiple: boolean; // Whether customer can select multiple options
  ingredientDependent: boolean; // Whether options affect ingredients
  options: MenuSectionOption[];
}

export interface PlateVariant {
  id: string;
  variantKey: string; 
  variantName: string;
  price: number; // Base price + additional costs from selected options
  ingredients: Ingredient[]; // Final ingredients list for this variant
  active: boolean; // Whether this variant is available
}

export interface Plate {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  baseIngredients: Ingredient[]; // Base ingredients with obligatory flags
  imageUrl: string;
  active: boolean;
  sections: MenuSection[];
  variants: PlateVariant[]; // Pre-calculated variants based on sections
  createdAt: string;
  updatedAt: string;
}

export interface PlateForCreation {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  baseIngredients: Ingredient[];
  imageUrl: string;
  active: boolean;
  sections: MenuSectionCreateDTO[]; // DTOs without IDs
  variants: PlateVariant[];
  createdAt: string;
  updatedAt: string;
}

export interface Menu {
  id: string;
  restaurantId: string;
  name: string; 
  description?: string;
  active: boolean;
  plates: Plate[];
  createdAt: string;
  updatedAt: string;
}

// DTOs for creating/updating
export interface MenuSectionOptionCreateDTO {
  name: string;
  additionalCost?: number;
  ingredients?: Ingredient[];
}

export interface MenuSectionCreateDTO {
  name: string;
  required?: boolean;
  multiple?: boolean;
  ingredientDependent?: boolean;
  options: MenuSectionOptionCreateDTO[];
}

export interface PlateCreateDTO {
  name: string;
  description: string;
  basePrice: number;
  baseIngredients: Ingredient[];
  imageUrl: string;
  sections: MenuSectionCreateDTO[];
}

export interface MenuCreateDTO {
  restaurantId: string;
  name: string;
  description?: string;
  plates?: PlateCreateDTO[];
}

export interface MenuUpdateDTO {
  name?: string;
  description?: string;
  active?: boolean;
}

export interface PlateUpdateDTO {
  name?: string;
  description?: string;
  basePrice?: number;
  baseIngredients?: Ingredient[];
  imageUrl?: string;
  active?: boolean;
  sections?: MenuSectionCreateDTO[];
}

// For order customization
export interface SelectedOption {
  sectionId: string;
  optionId: string;
  optionName: string;
  additionalCost: number;
}

export interface CustomizedPlate {
  plateId: string;
  plateName: string;
  basePrice: number;
  selectedOptions: SelectedOption[];
  finalPrice: number;
  variantId?: string; // If matching a pre-calculated variant
  customIngredients?: Ingredient[]; // If no matching variant
}

export interface MenuSectionWithIds extends Omit<MenuSectionCreateDTO, 'options'> {
  id: string;
  options: MenuSectionOption[];
}

// Helper function to normalize ingredients from old format to new format
export function normalizeIngredients(ingredients: any[]): Ingredient[] {
  return ingredients.map(ing => {
    // If it's already in the new format
    if (typeof ing === 'object' && 'name' in ing && 'obligatory' in ing) {
      return ing as Ingredient;
    }
    // If it's a string (old format)
    if (typeof ing === 'string') {
      return { name: ing, obligatory: false };
    }
    // If it's the nested format from your example
    if (typeof ing === 'object' && 'ingridients' in ing && 'obligatory' in ing) {
      // Extract the array of ingredient names and apply the obligatory flag
      const ingredientNames = ing.ingridients || [];
      return ingredientNames.map((name: string) => ({
        name,
        obligatory: ing.obligatory
      }));
    }
    // Default fallback
    return { name: String(ing), obligatory: false };
  }).flat(); // Flatten in case nested format created arrays
}
