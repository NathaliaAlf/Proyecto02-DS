import * as dotenv from 'dotenv';
dotenv.config(); 

import { initializeApp } from 'firebase/app';
import { doc, getFirestore, setDoc, Timestamp } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';

// Your Firebase configuration
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

console.log('Environment check:');
console.log('Project ID loaded:', process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ? 'Yes' : 'No');
console.log('API Key loaded:', process.env.EXPO_PUBLIC_FIREBASE_API_KEY ? 'Yes' : 'No');

if (!firebaseConfig.projectId || !firebaseConfig.apiKey) {
  console.error('ERROR: Firebase configuration is missing!');
  console.error('Make sure your .env file has:');
  console.error('EXPO_PUBLIC_FIREBASE_API_KEY');
  console.error('EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN');
  console.error('EXPO_PUBLIC_FIREBASE_PROJECT_ID');
  console.error('EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET');
  console.error('EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID');
  console.error('EXPO_PUBLIC_FIREBASE_APP_ID');
  process.exit(1);
}


// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Categories from your app
const categories = [
  { id: '1', name: 'Italian' },
  { id: '2', name: 'Asian' },
  { id: '3', name: 'Fast Food' },
  { id: '4', name: 'Baked-Goods' },
  { id: '5', name: 'Snacks' },
  { id: '6', name: 'Salads' },
  { id: '7', name: 'Soups' },
  { id: '8', name: 'Drinks' },
];

// 100+ ingredients list
const ingredients = [
  // Vegetables
  'Tomatoes', 'Onions', 'Garlic', 'Potatoes', 'Carrots', 'Bell Peppers', 'Spinach', 'Lettuce',
  'Cucumbers', 'Mushrooms', 'Broccoli', 'Cauliflower', 'Zucchini', 'Eggplant', 'Asparagus',
  'Green Beans', 'Peas', 'Corn', 'Celery', 'Radishes', 'Beets', 'Artichokes', 'Brussels Sprouts',
  'Kale', 'Arugula', 'Cabbage', 'Bok Choy', 'Leeks', 'Scallions', 'Shallots',
  
  // Fruits
  'Apples', 'Bananas', 'Oranges', 'Lemons', 'Limes', 'Strawberries', 'Blueberries', 'Raspberries',
  'Blackberries', 'Mangoes', 'Pineapple', 'Peaches', 'Plums', 'Pears', 'Grapes', 'Watermelon',
  'Cantaloupe', 'Honeydew', 'Kiwi', 'Papaya', 'Coconut', 'Pomegranate', 'Figs', 'Dates',
  
  // Proteins
  'Chicken Breast', 'Chicken Thighs', 'Beef Steak', 'Ground Beef', 'Pork Chops', 'Bacon',
  'Sausage', 'Salmon', 'Tuna', 'Shrimp', 'Cod', 'Tilapia', 'Crab', 'Lobster', 'Scallops',
  'Eggs', 'Tofu', 'Tempeh', 'Seitan', 'Chickpeas', 'Lentils', 'Black Beans', 'Kidney Beans',
  'Pinto Beans', 'White Beans', 'Edamame',
  
  // Dairy & Alternatives
  'Milk', 'Cream', 'Butter', 'Cheese', 'Cheddar', 'Mozzarella', 'Parmesan', 'Feta', 'Ricotta',
  'Yogurt', 'Sour Cream', 'Buttermilk', 'Heavy Cream', 'Cream Cheese', 'Goat Cheese',
  'Almond Milk', 'Soy Milk', 'Oat Milk', 'Coconut Milk',
  
  // Grains & Starches
  'Rice', 'Brown Rice', 'Basmati Rice', 'Quinoa', 'Pasta', 'Spaghetti', 'Penne', 'Fusilli',
  'Bread', 'Whole Wheat Bread', 'Baguette', 'Tortillas', 'Flour', 'Cornmeal', 'Oats',
  'Couscous', 'Bulgur', 'Barley', 'Farro', 'Potato Starch', 'Corn Starch',
  
  // Herbs & Spices
  'Basil', 'Oregano', 'Thyme', 'Rosemary', 'Parsley', 'Cilantro', 'Dill', 'Mint', 'Chives',
  'Bay Leaves', 'Sage', 'Tarragon', 'Paprika', 'Cumin', 'Coriander', 'Turmeric', 'Ginger',
  'Cinnamon', 'Nutmeg', 'Cloves', 'Cardamom', 'Chili Powder', 'Cayenne Pepper', 'Black Pepper',
  'White Pepper', 'Red Pepper Flakes', 'Mustard Seeds', 'Fennel Seeds', 'Caraway Seeds',
  
  // Oils & Condiments
  'Olive Oil', 'Vegetable Oil', 'Canola Oil', 'Coconut Oil', 'Sesame Oil', 'Vinegar',
  'Balsamic Vinegar', 'Apple Cider Vinegar', 'Soy Sauce', 'Fish Sauce', 'Worcestershire Sauce',
  'Hot Sauce', 'Ketchup', 'Mustard', 'Mayonnaise', 'Honey', 'Maple Syrup', 'Molasses',
  
  // Nuts & Seeds
  'Almonds', 'Walnuts', 'Pecans', 'Cashews', 'Peanuts', 'Pistachios', 'Hazelnuts',
  'Pine Nuts', 'Sunflower Seeds', 'Pumpkin Seeds', 'Sesame Seeds', 'Chia Seeds', 'Flax Seeds',
  
  // Other
  'Chocolate', 'Cocoa Powder', 'Vanilla Extract', 'Baking Powder', 'Baking Soda', 'Yeast',
  'Gelatin', 'Agar Agar', 'Nutritional Yeast', 'Miso Paste', 'Tahini', 'Peanut Butter',
  'Almond Butter', 'Jam', 'Marmalade', 'Pickles', 'Olives', 'Capers', 'Anchovies', 'Sardines',
];

