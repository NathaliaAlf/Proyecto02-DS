// src/utils/firebaseHelpers.ts
import { db } from '@/config/firebase';
import { doc, getDoc } from 'firebase/firestore';

export async function checkUserSetup(uid: string) {
  try {
    const userDocRef = doc(db, 'users', uid);
    const userDoc = await getDoc(userDocRef);
    
    if (!userDoc.exists()) {
      return { exists: false, data: null, setupComplete: false };
    }
    
    const userData = userDoc.data();
    const setupComplete = userData.setupCompleted === true;
    
    return {
      exists: true,
      data: userData,
      setupComplete,
      hasRestaurantInfo: !!userData.restaurantName,
      hasProfilePictures: !!(userData.profileImage && userData.headerImage),
    };
  } catch (error) {
    console.error('Error checking user setup:', error);
    throw error;
  }
}

export async function getUserData(uid: string) {
  try {
    const userDocRef = doc(db, 'users', uid);
    const userDoc = await getDoc(userDocRef);
    
    return userDoc.exists() ? userDoc.data() : null;
  } catch (error) {
    console.error('Error getting user data:', error);
    return null;
  }
}