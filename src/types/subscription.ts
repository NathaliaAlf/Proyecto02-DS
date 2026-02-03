// types/subscription.ts

import { Ingredient } from "./menu";

// Subscription frequency options
export type SubscriptionFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly';

// Subscription status
export type SubscriptionStatus = 
  | 'active' 
  | 'paused' 
  | 'cancelled' 
  | 'expired' 
  | 'pending';

// Day of week
export type DayOfWeek = 
  | 'monday' 
  | 'tuesday' 
  | 'wednesday' 
  | 'thursday' 
  | 'friday' 
  | 'saturday' 
  | 'sunday';

// Meal time types
export type MealTime = 'breakfast' | 'lunch' | 'dinner';

// Selected option for customization
export interface SubscriptionSelectedOption {
  sectionId: string;
  sectionName: string;
  optionId: string;
  optionName: string;
  additionalCost: number;
}

// Ingredient modification tracking
export interface IngredientModification {
  ingredientId: string;
  ingredientName: string;
  action: 'add' | 'remove' | 'extra'; // add new, remove existing, or extra portion
  priceDifference?: number; // cost for adding or extra
}

// Detailed plate item in subscription
export interface SubscriptionPlateItem {
  id: string; // Unique item ID
  plateId: string;
  plateName: string;
  plateDescription?: string;
  imageUrl?: string;
  
  // Variant selection (if plate has variants like sizes)
  variantId?: string | null;
  variantName?: string | null;
  
  // Base pricing
  basePrice: number;
  variantPrice?: number; // Additional cost if variant is selected
  
  // Customizations
  selectedOptions: SubscriptionSelectedOption[]; // Multi-select options (toppings, sides, etc.)
  ingredientModifications?: IngredientModification[]; // Ingredients added/removed
  customIngredients?: Ingredient[] | null; // Complete custom ingredient list if applicable
  
  // Pricing breakdown
  optionsCost: number; // Total cost from selected options
  ingredientsCost: number; // Cost from ingredient modifications
  totalPrice: number; // Base + variant + options + ingredients
  
  // Quantity and notes
  quantity: number;
  notes?: string; // Special instructions for this item
  
  // Metadata
  addedAt: string;
  lastModifiedAt?: string;
}

// Meal within a day schedule
export interface SubscriptionMeal {
  id: string; // Unique meal ID
  type: MealTime;
  deliveryTime?: string; // Preferred delivery time (e.g., "08:00", "12:30")
  items: SubscriptionPlateItem[]; // All plates for this meal
  mealTotal: number; // Total cost for this meal
  specialInstructions?: string; // Meal-level instructions
  completed: boolean; // Whether this meal has been selected
}

export interface CreateSubscriptionDayDTO {
  day: DayOfWeek;
  date?: string;
  meals: CreateSubscriptionMealDTO[];
  skipDelivery?: boolean;
}

// Day in subscription schedule
export interface SubscriptionDay {
  id: string; // Unique day ID
  day: DayOfWeek;
  date?: string; // Optional specific date (for non-recurring)
  meals: SubscriptionMeal[];
  dayTotal: number; // Total cost for all meals this day
  skipDelivery?: boolean; // Flag to skip this day
}

// Delivery address for subscription
export interface SubscriptionDeliveryAddress {
  id: string;
  label: string; // e.g., "Home", "Work"
  address: string;
  apartment?: string;
  city: string;
  postalCode: string;
  instructions?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  isDefault: boolean;
}

// Billing information
export interface SubscriptionBilling {
  subtotal: number; // Sum of all items
  deliveryFee: number; // Per delivery or total
  tax: number;
  discount?: number; // Any promotional discounts
  total: number;
  billingCycle: SubscriptionFrequency;
  nextBillingDate: string;
}

// Main subscription interface
export interface Subscription {
  id: string;
  subscriptionNumber: string; // Unique identifier like "SUB-123456"
  
  // Customer info
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  
  // Restaurant info
  restaurantId: string;
  restaurantName: string;
  
  // Schedule
  frequency: SubscriptionFrequency;
  schedule: SubscriptionDay[]; // Weekly schedule of meals
  
  // Delivery
  deliveryAddress: SubscriptionDeliveryAddress;
  defaultDeliveryTime?: string; // Default time if not specified per meal
  
  // Billing
  billing: SubscriptionBilling;
  paymentMethod: string;
  
  // Status and dates
  status: SubscriptionStatus;
  startDate: string;
  endDate?: string; // For fixed-term subscriptions
  nextDeliveryDate: string;
  
  // Pause/Skip functionality
  pausedUntil?: string; // Date when subscription resumes
  skippedDeliveries?: string[]; // Array of dates to skip
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  lastDeliveredAt?: string;
}

// DTO for creating a new subscription
export interface CreateSubscriptionDTO {
  customerId: string;
  restaurantId: string;
  frequency: SubscriptionFrequency;
  schedule: CreateSubscriptionDayDTO[]; // Use the new DTO type instead of Omit<SubscriptionDay, 'id' | 'dayTotal'>
  deliveryAddress: Omit<SubscriptionDeliveryAddress, 'id'>;
  defaultDeliveryTime?: string;
  paymentMethod: string;
  startDate: string;
  endDate?: string;
}

// DTO for updating subscription
export interface UpdateSubscriptionDTO {
  schedule?: Omit<SubscriptionDay, 'id' | 'dayTotal'>[];
  deliveryAddress?: SubscriptionDeliveryAddress;
  defaultDeliveryTime?: string;
  status?: SubscriptionStatus;
  pausedUntil?: string;
  skippedDeliveries?: string[];
}

export interface CreateSubscriptionMealDTO {
  type: MealTime;
  deliveryTime?: string;
  items: Omit<SubscriptionPlateItem, 'id' | 'addedAt' | 'totalPrice'>[];
  specialInstructions?: string;
  completed: boolean;
}

// DTO for adding/updating a specific meal
export interface UpdateSubscriptionMealDTO {
  dayId: string;
  mealId: string;
  items: Omit<SubscriptionPlateItem, 'id' | 'addedAt'>[];
  deliveryTime?: string;
  specialInstructions?: string;
}

// Subscription analytics/summary
export interface SubscriptionSummary {
  totalDays: number;
  totalMeals: number;
  totalItems: number;
  weeklyTotal: number;
  monthlyTotal: number;
  mostOrderedPlates: {
    plateId: string;
    plateName: string;
    count: number;
  }[];
}

// History of deliveries
export interface SubscriptionDelivery {
  id: string;
  subscriptionId: string;
  deliveryDate: string;
  dayOfWeek: DayOfWeek;
  meals: SubscriptionMeal[];
  deliveryStatus: 'scheduled' | 'preparing' | 'out_for_delivery' | 'delivered' | 'failed';
  deliveredAt?: string;
  deliveryNotes?: string;
  total: number;
}