// Restaurant name generators
const restaurantNameTemplates = [
  'The {adjective} {noun}',
  '{name}\'s {cuisine} Kitchen',
  '{cuisine} {noun}',
  'Casa de {name}',
  '{adjective} {cuisine}',
  'The {noun} Table',
  '{name} {cuisine}',
  '{cuisine} Express',
  '{adjective} Spoon',
  'The {cuisine} Pot',
];

const adjectives = ['Golden', 'Red', 'Blue', 'Green', 'Spicy', 'Sweet', 'Savory', 'Crispy', 
                   'Fresh', 'Happy', 'Lucky', 'Royal', 'Urban', 'Rustic', 'Modern', 'Classic',
                   'Family', 'Sunny', 'Cozy', 'Elegant', 'Charming', 'Quaint', 'Bustling'];

const nouns = ['Table', 'Kitchen', 'House', 'Cafe', 'Bistro', 'Grill', 'Diner', 'Place',
               'Spot', 'Joint', 'Corner', 'Room', 'Garden', 'Patio', 'Oven', 'Pan', 'Plate',
               'Fork', 'Knife', 'Spoon', 'Bowl', 'Cup', 'Mug', 'Pot'];

const cuisineNames = ['Italian', 'Asian', 'Mexican', 'American', 'Mediterranean', 'Japanese',
                      'Indian', 'Thai', 'French', 'Spanish', 'Greek', 'Vietnamese', 'Korean',
                      'Chinese', 'Lebanese', 'Turkish', 'Brazilian', 'Peruvian', 'Moroccan'];

const firstNames = ['Alex', 'Maria', 'James', 'Sarah', 'David', 'Emma', 'Michael', 'Olivia',
                    'Daniel', 'Sophia', 'Matthew', 'Isabella', 'Christopher', 'Mia', 'Andrew',
                    'Charlotte', 'Ethan', 'Amelia', 'Joshua', 'Harper', 'Ryan', 'Evelyn'];

const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
                   'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
                   'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson'];

// Generate random restaurant name
function generateRestaurantName(categoryName: string): string {
  const template = restaurantNameTemplates[Math.floor(Math.random() * restaurantNameTemplates.length)];
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const name = firstNames[Math.floor(Math.random() * firstNames.length)];
  const cuisine = cuisineNames[Math.floor(Math.random() * cuisineNames.length)];
  
  return template
    .replace('{adjective}', adjective)
    .replace('{noun}', noun)
    .replace('{name}', name)
    .replace('{cuisine}', categoryName || cuisine);
}

