// types/customer.ts

import { Ingredient } from "./menu";

export interface Customer {
  id: string;
  uid: string; // Reference to auth UID
  email: string;
  name: string;
  phone?: string;
  address?: string;
  deliveryAddresses?: DeliveryAddress[];
  dietaryPreferences?: string[];
  allergies?: string[];
  favoriteRestaurants?: string[]; // Restaurant IDs
  createdAt: string;
  updatedAt: string;
}

export interface DeliveryAddress {
  id: string;
  label: string; // e.g., "Home", "Work"
  address: string;
  apartment?: string;
  city: string;
  postalCode: string;
  instructions?: string;
  isDefault: boolean;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface CustomerCreateDTO {
  uid: string;
  email: string;
  name: string;
  phone?: string;
  address?: string;
}

export interface CustomerUpdateDTO {
  name?: string;
  phone?: string;
  address?: string;
  dietaryPreferences?: string[];
  allergies?: string[];
}

export interface AddDeliveryAddressDTO {
  label: string;
  address: string;
  apartment?: string;
  city: string;
  postalCode: string;
  instructions?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

// Shopping Cart Types
export interface CartItem {
  id: string;
  menuId: string;
  plateId: string;
  plateName: string;
  variantId?: string | null;
  customIngredients?: Ingredient[] | null;
  selectedOptions: SelectedOption[];
  quantity: number;
  price: number;
  imageUrl?: string | null;
  restaurantId: string;
  restaurantName: string;
  addedAt: string;
  notes?: string;
  
  plateDetails?: {
    // Original plate data
    basePrice: number;
    description: string;
    baseIngredients: Ingredient[];
    sections: Array<{
      id: string;
      name: string;
      required: boolean;
      multiple: boolean;
      ingredientDependent: boolean;
      options: Array<{
        id: string;
        name: string;
        additionalCost: number;
        ingredients?: Ingredient[];
      }>;
    }>;
    
    // User's customization state
    customizationState: {
      removedIngredients: string[]; // Array of ingredient names that were removed
      selectedOptions: Record<string, string[]>; // sectionId -> optionIds[]
      quantity: number;
      notes: string;
    };
    
    // Current ingredients after customization
    currentIngredients: Ingredient[];
  };
}

export interface SelectedOption {
  sectionId: string;
  sectionName: string;
  optionId: string;
  optionName:string;
  additionalCost: number;
}

export interface ShoppingCart {
  id: string;
  customerId: string;
  restaurantId: string;
  restaurantName: string;
  items: CartItem[];
  totalItems: number;
  subtotal: number;
  deliveryFee?: number;
  tax?: number;
  total: number;
  createdAt: string;
  updatedAt: string;
}

// Order History Types
export type OrderStatus = 
  | 'pending' 
  | 'confirmed' 
  | 'preparing' 
  | 'ready' 
  | 'out_for_delivery' 
  | 'delivered' 
  | 'cancelled';

  export interface PlateSectionOption {
    description: string;
    extraPrice: number;
    id: string;
    name: string;
    updatedAt?: string;
}

export interface PlateSection {
    createdAt: string;
    description: string;
    id: string;
    name: string;
    options: PlateSectionOption[];
}

export interface OrderItem {
    active: boolean;
    baseIngredients: string[];
    basePrice: number;
    createdAt: string;
    description: string;
    id: string;
    name: string;
    optionalIngredients: string[];
    updatedAt: string;
    section: PlateSection[];
}

export interface Order {
  address: string;
  clientName: string;
  createdAt: string;
  orderId: string;
  plates: OrderItem[];
  restaurantId: string;
  totalAmount: number;
  updatedAt: string;
  status: OrderStatus;
  restaurantName?: string;
}