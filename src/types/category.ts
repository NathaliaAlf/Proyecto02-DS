export interface Category {
  id: string; 
  title: string;
  imageKey: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CategoryCreateDTO {
  title: string;
  imageKey: string;
}

export interface CategoryUpdateDTO {
  title?: string;
  imageKey?: string;
}

export interface CategoryResponse {
  success: boolean;
  data?: Category | Category[];
  error?: string;
}

export interface CategoriesPaginatedResponse {
  success: boolean;
  data?: Category[];
  lastDoc?: any;
  error?: string;
}