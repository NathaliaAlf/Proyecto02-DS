// In src/services/userService.ts
import { db } from '@/config/firebase';
import { AppUser, Auth0Profile } from '@/context/AuthContext';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

// src/services/userService.ts
export async function saveUserIfNotExists(
  auth0Profile: Auth0Profile, 
  loginSource?: 'web' | 'mobile' // Add parameter to detect source
): Promise<AppUser> {
  try {
    const userDocRef = doc(db, 'users', auth0Profile.sub);
    const userDoc = await getDoc(userDocRef);
    
    // Determine user type based on login source
    let userType: 'client' | 'restaurant' = 'client'; // Default to client
    
    if (loginSource === 'web') {
      userType = 'restaurant'; // Web login = restaurant
    } else if (loginSource === 'mobile') {
      userType = 'client'; // Mobile login = client
    }
    
    const userData = {
      uid: auth0Profile.sub,
      email: auth0Profile.email,
      name: auth0Profile.name || auth0Profile.nickname,
      picture: auth0Profile.picture,
      emailVerified: auth0Profile.email_verified,
      userType: userType, // Set based on login source
      loginSource: loginSource, // Store for debugging
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      provider: 'auth0',
    };
    
    if (!userDoc.exists()) {
      await setDoc(userDocRef, userData);
      console.log(`New ${userType} user created from ${loginSource}:`, auth0Profile.sub);
    } else {
      // Update existing user but preserve their type if already set
      const existingData = userDoc.data();
      await updateDoc(userDocRef, {
        lastLogin: new Date().toISOString(),
        // Don't override userType if already set
        ...(existingData.userType ? {} : { userType: userType }),
        ...(loginSource ? { loginSource: loginSource } : {}),
      });
      console.log(`User updated from ${loginSource}:`, auth0Profile.sub);
    }
    
    // Return AppUser
    return {
      uid: auth0Profile.sub,
      email: auth0Profile.email || null,
      name: auth0Profile.name || auth0Profile.nickname || null,
      photoURL: auth0Profile.picture || null,
      userType: userType,
    };
    
  } catch (error) {
    console.error('Error saving user:', error);
    throw error;
  }
}