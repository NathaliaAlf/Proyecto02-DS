import { db } from '@/config/firebase';
import * as Crypto from 'expo-crypto';
import {
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    updateDoc,
    where
} from 'firebase/firestore';

export const menuApi = {
    // ========== MENU CRUD ==========


    async getMenu(menuId: string): Promise<{ success: boolean; data?: any; error?: string }> {
        try {
            const menuRef = doc(db, 'menus', menuId);
            const menuSnap = await getDoc(menuRef);

            if (menuSnap.exists()) {
                const data = menuSnap.data();
                return {
                    success: true,
                    data: {
                        id: menuSnap.id,
                        ...data,

                        plates: data.plates || data.plate || []
                    }
                };
            }
            return { success: false, error: 'Menu not found' };
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Failed to get menu' };
        }
    },

    async getActiveMenu(restaurantId: string): Promise<{ success: boolean; data?: any; error?: string }> {
        try {
            const menusRef = collection(db, 'menus');
            const q = query(
                menusRef,
                where('restaurantId', '==', restaurantId),
                where('active', '==', true)
            );

            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                const docSnap = querySnapshot.docs[0];
                const data = docSnap.data();
                return {
                    success: true,
                    data: {
                        id: docSnap.id,
                        ...data,
                        plates: data.plates || data.plate || []
                    }
                };
            }
            return { success: false, error: 'No active menu found' };
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Failed' };
        }
    },

    // ========== PLATE CRUD (Operaciones sobre el Array) ==========



    async updatePlateInMenu(menuId: string, plateId: string, updatedPlateData: any): Promise<{ success: boolean; error?: string }> {
        try {
            const menuRef = doc(db, 'menus', menuId);
            const menuSnap = await getDoc(menuRef);

            if (!menuSnap.exists()) return { success: false, error: 'Menú no encontrado' };

            const data = menuSnap.data();

            const platesArray: any[] = data.plates || data.plate || [];

            const index = platesArray.findIndex(p => String(p.id) === String(plateId));

            if (index === -1) return { success: false, error: 'Platillo no encontrado dentro del menú' };

            platesArray[index] = {
                ...updatedPlateData,
                updatedAt: new Date().toISOString()
            };

            await updateDoc(menuRef, {
                plates: platesArray,
                updatedAt: new Date().toISOString()
            });

            return { success: true };
        } catch (error: any) {
            console.error("Error en updatePlateInMenu:", error);
            return { success: false, error: error.message };
        }
    },

    // Eliminar un plato del array
    async deletePlateFromMenu(menuId: string, plateId: string): Promise<{ success: boolean; error?: string }> {
        try {
            const menuRef = doc(db, 'menus', menuId);
            const menuSnap = await getDoc(menuRef);

            if (!menuSnap.exists()) return { success: false, error: 'Menu not found' };

            const data = menuSnap.data();
            const plates: any[] = data.plates || data.plate || [];

            const filteredPlates = plates.filter(p => p.id !== plateId);

            await updateDoc(menuRef, {
                plates: filteredPlates,
                updatedAt: new Date().toISOString()
            });

            return { success: true };
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Error deleting plate' };
        }
    },

    // Añadir un nuevo plato al array
    async addPlateToMenu(menuId: string, plateData: any): Promise<{ success: boolean; error?: string }> {
        try {
            const menuRef = doc(db, 'menus', menuId);
            const menuSnap = await getDoc(menuRef);

            if (!menuSnap.exists()) return { success: false, error: 'Menu not found' };

            const data = menuSnap.data();
            const plates = data.plates || data.plate || [];

            const newPlate = {
                ...plateData,
                id: Crypto.randomUUID(), // Generamos ID único
                createdAt: new Date().toISOString(),
                active: true
            };

            await updateDoc(menuRef, {
                plates: [...plates, newPlate],
                updatedAt: new Date().toISOString()
            });

            return { success: true };
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Error adding plate' };
        }
    }
};

