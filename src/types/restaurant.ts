export interface Restaurant {
  id: string;
  uid: string; // Reference to user document
  restaurantName: string;
  displayName: string;
  categories: string[]; 
  ingredients: string[];
  profileImage: string;
  headerImage: string;
  setupCompleted: boolean;
  createdAt: string;
  lastUpdated: string;
  description?: string;
}

export interface RestaurantCreateDTO {
  uid: string;
  restaurantName: string;
  displayName: string;
  categories?: string[];
  ingredients?: string[];
  profileImage?: string;
  headerImage?: string;
  setupCompleted?: boolean;
}

export interface RestaurantUpdateDTO {
  restaurantName?: string;
  displayName?: string;
  categories?: string[];
  ingredients?: string[];
  profileImage?: string;
  headerImage?: string;
  setupCompleted?: boolean;
  description?: string;
  lastUpdated?: string;
}