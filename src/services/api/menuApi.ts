// api/menuApi.ts
import { db } from '@/config/firebase';
import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    limit,
    orderBy,
    query,
    updateDoc,
    where
} from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';

import {
    CustomizedPlate,
    Menu,
    MenuCreateDTO,
    MenuSection,
    MenuSectionCreateDTO,
    MenuUpdateDTO,
    Plate,
    PlateCreateDTO,
    PlateUpdateDTO,
    PlateVariant,
    SelectedOption
} from '@/types/menu';

// Helper function to generate plate variants
function generatePlateVariants(
  basePrice: number,
  baseIngredients: string[],
  sections: MenuSection[]
): PlateVariant[] {
  if (sections.length === 0) {
    // No sections, just one variant
    return [{
      id: uuidv4(),
      variantKey: 'default',
      variantName: 'Standard',
      price: basePrice,
      ingredients: baseIngredients,
      active: true
    }];
  }

  // Filter sections that have options
  const validSections = sections.filter(section => section.options.length > 0);
  
  if (validSections.length === 0) {
    return [{
      id: uuidv4(),
      variantKey: 'default',
      variantName: 'Standard',
      price: basePrice,
      ingredients: baseIngredients,
      active: true
    }];
  }

  // Generate all possible combinations
  const generateCombinations = (
    sections: MenuSection[],
    index: number = 0,
    currentCombo: { sectionId: string; optionId: string }[] = []
  ): { sectionId: string; optionId: string }[][] => {
    if (index === sections.length) {
      return [currentCombo];
    }

    const section = sections[index];
    const combinations: { sectionId: string; optionId: string }[][] = [];

    if (section.multiple) {
      // For multiple selections, generate combinations of selected options
      // This is more complex - for simplicity, we'll treat each option as separate
      section.options.forEach(option => {
        const newCombo = [...currentCombo, { sectionId: section.id, optionId: option.id }];
        combinations.push(...generateCombinations(sections, index + 1, newCombo));
      });
      // Also include option of not selecting any from this multiple section
      combinations.push(...generateCombinations(sections, index + 1, currentCombo));
    } else {
      // Single selection - each option creates a new path
      if (section.required) {
        section.options.forEach(option => {
          const newCombo = [...currentCombo, { sectionId: section.id, optionId: option.id }];
          combinations.push(...generateCombinations(sections, index + 1, newCombo));
        });
      } else {
        // Not required - include "no selection" option
        const skipCombo = [...currentCombo]; // Don't add anything for this section
        combinations.push(...generateCombinations(sections, index + 1, skipCombo));
        
        section.options.forEach(option => {
          const newCombo = [...currentCombo, { sectionId: section.id, optionId: option.id }];
          combinations.push(...generateCombinations(sections, index + 1, newCombo));
        });
      }
    }

    return combinations;
  };

  const allCombinations = generateCombinations(validSections);
  
  // Generate variants from combinations
  const variants: PlateVariant[] = allCombinations.map(combination => {
    if (combination.length === 0) {
      return {
        id: uuidv4(),
        variantKey: 'default',
        variantName: 'Standard',
        price: basePrice,
        ingredients: baseIngredients,
        active: true
      };
    }

    const variantParts: string[] = [];
    const variantNameParts: string[] = [];
    let totalPrice = basePrice;
    let ingredients = [...baseIngredients];

    combination.forEach(({ sectionId, optionId }) => {
      const section = validSections.find(s => s.id === sectionId);
      const option = section?.options.find(o => o.id === optionId);
      
      if (section && option) {
        variantParts.push(`${sectionId}:${optionId}`);
        variantNameParts.push(option.name);
        
        // Add additional cost
        if (option.additionalCost) {
          totalPrice += option.additionalCost;
        }
        
        // Modify ingredients if ingredientDependent
        if (section.ingredientDependent && option.ingredients) {
          // For simplicity, we'll replace ingredients for this section
          // You might want more complex logic here
          ingredients = [...ingredients, ...option.ingredients];
        }
      }
    });

    const variantKey = variantParts.sort().join('|');
    const variantName = variantNameParts.join(', ');

    return {
      id: uuidv4(),
      variantKey,
      variantName: variantName || 'Standard',
      price: totalPrice,
      ingredients: [...new Set(ingredients)], // Remove duplicates
      active: true
    };
  });

  // Remove duplicates (same variantKey)
  const uniqueVariants = variants.reduce((acc, variant) => {
    if (!acc.some(v => v.variantKey === variant.variantKey)) {
      acc.push(variant);
    }
    return acc;
  }, [] as PlateVariant[]);

  return uniqueVariants;
}

