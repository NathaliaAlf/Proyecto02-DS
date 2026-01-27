// src/services/cloudinaryService.ts
import { CLOUDINARY_CONFIG } from '@/config/cloudinary';

export type UploadImageOptions = {
  uri: string;
  type: 'profile' | 'header' | 'dish' | 'menu';
  userId: string;
  folder?: string;
  tags?: string[];
};

export async function uploadToCloudinary({
  uri,
  type,
  userId,
  folder = 'restaurant_app',
  tags = [],
}: UploadImageOptions): Promise<string> {
  // Validate config
  if (!CLOUDINARY_CONFIG.cloudName || !CLOUDINARY_CONFIG.uploadPreset) {
    throw new Error(
      'Cloudinary configuration is missing. Please set EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME and EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET in your .env file.'
    );
  }

  try {
    // Create form data
    const formData = new FormData();
    const timestamp = Date.now();
    const publicId = `${type}_${userId}_${timestamp}`;
    
    // Get filename from URI
    const filename = uri.split('/').pop() || `${publicId}.jpg`;
    
    formData.append('file', {
      uri,
      type: 'image/jpeg',
      name: filename,
    } as any);
    
    formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);
    formData.append('public_id', publicId);
    formData.append('folder', folder);
    
    // Add default tags plus custom ones
    const allTags = [`type:${type}`, `user:${userId}`, ...tags];
    formData.append('tags', allTags.join(','));
    
    // Upload to Cloudinary
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/image/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Cloudinary upload failed: ${errorText}`);
    }
    
    const data = await response.json();
    return data.secure_url;
    
  } catch (error) {
    console.error('Cloudinary service error:', error);
    throw error;
  }
}

// Helper to get optimized image URL
export function getOptimizedImageUrl(
  originalUrl: string,
  options?: {
    width?: number;
    height?: number;
    quality?: number;
    format?: 'auto' | 'webp' | 'jpg' | 'png';
  }
): string {
  if (!originalUrl.includes('cloudinary.com')) {
    return originalUrl; // Not a Cloudinary URL
  }
  
  const { width, height, quality = 80, format = 'auto' } = options || {};
  
  // Parse the URL to insert transformations
  const urlParts = originalUrl.split('/upload/');
  if (urlParts.length !== 2) return originalUrl;
  
  const transformations = [];
  
  if (width && height) {
    transformations.push(`c_fill,w_${width},h_${height}`);
  } else if (width) {
    transformations.push(`w_${width}`);
  } else if (height) {
    transformations.push(`h_${height}`);
  }
  
  transformations.push(`q_${quality}`);
  transformations.push(`f_${format}`);
  
  const transformString = transformations.join(',');
  
  return `${urlParts[0]}/upload/${transformString}/${urlParts[1]}`;
}