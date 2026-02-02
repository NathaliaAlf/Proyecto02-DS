// context/SubscriptionContext.tsx
import React, { createContext, ReactNode, useContext, useState } from 'react';

export interface SelectedMeal {
  type: 'breakfast' | 'lunch' | 'dinner';
  typeLabel: string;
  startTime: Date;
  mealIndex: number;
  completed: boolean;
  selectedPlates?: Record<string, number>; // plateId: quantity
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
  updateMealCompletion: (dayIndex: number, mealIndex: number, completed: boolean, selectedPlates?: Record<string, number>) => void;
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
    plates?: Record<string, number>
  ) => {
    setSelectedSchedule(prev => {
      const newSchedule = [...prev];
      if (newSchedule[dayIndex] && newSchedule[dayIndex].meals[mealIndex]) {
        newSchedule[dayIndex].meals[mealIndex].completed = completed;
        
        // If plates are provided, merge them with existing plates
        if (plates) {
          const existingPlates = newSchedule[dayIndex].meals[mealIndex].selectedPlates || {};
          newSchedule[dayIndex].meals[mealIndex].selectedPlates = {
            ...existingPlates,
            ...plates
          };
        }
      }
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
  return context;
};