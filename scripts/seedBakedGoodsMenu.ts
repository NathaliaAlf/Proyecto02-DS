// scripts/seedBakedGoodsMenu.ts
import * as dotenv from 'dotenv';
dotenv.config();

import { initializeApp } from 'firebase/app';
import { doc, getDoc, getFirestore, setDoc, updateDoc } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// Validate config
if (!firebaseConfig.projectId || !firebaseConfig.apiKey) {
  console.error('❌ ERROR: Firebase configuration is missing!');
  process.exit(1);
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const RESTAURANT_ID = 'C6lrz994sDXZGM3durJL';

// Helper function to create sections with IDs
function createSections(sectionDTOs: any[]): any[] {
  return sectionDTOs.map(sectionDTO => ({
    id: uuidv4(),
    name: sectionDTO.name,
    required: sectionDTO.required || false,
    multiple: sectionDTO.multiple || false,
    ingredientDependent: sectionDTO.ingredientDependent || false,
    options: sectionDTO.options.map((optionDTO: any) => ({
      id: uuidv4(),
      name: optionDTO.name,
      additionalCost: optionDTO.additionalCost || 0,
      ingredients: optionDTO.ingredients || []
    }))
  }));
}

// Helper to generate plate variants
function generatePlateVariants(basePrice: number, baseIngredients: string[], sections: any[]): any[] {
  if (sections.length === 0) {
    return [{
      id: uuidv4(),
      variantKey: 'default',
      variantName: 'Standard',
      price: basePrice,
      ingredients: baseIngredients,
      active: true
    }];
  }

  // Simplified variant generation for our use case
  const variants = [];
  
  // For baked goods, we'll create variants based on size and flavor options
  sections.forEach(section => {
    if (section.name === 'Size' || section.name === 'Flavor') {
      section.options.forEach((option: any) => {
        const variantKey = `${section.id}:${option.id}`;
        const price = basePrice + (option.additionalCost || 0);
        let ingredients = [...baseIngredients];
        
        // Add flavor ingredients if ingredientDependent
        if (section.ingredientDependent && option.ingredients) {
          ingredients = [...ingredients, ...option.ingredients];
          ingredients = [...new Set(ingredients)]; // Remove duplicates
        }
        
        variants.push({
          id: uuidv4(),
          variantKey,
          variantName: option.name,
          price,
          ingredients,
          active: true
        });
      });
    }
  });

  // Add default variant
  if (variants.length === 0) {
    variants.push({
      id: uuidv4(),
      variantKey: 'default',
      variantName: 'Standard',
      price: basePrice,
      ingredients: baseIngredients,
      active: true
    });
  }

  return variants;
}

// Baked goods plates data
const bakedGoodsPlates = [
  {
    name: 'Classic Croissant',
    description: 'Flaky, buttery French croissant made with premium butter',
    basePrice: 3.99,
    baseIngredients: ['Flour', 'Butter', 'Yeast', 'Sugar', 'Salt', 'Milk'],
    imageUrl: '',
    sections: [
      {
        name: 'Size',
        required: true,
        multiple: false,
        ingredientDependent: false,
        options: [
          { name: 'Regular', additionalCost: 0 },
          { name: 'Large', additionalCost: 1.50 }
        ]
      },
      {
        name: 'Filling',
        required: false,
        multiple: false,
        ingredientDependent: true,
        options: [
          { name: 'Plain', additionalCost: 0 },
          { name: 'Chocolate', additionalCost: 1.00, ingredients: ['Chocolate'] },
          { name: 'Almond', additionalCost: 1.50, ingredients: ['Almond Paste', 'Almonds'] }
        ]
      }
    ]
  },
  {
    name: 'Artisan Sourdough Bread',
    description: 'Traditional sourdough bread with crispy crust and tangy flavor',
    basePrice: 6.99,
    baseIngredients: ['Sourdough Starter', 'Flour', 'Water', 'Salt'],
    imageUrl: '',
    sections: [
      {
        name: 'Size',
        required: true,
        multiple: false,
        ingredientDependent: false,
        options: [
          { name: 'Small (500g)', additionalCost: 0 },
          { name: 'Large (1kg)', additionalCost: 3.00 }
        ]
      },
      {
        name: 'Add-ins',
        required: false,
        multiple: true,
        ingredientDependent: true,
        options: [
          { name: 'Walnuts', additionalCost: 1.50, ingredients: ['Walnuts'] },
          { name: 'Olives', additionalCost: 1.50, ingredients: ['Olives'] },
          { name: 'Rosemary', additionalCost: 0.50, ingredients: ['Rosemary'] },
          { name: 'Sunflower Seeds', additionalCost: 1.00, ingredients: ['Sunflower Seeds'] }
        ]
      }
    ]
  },
  {
    name: 'Double Chocolate Muffin',
    description: 'Rich chocolate muffin with chocolate chips, topped with chocolate glaze',
    basePrice: 4.50,
    baseIngredients: ['Flour', 'Cocoa Powder', 'Chocolate Chips', 'Eggs', 'Butter', 'Sugar', 'Milk'],
    imageUrl: '',
    sections: [
      {
        name: 'Size',
        required: true,
        multiple: false,
        ingredientDependent: false,
        options: [
          { name: 'Regular', additionalCost: 0 },
          { name: 'Jumbo', additionalCost: 1.00 }
        ]
      },
      {
        name: 'Extra Toppings',
        required: false,
        multiple: true,
        ingredientDependent: true,
        options: [
          { name: 'Extra Chocolate Chips', additionalCost: 0.75, ingredients: ['Extra Chocolate Chips'] },
          { name: 'Cream Cheese Frosting', additionalCost: 1.50, ingredients: ['Cream Cheese', 'Powdered Sugar'] },
          { name: 'Walnut Pieces', additionalCost: 0.75, ingredients: ['Walnuts'] }
        ]
      }
    ]
  },
  {
    name: 'Cinnamon Roll',
    description: 'Soft, fluffy cinnamon roll with cream cheese icing',
    basePrice: 5.99,
    baseIngredients: ['Flour', 'Cinnamon', 'Brown Sugar', 'Butter', 'Cream Cheese', 'Powdered Sugar'],
    imageUrl: '',
    sections: [
      {
        name: 'Size',
        required: true,
        multiple: false,
        ingredientDependent: false,
        options: [
          { name: 'Regular', additionalCost: 0 },
          { name: 'Large', additionalCost: 1.50 }
        ]
      },
      {
        name: 'Icing Preference',
        required: false,
        multiple: false,
        ingredientDependent: true,
        options: [
          { name: 'Standard Cream Cheese', additionalCost: 0 },
          { name: 'Extra Icing', additionalCost: 0.75, ingredients: ['Extra Cream Cheese Icing'] },
          { name: 'No Icing', additionalCost: -1.00, ingredients: [] }
        ]
      },
      {
        name: 'Add-ins',
        required: false,
        multiple: true,
        ingredientDependent: true,
        options: [
          { name: 'Raisins', additionalCost: 0.75, ingredients: ['Raisins'] },
          { name: 'Walnuts', additionalCost: 1.00, ingredients: ['Walnuts'] },
          { name: 'Apple Pieces', additionalCost: 1.00, ingredients: ['Apple', 'Cinnamon'] }
        ]
      }
    ]
  },
  {
    name: 'Bagel with Spread',
    description: 'Freshly baked bagel with your choice of spread',
    basePrice: 4.25,
    baseIngredients: ['Bagel'],
    imageUrl: '',
    sections: [
      {
        name: 'Bagel Type',
        required: true,
        multiple: false,
        ingredientDependent: true,
        options: [
          { name: 'Plain', additionalCost: 0 },
          { name: 'Everything', additionalCost: 0.50, ingredients: ['Sesame Seeds', 'Poppy Seeds', 'Garlic', 'Onion'] },
          { name: 'Cinnamon Raisin', additionalCost: 0.75, ingredients: ['Cinnamon', 'Raisins'] },
          { name: 'Whole Wheat', additionalCost: 0.50, ingredients: ['Whole Wheat Flour'] }
        ]
      },
      {
        name: 'Spread',
        required: true,
        multiple: false,
        ingredientDependent: true,
        options: [
          { name: 'Cream Cheese', additionalCost: 0, ingredients: ['Cream Cheese'] },
          { name: 'Butter', additionalCost: 0, ingredients: ['Butter'] },
          { name: 'Peanut Butter', additionalCost: 0.50, ingredients: ['Peanut Butter'] },
          { name: 'Avocado', additionalCost: 1.50, ingredients: ['Avocado', 'Lemon Juice', 'Salt'] },
          { name: 'Hummus', additionalCost: 1.00, ingredients: ['Chickpeas', 'Tahini', 'Lemon'] }
        ]
      },
      {
        name: 'Extras',
        required: false,
        multiple: true,
        ingredientDependent: true,
        options: [
          { name: 'Smoked Salmon', additionalCost: 3.50, ingredients: ['Smoked Salmon'] },
          { name: 'Tomato Slices', additionalCost: 0.75, ingredients: ['Tomato'] },
          { name: 'Cucumber Slices', additionalCost: 0.75, ingredients: ['Cucumber'] },
          { name: 'Red Onion', additionalCost: 0.50, ingredients: ['Red Onion'] },
          { name: 'Capers', additionalCost: 0.50, ingredients: ['Capers'] }
        ]
      }
    ]
  },
  {
    name: 'Fruit Danish',
    description: 'Flaky pastry filled with fruit compote and topped with glaze',
    basePrice: 4.75,
    baseIngredients: ['Puff Pastry', 'Fruit Filling', 'Glaze'],
    imageUrl: '',
    sections: [
      {
        name: 'Fruit Filling',
        required: true,
        multiple: false,
        ingredientDependent: true,
        options: [
          { name: 'Apple Cinnamon', additionalCost: 0, ingredients: ['Apple', 'Cinnamon'] },
          { name: 'Cherry', additionalCost: 0, ingredients: ['Cherries'] },
          { name: 'Blueberry', additionalCost: 0, ingredients: ['Blueberries'] },
          { name: 'Raspberry', additionalCost: 0.50, ingredients: ['Raspberries'] },
          { name: 'Mixed Berry', additionalCost: 0.75, ingredients: ['Blueberries', 'Raspberries', 'Strawberries'] }
        ]
      },
      {
        name: 'Topping',
        required: false,
        multiple: false,
        ingredientDependent: true,
        options: [
          { name: 'Standard Glaze', additionalCost: 0 },
          { name: 'Almond Streusel', additionalCost: 1.00, ingredients: ['Almonds', 'Brown Sugar', 'Butter'] },
          { name: 'Cream Cheese Dollop', additionalCost: 1.25, ingredients: ['Cream Cheese'] }
        ]
      }
    ]
  }
];

async function seedBakedGoodsMenu() {
  console.log('🎯 Starting to seed baked goods menu...');
  console.log(`📋 Restaurant ID: ${RESTAURANT_ID}`);
  
  try {
    // Check if restaurant exists
    const restaurantRef = doc(db, 'restaurants', RESTAURANT_ID);
    const restaurantSnap = await getDoc(restaurantRef);
    
    if (!restaurantSnap.exists()) {
      console.error('❌ Restaurant not found!');
      return;
    }
    
    const restaurantData = restaurantSnap.data();
    console.log(`✅ Restaurant found: ${restaurantData.restaurantName}`);
    console.log(`📊 Restaurant categories: ${restaurantData.categories?.join(', ') || 'None'}`);
    
    // Create the menu data
    const now = new Date().toISOString();
    const menuId = uuidv4();
    
    const plates = bakedGoodsPlates.map(plateDTO => {
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
    });
    
    const menuData = {
      id: menuId,
      restaurantId: RESTAURANT_ID,
      name: 'Baked Goods Menu',
      description: 'Freshly baked pastries, breads, and desserts made daily',
      active: true,
      plates,
      createdAt: now,
      updatedAt: now
    };
    
    console.log('\n📝 Creating menu with plates:');
    plates.forEach((plate, index) => {
      console.log(`     Sections: ${plate.sections.map(s => s.name).join(', ')}`);
      console.log(`     Variants: ${plate.variants.length} options available`);
    });
    
    // Create the menu document
    const menuRef = doc(db, 'menus', menuId);
    await setDoc(menuRef, menuData);
    
    console.log('\n✅ Successfully created baked goods menu!');
    console.log(`📁 Menu ID: ${menuId}`);
    console.log(`🍽️  Total plates: ${plates.length}`);
    
    await updateDoc(restaurantRef,{
        lastUpdated: now,
        menuID: menuId
    });
    console.log(`🏪 Updated restaurant with menu reference`);
    
    console.log('\n🎉 Seeding complete!');
    console.log('\n📋 Sample API calls to use this menu:');
    console.log(`1. Get menu: menuApi.getMenu("${menuId}")`);
    console.log(`2. Get active menu for restaurant: menuApi.getActiveMenu("${RESTAURANT_ID}")`);
    console.log(`3. Get plates by category: menuApi.getPlatesByCategory("${menuId}", "Pastries")`);
    
  } catch (error: any) {
    console.error('❌ Error seeding baked goods menu:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the script
seedBakedGoodsMenu();