// Generate random ingredients list (10-15 ingredients per restaurant)
function generateIngredients(): string[] {
  const numIngredients = Math.floor(Math.random() * 6) + 10; // 10-15 ingredients
  const selectedIngredients: string[] = [];
  
  while (selectedIngredients.length < numIngredients) {
    const ingredient = ingredients[Math.floor(Math.random() * ingredients.length)];
    if (!selectedIngredients.includes(ingredient)) {
      selectedIngredients.push(ingredient);
    }
  }
  
  return selectedIngredients;
}

// Generate random categories (1-3 categories per restaurant)
function generateCategories(): string[] {
  const numCategories = Math.floor(Math.random() * 3) + 1; // 1-3 categories
  const selectedCategories: string[] = [];
  
  while (selectedCategories.length < numCategories) {
    const category = categories[Math.floor(Math.random() * categories.length)];
    if (!selectedCategories.includes(category.id)) {
      selectedCategories.push(category.id);
    }
  }
  
  return selectedCategories;
}

// Generate description
function generateDescription(restaurantName: string, categories: string[]): string {
    const descriptions = [
    `A cozy restaurant serving authentic dishes made with fresh, locally-sourced ingredients.`,
    `Experience amazing flavors at ${restaurantName}. Our chefs prepare each dish with passion and care.`,
    `${restaurantName} brings you the best cuisine in a warm and inviting atmosphere.`,
    `Welcome to ${restaurantName}, where we specialize in dishes made from traditional recipes.`,
    `At ${restaurantName}, we're passionate about food and creating memorable dining experiences.`,
    `Discover authentic flavors at ${restaurantName}. Every dish tells a story of tradition and taste.`,
    `Serving delicious meals in a comfortable setting since day one.`,
    `${restaurantName} offers a culinary journey that delights all your senses.`,
    `Where quality ingredients meet skilled craftsmanship in every dish.`,
    `A dining destination that combines great food with exceptional service.`,
    ];
  
  return descriptions[Math.floor(Math.random() * descriptions.length)];
}


// Main function to seed data
async function seedTestData(numRestaurants: number = 2) {
  console.log(`Starting to seed ${numRestaurants} test restaurants...`);
  
  try {
    for (let i = 0; i < numRestaurants; i++) {
      // Generate unique user ID
      const userId = `test-restaurant-${uuidv4()}`;
      const email = `restaurant${i + 1}@test.com`;
      
      // Generate restaurant data
      const selectedCategories = generateCategories();
      const categoryName = categories.find(c => c.id === selectedCategories[0])?.name || 'Restaurant';
      const restaurantName = generateRestaurantName(categoryName);
      
      const restaurantData = {
        // Restaurant business data
        restaurantName: restaurantName,
        displayName: restaurantName,
        categories: selectedCategories,
        ingredients: generateIngredients(),
        description: generateDescription(restaurantName, selectedCategories),
        profileImage: '', // Empty for now
        headerImage: '', // Empty for now
        setupCompleted: true,
        
        // User reference
        uid: userId,
        
        // Timestamps
        createdAt: Timestamp.fromDate(new Date()),
        lastUpdated: new Date().toISOString(),
      };
      
      // Create user document
      const userData = {
        uid: userId,
        email: email,
        name: restaurantName,
        picture: '',
        provider: 'auth0',
        userType: 'restaurant',
        emailVerified: true,
        lastLogin: new Date().toISOString(),
        loginSource: 'web',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        restaurantId: userId, // Using same ID for simplicity
      };
      
      // Save to Firestore
      await setDoc(doc(db, 'users', userId), userData);
      console.log(`Created user: ${email}`);
      
      await setDoc(doc(db, 'restaurants', userId), restaurantData);
      console.log(`Created restaurant: ${restaurantName} (${i + 1}/${numRestaurants})`);
      
      // Add a small delay to avoid hitting Firestore limits
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`Successfully seeded ${numRestaurants} restaurants!`);
    console.log('\nTest Accounts:');
    for (let i = 0; i < Math.min(10, numRestaurants); i++) {
      console.log(`Email: restaurant${i + 1}@test.com | Password: Use with Auth0 test user`);
    }
    
  } catch (error) {
    console.error('Error seeding test data:', error);
  }
}

// Run the script
const numRestaurants = process.argv[2] ? parseInt(process.argv[2]) : 2;
seedTestData(numRestaurants);