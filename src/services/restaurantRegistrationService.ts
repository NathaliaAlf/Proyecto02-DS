// services/restaurantRegistrationService.ts
import { restaurantApi } from "@/services/api/restaurantApi";
import { RestaurantCreateDTO } from "@/types/restaurant";

export const restaurantRegistrationService = {
  async createRestaurantProfile(
    uid: string,
    restaurantData: {
      restaurantName: string;
      displayName?: string;
      categories: string[];
      ingredients: string[];
      profileImage?: string;
      headerImage?: string;
    }
  ) {
    try {
      const createDTO: RestaurantCreateDTO = {
        uid,
        restaurantName: restaurantData.restaurantName,
        displayName: restaurantData.displayName || restaurantData.restaurantName,
        categories: restaurantData.categories,
        ingredients: restaurantData.ingredients,
        profileImage: restaurantData.profileImage,
        headerImage: restaurantData.headerImage,
        setupCompleted: true
      };
      
      const result = await restaurantApi.createRestaurant(createDTO);
      return result;
    } catch (error) {
      console.error('Error creating restaurant profile:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create restaurant profile' 
      };
    }
  },
  
  async updateRestaurantProfile(
    restaurantId: string,
    updateData: {
      restaurantName?: string;
      displayName?: string;
      categories?: string[];
      ingredients?: string[];
      profileImage?: string;
      headerImage?: string;
      description?: string;
      address?: string;
      phone?: string;
    }
  ) {
    try {
      const result = await restaurantApi.updateRestaurant(restaurantId, updateData);
      return result;
    } catch (error) {
      console.error('Error updating restaurant profile:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update restaurant profile' 
      };
    }
  },
  
  async uploadRestaurantImage(
    uid: string,
    imageType: 'profile' | 'header',
    imageUri: string
  ): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
      // This is where you'd integrate with your image upload service
      // For now, return the URI directly
      return { success: true, url: imageUri };
    } catch (error) {
      console.error('Error uploading restaurant image:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to upload image' 
      };
    }
  }
};