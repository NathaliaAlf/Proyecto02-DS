// src/config/cloudinary.ts
export const CLOUDINARY_CONFIG = {
  cloudName: process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME || '',
  uploadPreset: process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET || '',
};

// Validate that the config is set
export const validateCloudinaryConfig = () => {
  if (!CLOUDINARY_CONFIG.cloudName) {
    console.warn('Cloudinary cloud name is not set in environment variables');
  }
  if (!CLOUDINARY_CONFIG.uploadPreset) {
    console.warn('Cloudinary upload preset is not set in environment variables');
  }
};