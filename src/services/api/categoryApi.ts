import { db } from '@/config/firebase';
import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    DocumentData,
    getDoc,
    getDocs,
    limit,
    orderBy,
    query,
    QueryDocumentSnapshot,
    startAfter,
    updateDoc,
    where
} from 'firebase/firestore';

import {
    CategoriesPaginatedResponse,
    Category,
    CategoryCreateDTO,
    CategoryResponse,
    CategoryUpdateDTO
} from '@/types/category';


export const categoriesApi = {
  // Get all categories
  async getAllCategories(): Promise<CategoryResponse> {
    try {
      const categoriesRef = collection(db, 'categories');
      const querySnapshot = await getDocs(categoriesRef);
      
      const categories: Category[] = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data() as Omit<Category, 'id'>
      }));
      
      return { 
        success: true, 
        data: categories 
      };
    } catch (error) {
      console.error('Error getting categories:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get categories' 
      };
    }
  },

  // Get category by ID
  async getCategory(id: string): Promise<CategoryResponse> {
    try {
      const categoryRef = doc(db, 'categories', id);
      const categorySnap = await getDoc(categoryRef);
      
      if (categorySnap.exists()) {
        const categoryData = categorySnap.data();
        const category: Category = {
          id: categorySnap.id,
          title: categoryData.title,
          imageKey: categoryData.imageKey,
          createdAt: categoryData.createdAt,
          updatedAt: categoryData.updatedAt
        };
        
        return { 
          success: true, 
          data: category 
        };
      } else {
        return { 
          success: false, 
          error: 'Category not found' 
        };
      }
    } catch (error) {
      console.error('Error getting category:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get category' 
      };
    }
  },

  // Create a new category
  async createCategory(categoryData: CategoryCreateDTO): Promise<CategoryResponse> {
    try {
      const categoriesRef = collection(db, 'categories');
      const newCategory = {
        ...categoryData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      const docRef = await addDoc(categoriesRef, newCategory);
      
      const createdCategory: Category = {
        id: docRef.id,
        ...newCategory
      };
      
      return { 
        success: true, 
        data: createdCategory 
      };
    } catch (error) {
      console.error('Error creating category:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create category' 
      };
    }
  },

  // Update a category
  async updateCategory(id: string, updateData: CategoryUpdateDTO): Promise<CategoryResponse> {
    try {
      const categoryRef = doc(db, 'categories', id);
      
      // First, get the existing category to verify it exists
      const categorySnap = await getDoc(categoryRef);
      
      if (!categorySnap.exists()) {
        return { 
          success: false, 
          error: 'Category not found' 
        };
      }
      
      await updateDoc(categoryRef, {
        ...updateData,
        updatedAt: new Date().toISOString()
      });
      
      // Get the updated category
      const updatedSnap = await getDoc(categoryRef);
      const updatedData = updatedSnap.data();
      
      const updatedCategory: Category = {
        id: updatedSnap.id,
        title: updatedData?.title || '',
        imageKey: updatedData?.imageKey || '',
        createdAt: updatedData?.createdAt,
        updatedAt: updatedData?.updatedAt
      };
      
      return { 
        success: true, 
        data: updatedCategory 
      };
    } catch (error) {
      console.error('Error updating category:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update category' 
      };
    }
  },

  // Delete a category
  async deleteCategory(id: string): Promise<CategoryResponse> {
    try {
      const categoryRef = doc(db, 'categories', id);
      
      // Verify the category exists before deleting
      const categorySnap = await getDoc(categoryRef);
      
      if (!categorySnap.exists()) {
        return { 
          success: false, 
          error: 'Category not found' 
        };
      }
      
      const categoryToDelete: Category = {
        id: categorySnap.id,
        ...categorySnap.data() as Omit<Category, 'id'>
      };
      
      await deleteDoc(categoryRef);
      
      return { 
        success: true, 
        data: categoryToDelete 
      };
    } catch (error) {
      console.error('Error deleting category:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to delete category' 
      };
    }
  },

  // Get categories with pagination
  async getCategoriesPaginated(
    pageSize: number = 10, 
    lastDoc?: QueryDocumentSnapshot<DocumentData>
  ): Promise<CategoriesPaginatedResponse> {
    try {
      const categoriesRef = collection(db, 'categories');
      let q;
      
      if (lastDoc) {
        q = query(
          categoriesRef, 
          orderBy('title'), 
          startAfter(lastDoc), 
          limit(pageSize)
        );
      } else {
        q = query(
          categoriesRef, 
          orderBy('title'), 
          limit(pageSize)
        );
      }
      
      const querySnapshot = await getDocs(q);
      
      const categories: Category[] = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data() as Omit<Category, 'id'>
      }));
      
      return { 
        success: true, 
        data: categories,
        lastDoc: querySnapshot.docs[querySnapshot.docs.length - 1]
      };
    } catch (error) {
      console.error('Error getting paginated categories:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get categories' 
      };
    }
  },

  // Search categories by title
  async searchCategories(searchTerm: string): Promise<CategoryResponse> {
    try {
      const categoriesRef = collection(db, 'categories');
      const q = query(
        categoriesRef,
        where('title', '>=', searchTerm.toLowerCase()),
        where('title', '<=', searchTerm.toLowerCase() + '\uf8ff')
      );
      
      const querySnapshot = await getDocs(q);
      
      const categories: Category[] = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data() as Omit<Category, 'id'>
      }));
      
      return { 
        success: true, 
        data: categories 
      };
    } catch (error) {
      console.error('Error searching categories:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to search categories' 
      };
    }
  }
};