// Helper to create sections with IDs
function createSections(sectionDTOs: MenuSectionCreateDTO[]): MenuSection[] {
  return sectionDTOs.map(sectionDTO => ({
    id: uuidv4(),
    name: sectionDTO.name,
    required: sectionDTO.required || false,
    multiple: sectionDTO.multiple || false,
    ingredientDependent: sectionDTO.ingredientDependent || false,
    options: sectionDTO.options.map(optionDTO => ({
      id: uuidv4(),
      name: optionDTO.name,
      additionalCost: optionDTO.additionalCost || 0,
      ingredients: optionDTO.ingredients || []
    }))
  }));
}

export const menuApi = {
  // ========== MENU CRUD ==========
  
  // Get menu by ID
  async getMenu(menuId: string): Promise<{ success: boolean; data?: Menu; error?: string }> {
    try {
      const menuRef = doc(db, 'menus', menuId);
      const menuSnap = await getDoc(menuRef);
      
      if (menuSnap.exists()) {
        const menuData = menuSnap.data();
        const menu: Menu = {
          id: menuSnap.id,
          restaurantId: menuData.restaurantId,
          name: menuData.name,
          description: menuData.description,
          active: menuData.active,
          plates: menuData.plates || [],
          createdAt: menuData.createdAt,
          updatedAt: menuData.updatedAt
        };
        
        return { success: true, data: menu };
      } else {
        return { success: false, error: 'Menu not found' };
      }
    } catch (error) {
      console.error('Error getting menu:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get menu' 
      };
    }
  },

  // Get menus by restaurant ID
  async getMenusByRestaurant(restaurantId: string): Promise<{ success: boolean; data?: Menu[]; error?: string }> {
    try {
      const menusRef = collection(db, 'menus');
      const q = query(
        menusRef,
        where('restaurantId', '==', restaurantId),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const menus: Menu[] = [];
      
      querySnapshot.forEach((docSnap) => {
        const menuData = docSnap.data();
        menus.push({
          id: docSnap.id,
          restaurantId: menuData.restaurantId,
          name: menuData.name,
          description: menuData.description,
          active: menuData.active,
          plates: menuData.plates || [],
          createdAt: menuData.createdAt,
          updatedAt: menuData.updatedAt
        });
      });
      
      return { success: true, data: menus };
    } catch (error) {
      console.error('Error getting menus by restaurant:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get menus' 
      };
    }
  },

  // Get active menu for restaurant
  async getActiveMenu(restaurantId: string): Promise<{ success: boolean; data?: Menu; error?: string }> {
    try {
      const menusRef = collection(db, 'menus');
      const q = query(
        menusRef,
        where('restaurantId', '==', restaurantId),
        where('active', '==', true),
        orderBy('updatedAt', 'desc'),
        limit(1)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const docSnap = querySnapshot.docs[0];
        const menuData = docSnap.data();
        const menu: Menu = {
          id: docSnap.id,
          restaurantId: menuData.restaurantId,
          name: menuData.name,
          description: menuData.description,
          active: menuData.active,
          plates: menuData.plates || [],
          createdAt: menuData.createdAt,
          updatedAt: menuData.updatedAt
        };
        
        return { success: true, data: menu };
      } else {
        return { success: false, error: 'No active menu found' };
      }
    } catch (error) {
      console.error('Error getting active menu:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get active menu' 
      };
    }
  },

  // Create menu
  async createMenu(menuData: MenuCreateDTO): Promise<{ success: boolean; data?: Menu; error?: string }> {
    try {
      // Check if restaurant exists
      const restaurantRef = doc(db, 'restaurants', menuData.restaurantId);
      const restaurantSnap = await getDoc(restaurantRef);
      
      if (!restaurantSnap.exists()) {
        return { success: false, error: 'Restaurant not found' };
      }
      
      const menusRef = collection(db, 'menus');
      const now = new Date().toISOString();
      
      // Process plates if provided
      const plates: Plate[] = menuData.plates?.map(plateDTO => {
        const sections = createSections(plateDTO.sections);
        const variants = generatePlateVariants(
          plateDTO.basePrice,
          plateDTO.baseIngredients,
          sections
        );
        
        return {
          id: uuidv4(),
          name: plateDTO.name,
          description: plateDTO.description,
          basePrice: plateDTO.basePrice,
          baseIngredients: plateDTO.baseIngredients,
          imageUrl: plateDTO.imageUrl,
          active: true,
          sections,
          variants,
          createdAt: now,
          updatedAt: now
        };
      }) || [];
      
      const newMenu = {
        restaurantId: menuData.restaurantId,
        name: menuData.name,
        description: menuData.description || '',
        active: true, // New menu is active by default
        plates,
        createdAt: now,
        updatedAt: now
      };
      
      const docRef = await addDoc(menusRef, newMenu);
      
      const createdMenu: Menu = {
        id: docRef.id,
        ...newMenu
      };
      
      return { success: true, data: createdMenu };
    } catch (error) {
      console.error('Error creating menu:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create menu' 
      };
    }
  },

  // Update menu
  async updateMenu(menuId: string, updateData: MenuUpdateDTO): Promise<{ success: boolean; data?: Menu; error?: string }> {
    try {
      const menuRef = doc(db, 'menus', menuId);
      
      // Check if menu exists
      const menuSnap = await getDoc(menuRef);
      if (!menuSnap.exists()) {
        return { success: false, error: 'Menu not found' };
      }
      
      // If setting a menu as active, deactivate other menus for this restaurant
      if (updateData.active === true) {
        const menuData = menuSnap.data();
        const menusRef = collection(db, 'menus');
        const q = query(
          menusRef,
          where('restaurantId', '==', menuData.restaurantId),
          where('active', '==', true)
        );
        
        const activeMenus = await getDocs(q);
        const updatePromises: Promise<void>[] = [];
        
        activeMenus.forEach((docSnap) => {
          if (docSnap.id !== menuId) {
            updatePromises.push(updateDoc(doc(db, 'menus', docSnap.id), {
              active: false,
              updatedAt: new Date().toISOString()
            }));
          }
        });
        
        await Promise.all(updatePromises);
      }
      
      const updatePayload = {
        ...updateData,
        updatedAt: new Date().toISOString()
      };
      
      await updateDoc(menuRef, updatePayload);
      
      // Get updated menu
      const updatedSnap = await getDoc(menuRef);
      const updatedData = updatedSnap.data();
      
      const updatedMenu: Menu = {
        id: updatedSnap.id,
        restaurantId: updatedData!.restaurantId,
        name: updatedData!.name,
        description: updatedData!.description,
        active: updatedData!.active,
        plates: updatedData!.plates || [],
        createdAt: updatedData!.createdAt,
        updatedAt: updatedData!.updatedAt
      };
      
      return { success: true, data: updatedMenu };
    } catch (error) {
      console.error('Error updating menu:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update menu' 
      };
    }
  },

  // Delete menu
  async deleteMenu(menuId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const menuRef = doc(db, 'menus', menuId);
      await deleteDoc(menuRef);
      return { success: true };
    } catch (error) {
      console.error('Error deleting menu:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to delete menu' 
      };
    }
  },

  // ========== PLATE CRUD ==========
  
  // Add plate to menu
  async addPlateToMenu(menuId: string, plateData: PlateCreateDTO): Promise<{ success: boolean; data?: Plate; error?: string }> {
    try {
      const menuRef = doc(db, 'menus', menuId);
      const menuSnap = await getDoc(menuRef);
      
      if (!menuSnap.exists()) {
        return { success: false, error: 'Menu not found' };
      }
      
      const menuData = menuSnap.data();
      const now = new Date().toISOString();
      
      // Create sections and generate variants
      const sections = createSections(plateData.sections);
      const variants = generatePlateVariants(
        plateData.basePrice,
        plateData.baseIngredients,
        sections
      );
      
      const newPlate: Plate = {
        id: uuidv4(),
        name: plateData.name,
        description: plateData.description,
        basePrice: plateData.basePrice,
        baseIngredients: plateData.baseIngredients,
        imageUrl: plateData.imageUrl,
        active: true,
        sections,
        variants,
        createdAt: now,
        updatedAt: now
      };
      
      // Update menu with new plate
      const updatedPlates = [...(menuData.plates || []), newPlate];
      
      await updateDoc(menuRef, {
        plates: updatedPlates,
        updatedAt: now
      });
      
      return { success: true, data: newPlate };
    } catch (error) {
      console.error('Error adding plate to menu:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to add plate to menu' 
      };
    }
  },

  
  // Update plate in menu
    async updatePlateInMenu(menuId: string, plateId: string, updateData: PlateUpdateDTO): Promise<{ success: boolean; data?: Plate; error?: string }> {
    try {
        const menuRef = doc(db, 'menus', menuId);
        const menuSnap = await getDoc(menuRef);
        
        if (!menuSnap.exists()) {
        return { success: false, error: 'Menu not found' };
        }
        
        const menuData = menuSnap.data();
        const plates: Plate[] = menuData.plates || [];
        const plateIndex = plates.findIndex(plate => plate.id === plateId);
        
        if (plateIndex === -1) {
        return { success: false, error: 'Plate not found in menu' };
        }
        
        const plate = plates[plateIndex];
        const now = new Date().toISOString();
        
        // Handle section updates
        let sections = plate.sections;
        let variants = plate.variants;
        
        if (updateData.sections) {
        // Convert DTOs to MenuSection with IDs
        sections = createSections(updateData.sections);
        
        // Regenerate variants with new sections
        variants = generatePlateVariants(
            updateData.basePrice || plate.basePrice,
            updateData.baseIngredients || plate.baseIngredients,
            sections
        );
        }
        
        // Build updated plate
        const updatedPlate: Plate = {
        ...plate,
        ...updateData,
        sections, // Now definitely MenuSection[]
        variants, // Updated variants
        updatedAt: now
        };
        
        // Update plates array
        plates[plateIndex] = updatedPlate;
        
        await updateDoc(menuRef, {
        plates,
        updatedAt: now
        });
        
        return { success: true, data: updatedPlate };
    } catch (error) {
        console.error('Error updating plate in menu:', error);
        return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update plate' 
        };
    }
    },

  // Delete plate from menu
  async deletePlateFromMenu(menuId: string, plateId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const menuRef = doc(db, 'menus', menuId);
      const menuSnap = await getDoc(menuRef);
      
      if (!menuSnap.exists()) {
        return { success: false, error: 'Menu not found' };
      }
      
      const menuData = menuSnap.data();
      const plates: Plate[] = menuData.plates || [];
      const plateIndex = plates.findIndex(plate => plate.id === plateId);
      
      if (plateIndex === -1) {
        return { success: false, error: 'Plate not found in menu' };
      }
      
      // Remove plate
      plates.splice(plateIndex, 1);
      
      // Update menu
      const now = new Date().toISOString();
      await updateDoc(menuRef, {
        plates,
        updatedAt: now
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error deleting plate from menu:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to delete plate' 
      };
    }
  },

  // Get plate by ID
  async getPlate(menuId: string, plateId: string): Promise<{ success: boolean; data?: Plate; error?: string }> {
    try {
      const menuRef = doc(db, 'menus', menuId);
      const menuSnap = await getDoc(menuRef);
      
      if (!menuSnap.exists()) {
        return { success: false, error: 'Menu not found' };
      }
      
      const menuData = menuSnap.data();
      const plates: Plate[] = menuData.plates || [];
      const plate = plates.find(p => p.id === plateId);
      
      if (!plate) {
        return { success: false, error: 'Plate not found' };
      }
      
      return { success: true, data: plate };
    } catch (error) {
      console.error('Error getting plate:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get plate' 
      };
    }
  },

  // ========== UTILITY FUNCTIONS ==========
  
  // Calculate price for customized plate
  async calculateCustomizedPlate(
    menuId: string,
    plateId: string,
    selectedOptions: { sectionId: string; optionId: string }[]
  ): Promise<{ success: boolean; data?: CustomizedPlate; error?: string }> {
    try {
      const plateResult = await this.getPlate(menuId, plateId);
      if (!plateResult.success || !plateResult.data) {
        return { success: false, error: plateResult.error };
      }
      
      const plate = plateResult.data;
      let finalPrice = plate.basePrice;
      const selectedOptionDetails: SelectedOption[] = [];
      
      // Calculate price and gather option details
      selectedOptions.forEach(({ sectionId, optionId }) => {
        const section = plate.sections.find(s => s.id === sectionId);
        const option = section?.options.find(o => o.id === optionId);
        
        if (section && option) {
          finalPrice += option.additionalCost || 0;
          selectedOptionDetails.push({
            sectionId,
            optionId,
            optionName: option.name,
            additionalCost: option.additionalCost || 0
          });
        }
      });
      
      // Try to find matching variant
      const variantKey = selectedOptions
        .map(({ sectionId, optionId }) => `${sectionId}:${optionId}`)
        .sort()
        .join('|');
      
      const matchingVariant = plate.variants.find(v => v.variantKey === variantKey);
      
      // Calculate custom ingredients if no matching variant
      let customIngredients: string[] = [];
      if (!matchingVariant) {
        customIngredients = [...plate.baseIngredients];
        
        // Add ingredients from ingredient-dependent sections
        selectedOptions.forEach(({ sectionId, optionId }) => {
          const section = plate.sections.find(s => s.id === sectionId);
          const option = section?.options.find(o => o.id === optionId);
          
          if (section?.ingredientDependent && option?.ingredients) {
            customIngredients.push(...option.ingredients);
          }
        });
        
        customIngredients = [...new Set(customIngredients)]; // Remove duplicates
      }
      
      const customizedPlate: CustomizedPlate = {
        plateId,
        plateName: plate.name,
        basePrice: plate.basePrice,
        selectedOptions: selectedOptionDetails,
        finalPrice,
        variantId: matchingVariant?.id,
        customIngredients: matchingVariant ? undefined : customIngredients
      };
      
      return { success: true, data: customizedPlate };
    } catch (error) {
      console.error('Error calculating customized plate:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to calculate customized plate' 
      };
    }
  },

  // Generate menu preview with all variants
    async generateMenuPreview(menuId: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
        const menuResult = await this.getMenu(menuId);
        if (!menuResult.success || !menuResult.data) {
        return { success: false, error: menuResult.error };
        }
        
        const menu = menuResult.data;
        const preview = {
        menuId: menu.id,
        menuName: menu.name,
        description: menu.description,
        restaurantId: menu.restaurantId,
        plates: menu.plates.map(plate => ({
            id: plate.id,
            name: plate.name,
            description: plate.description,
            basePrice: plate.basePrice,
            imageUrl: plate.imageUrl,
            active: plate.active,
            sections: plate.sections.map(section => ({
            id: section.id,
            name: section.name,
            required: section.required,
            multiple: section.multiple,
            ingredientDependent: section.ingredientDependent,
            options: section.options.map(option => ({
                id: option.id,
                name: option.name,
                additionalCost: option.additionalCost,
                ingredients: option.ingredients || []
            }))
            })),
            variants: plate.variants.map(variant => ({
            id: variant.id,
            variantKey: variant.variantKey,
            variantName: variant.variantName,
            price: variant.price,
            ingredients: variant.ingredients,
            active: variant.active
            })),
            baseIngredients: plate.baseIngredients,
            createdAt: plate.createdAt,
            updatedAt: plate.updatedAt
        }))
        };
        
        return { success: true, data: preview };
    } catch (error) {
        console.error('Error generating menu preview:', error);
        return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to generate menu preview' 
        };
    }
    }
};