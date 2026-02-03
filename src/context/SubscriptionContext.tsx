// context/SubscriptionContext.tsx
import { Ingredient } from '@/types/menu';
import React, { createContext, ReactNode, useContext, useState } from 'react';

export interface SelectedMeal {
  type: 'breakfast' | 'lunch' | 'dinner';
  typeLabel: string;
  startTime: Date;
  mealIndex: number;
  completed: boolean;
  selectedPlates?: Array<{
    plateId: string;
    plateName: string;
    quantity: number;
    customization: {
      selectedOptions: Array<{
        sectionId: string;
        sectionName: string;
        optionId: string;
        optionName: string;
        additionalCost: number;
        ingredientDependent?: boolean;
        optionIngredients?: Ingredient[];
      }>;
      removedIngredients: string[];
      notes: string;
      totalPrice: number;
      plateDetails?: {
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
        customizationState: {
          removedIngredients: string[];
          selectedOptions: Record<string, string[]>;
          quantity: number;
          notes: string;
        };
        currentIngredients: Ingredient[];
        imageUrl?: string;
      };
    };
  }>;
}

export interface DaySchedule {
  day: string;
  dayLabel: string;
  dayIndex: number;
  meals: SelectedMeal[];
}

interface SubscriptionContextType {
  selectedSchedule: DaySchedule[];
  setSelectedSchedule: (schedule: DaySchedule[]) => void;
  updateMealCompletion: (
    dayIndex: number, 
    mealIndex: number, 
    completed: boolean, 
    plates?: Array<{
      plateId: string;
      plateName: string;
      quantity: number;
      customization: {
        selectedOptions: Array<{
          sectionId: string;
          sectionName: string;
          optionId: string;
          optionName: string;
          additionalCost: number;
          ingredientDependent?: boolean;
          optionIngredients?: Ingredient[];
        }>;
        removedIngredients: string[];
        notes: string;
        totalPrice: number;
        plateDetails?: {
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
          customizationState: {
            removedIngredients: string[];
            selectedOptions: Record<string, string[]>;
            quantity: number;
            notes: string;
          };
          currentIngredients: Ingredient[];
          imageUrl?: string;
        };
      };
    }>
  ) => void;
  getNextUncompletedMeal: () => { dayIndex: number; mealIndex: number } | null;
  clearSchedule: () => void;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const SubscriptionProvider = ({ children }: { children: ReactNode }) => {
  const [selectedSchedule, setSelectedSchedule] = useState<DaySchedule[]>([]);

  const updateMealCompletion = (
    dayIndex: number, 
    mealIndex: number, 
    completed: boolean, 
    plates?: any
  ) => {
    console.log('updateMealCompletion called with:', {
      dayIndex,
      mealIndex,
      completed,
      plates,
      currentScheduleLength: selectedSchedule.length
    });
    
    setSelectedSchedule(prev => {
      console.log('Previous schedule:', prev);
      
      const newSchedule = [...prev];
      console.log('New schedule copy:', newSchedule);
      
      if (newSchedule[dayIndex] && newSchedule[dayIndex].meals[mealIndex]) {
        console.log('Found meal at dayIndex:', dayIndex, 'mealIndex:', mealIndex);
        console.log('Current meal state:', newSchedule[dayIndex].meals[mealIndex]);
        
        newSchedule[dayIndex].meals[mealIndex].completed = completed;
        
        if (plates) {
          console.log('Adding plates:', plates);
          console.log('Plates type:', typeof plates);
          console.log('Is array?', Array.isArray(plates));
          
          newSchedule[dayIndex].meals[mealIndex].selectedPlates = plates;
          console.log('Plates stored:', newSchedule[dayIndex].meals[mealIndex].selectedPlates);
        } else {
          console.log('No plates provided');
        }
      } else {
        console.error('Could not find meal at dayIndex:', dayIndex, 'mealIndex:', mealIndex);
        console.error('Schedule structure:', {
          scheduleLength: newSchedule.length,
          dayExists: newSchedule[dayIndex] ? true : false,
          mealExists: newSchedule[dayIndex]?.meals[mealIndex] ? true : false
        });
      }
      
      console.log('Final schedule:', newSchedule);
      return newSchedule;
    });
  };

  const getNextUncompletedMeal = () => {
    for (let dayIndex = 0; dayIndex < selectedSchedule.length; dayIndex++) {
      const day = selectedSchedule[dayIndex];
      for (let mealIndex = 0; mealIndex < day.meals.length; mealIndex++) {
        if (!day.meals[mealIndex].completed) {
          return { dayIndex, mealIndex };
        }
      }
    }
    return null;
  };

  const clearSchedule = () => {
    setSelectedSchedule([]);
  };

  const value: SubscriptionContextType = {
    selectedSchedule,
    setSelectedSchedule,
    updateMealCompletion,
    getNextUncompletedMeal,
    clearSchedule
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  
  // Add a helper method for detailed plates
  const updateMealWithDetailedPlates = (
    dayIndex: number, 
    mealIndex: number, 
    detailedPlates: Array<{
      plateId: string;
      plateName: string;
      quantity: number;
      customization: any;
    }>
  ) => {
    return context.updateMealCompletion(dayIndex, mealIndex, false, detailedPlates);
  };

  return {
    ...context,
    updateMealWithDetailedPlates
  };
};