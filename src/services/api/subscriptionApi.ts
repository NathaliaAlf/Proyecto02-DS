// api/subscriptionApi.ts
import { db } from '@/config/firebase';
import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    limit,
    orderBy,
    query,
    runTransaction,
    updateDoc,
    where
} from 'firebase/firestore';

import {
    CreateSubscriptionDTO,
    DayOfWeek,
    Subscription,
    SubscriptionBilling,
    SubscriptionDay,
    SubscriptionDelivery,
    SubscriptionFrequency,
    SubscriptionMeal,
    SubscriptionPlateItem,
    SubscriptionStatus,
    SubscriptionSummary,
    UpdateSubscriptionDTO,
    UpdateSubscriptionMealDTO
} from '@/types/subscription';

// Helper function to generate unique IDs
const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

// Helper function to generate subscription number
const generateSubscriptionNumber = () => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `SUB-${timestamp}-${random}`;
};

// Calculate total for a single plate item
const calculatePlateItemTotal = (item: Omit<SubscriptionPlateItem, 'id' | 'addedAt' | 'totalPrice'>): number => {
  let total = item.basePrice;
  
  // Add variant price if exists
  if (item.variantPrice) {
    total += item.variantPrice;
  }
  
  // Add options cost
  total += item.optionsCost || 0;
  
  // Add ingredients cost
  total += item.ingredientsCost || 0;
  
  return total * item.quantity;
};

// Calculate total for a meal
const calculateMealTotal = (items: SubscriptionPlateItem[]): number => {
  return items.reduce((sum, item) => sum + item.totalPrice, 0);
};

// Calculate total for a day
const calculateDayTotal = (meals: SubscriptionMeal[]): number => {
  return meals.reduce((sum, meal) => sum + meal.mealTotal, 0);
};

// Calculate billing based on frequency and schedule
const calculateBilling = (
  schedule: SubscriptionDay[],
  frequency: SubscriptionFrequency,
  deliveryFeePerDelivery: number = 5.99,
  taxRate: number = 0.08
): SubscriptionBilling => {
  // Calculate subtotal from all days
  const subtotal = schedule.reduce((sum, day) => {
    if (!day.skipDelivery) {
      return sum + day.dayTotal;
    }
    return sum;
  }, 0);
  
  // Calculate delivery fee based on frequency
  const activeDays = schedule.filter(day => !day.skipDelivery).length;
  const deliveryFee = activeDays * deliveryFeePerDelivery;
  
  // Calculate tax
  const tax = subtotal * taxRate;
  
  // Total
  const total = subtotal + deliveryFee + tax;
  
  // Next billing date calculation (simplified - should be more sophisticated)
  const now = new Date();
  let nextBillingDate: Date;
  
  switch (frequency) {
    case 'daily':
      nextBillingDate = new Date(now.setDate(now.getDate() + 1));
      break;
    case 'weekly':
      nextBillingDate = new Date(now.setDate(now.getDate() + 7));
      break;
    case 'biweekly':
      nextBillingDate = new Date(now.setDate(now.getDate() + 14));
      break;
    case 'monthly':
      nextBillingDate = new Date(now.setMonth(now.getMonth() + 1));
      break;
    default:
      nextBillingDate = new Date(now.setDate(now.getDate() + 7));
  }
  
  return {
    subtotal,
    deliveryFee,
    tax,
    total,
    billingCycle: frequency,
    nextBillingDate: nextBillingDate.toISOString()
  };
};

export const subscriptionApi = {
  // ========== CREATE SUBSCRIPTION ==========
  
  async createSubscription(
    subscriptionData: CreateSubscriptionDTO
  ): Promise<{ success: boolean; data?: Subscription; error?: string }> {
    try {
      const subscriptionsRef = collection(db, 'subscriptions');
      const now = new Date().toISOString();
      
      // Generate subscription number
      const subscriptionNumber = generateSubscriptionNumber();
      
      // Get customer and restaurant info
      const { customerApi } = await import('@/services/api/customerApi');
      const customerResult = await customerApi.getCustomer(subscriptionData.customerId);
      if (!customerResult.success || !customerResult.data) {
        throw new Error('Customer not found');
      }
      
      const { restaurantApi } = await import('@/services/api/restaurantApi');
      const restaurantResult = await restaurantApi.getRestaurant(subscriptionData.restaurantId);
      if (!restaurantResult.success || !restaurantResult.data) {
        throw new Error('Restaurant not found');
      }
      
      // Process schedule: add IDs and calculate totals
      const processedSchedule: SubscriptionDay[] = subscriptionData.schedule.map(day => {
        // Process meals
        const processedMeals: SubscriptionMeal[] = day.meals.map(meal => {
          // Process items: add IDs and calculate totals
          const processedItems: SubscriptionPlateItem[] = meal.items.map(item => ({
            ...item,
            id: generateId(),
            totalPrice: calculatePlateItemTotal(item),
            addedAt: now,
            lastModifiedAt: now
          }));
          
          return {
            ...meal,
            id: generateId(),
            items: processedItems,
            mealTotal: calculateMealTotal(processedItems)
          };
        });
        
        return {
          ...day,
          id: generateId(),
          meals: processedMeals,
          dayTotal: calculateDayTotal(processedMeals)
        };
      });
      
      // Calculate billing
      const billing = calculateBilling(processedSchedule, subscriptionData.frequency);
      
      // Create delivery address with ID
      const deliveryAddress = {
        ...subscriptionData.deliveryAddress,
        id: generateId()
      };
      
      // Calculate next delivery date (simplified)
      const startDate = new Date(subscriptionData.startDate);
      const nextDeliveryDate = startDate > new Date() 
        ? startDate.toISOString() 
        : new Date().toISOString();
      
      const newSubscription: Omit<Subscription, 'id'> = {
        subscriptionNumber,
        customerId: subscriptionData.customerId,
        customerName: customerResult.data.name,
        customerEmail: customerResult.data.email,
        customerPhone: customerResult.data.phone,
        restaurantId: subscriptionData.restaurantId,
        restaurantName: restaurantResult.data.restaurantName,
        frequency: subscriptionData.frequency,
        schedule: processedSchedule,
        deliveryAddress,
        defaultDeliveryTime: subscriptionData.defaultDeliveryTime,
        billing,
        paymentMethod: subscriptionData.paymentMethod,
        status: 'active',
        startDate: subscriptionData.startDate,
        endDate: subscriptionData.endDate,
        nextDeliveryDate,
        createdAt: now,
        updatedAt: now
      };
      
      const docRef = await addDoc(subscriptionsRef, newSubscription);
      
      const createdSubscription: Subscription = {
        id: docRef.id,
        ...newSubscription
      };
      
      return { success: true, data: createdSubscription };
    } catch (error) {
      console.error('Error creating subscription:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create subscription' 
      };
    }
  },

  // ========== GET SUBSCRIPTION ==========
  
  async getSubscription(
    subscriptionId: string
  ): Promise<{ success: boolean; data?: Subscription; error?: string }> {
    try {
      const subscriptionRef = doc(db, 'subscriptions', subscriptionId);
      const subscriptionSnap = await getDoc(subscriptionRef);
      
      if (subscriptionSnap.exists()) {
        const subscription: Subscription = {
          id: subscriptionSnap.id,
          ...subscriptionSnap.data() as Omit<Subscription, 'id'>
        };
        
        return { success: true, data: subscription };
      } else {
        return { success: false, error: 'Subscription not found' };
      }
    } catch (error) {
      console.error('Error getting subscription:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get subscription' 
      };
    }
  },

  // ========== GET CUSTOMER SUBSCRIPTIONS ==========
  
  async getCustomerSubscriptions(
    customerId: string,
    statusFilter?: SubscriptionStatus[],
    limitCount: number = 20
  ): Promise<{ success: boolean; data?: Subscription[]; error?: string }> {
    try {
      const subscriptionsRef = collection(db, 'subscriptions');
      
      let q = query(
        subscriptionsRef,
        where('customerId', '==', customerId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );
      
      const querySnapshot = await getDocs(q);
      let subscriptions: Subscription[] = querySnapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data() as Omit<Subscription, 'id'>
      }));
      
      // Filter by status if provided
      if (statusFilter && statusFilter.length > 0) {
        subscriptions = subscriptions.filter(sub => 
          statusFilter.includes(sub.status)
        );
      }
      
      return { success: true, data: subscriptions };
    } catch (error) {
      console.error('Error getting customer subscriptions:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get subscriptions' 
      };
    }
  },

  // ========== GET RESTAURANT SUBSCRIPTIONS ==========
  
  async getRestaurantSubscriptions(
    restaurantId: string,
    statusFilter?: SubscriptionStatus[],
    limitCount: number = 50
  ): Promise<{ success: boolean; data?: Subscription[]; error?: string }> {
    try {
      const subscriptionsRef = collection(db, 'subscriptions');
      
      let q = query(
        subscriptionsRef,
        where('restaurantId', '==', restaurantId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );
      
      const querySnapshot = await getDocs(q);
      let subscriptions: Subscription[] = querySnapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data() as Omit<Subscription, 'id'>
      }));
      
      // Filter by status if provided
      if (statusFilter && statusFilter.length > 0) {
        subscriptions = subscriptions.filter(sub => 
          statusFilter.includes(sub.status)
        );
      }
      
      return { success: true, data: subscriptions };
    } catch (error) {
      console.error('Error getting restaurant subscriptions:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get subscriptions' 
      };
    }
  },

  // ========== UPDATE SUBSCRIPTION ==========
  
  async updateSubscription(
    subscriptionId: string,
    updateData: UpdateSubscriptionDTO
  ): Promise<{ success: boolean; data?: Subscription; error?: string }> {
    try {
      const subscriptionRef = doc(db, 'subscriptions', subscriptionId);
      
      return await runTransaction(db, async (transaction) => {
        const subscriptionSnap = await transaction.get(subscriptionRef);
        
        if (!subscriptionSnap.exists()) {
          throw new Error('Subscription not found');
        }
        
        const currentData = subscriptionSnap.data() as Omit<Subscription, 'id'>;
        const now = new Date().toISOString();
        
        // If schedule is being updated, recalculate totals and billing
        let processedSchedule = currentData.schedule;
        let newBilling = currentData.billing;
        
        if (updateData.schedule) {
          processedSchedule = updateData.schedule.map((day, dayIndex) => {
            // Try to preserve existing ID if updating same day, otherwise generate new
            const existingDay = currentData.schedule.find(d => d.day === day.day);
            const dayId = existingDay?.id || generateId();
            
            const processedMeals: SubscriptionMeal[] = day.meals.map((meal, mealIndex) => {
              // Try to preserve existing meal ID if updating same meal
              const existingMeal = existingDay?.meals.find(m => m.type === meal.type);
              const mealId = existingMeal?.id || generateId();
              
              const processedItems: SubscriptionPlateItem[] = meal.items.map(item => {
                // Items in the update might already have IDs from previous operations
                const itemAsAny = item as any;
                return {
                  ...item,
                  id: itemAsAny.id || generateId(),
                  totalPrice: itemAsAny.totalPrice || calculatePlateItemTotal(item),
                  addedAt: itemAsAny.addedAt || now,
                  lastModifiedAt: now
                };
              });
              
              return {
                ...meal,
                id: mealId,
                items: processedItems,
                mealTotal: calculateMealTotal(processedItems)
              };
            });
            
            return {
              ...day,
              id: dayId,
              meals: processedMeals,
              dayTotal: calculateDayTotal(processedMeals)
            };
          });
          
          // Recalculate billing
          newBilling = calculateBilling(processedSchedule, currentData.frequency);
        }
        
        const updatePayload = {
          ...updateData,
          schedule: processedSchedule,
          billing: newBilling,
          updatedAt: now
        };
        
        transaction.update(subscriptionRef, updatePayload);
        
        const updatedSubscription: Subscription = {
          id: subscriptionSnap.id,
          ...currentData,
          ...updatePayload
        };
        
        return { success: true, data: updatedSubscription };
      });
    } catch (error) {
      console.error('Error updating subscription:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update subscription' 
      };
    }
  },

  // ========== UPDATE SPECIFIC MEAL IN SUBSCRIPTION ==========
  
  async updateSubscriptionMeal(
    subscriptionId: string,
    mealUpdate: UpdateSubscriptionMealDTO
  ): Promise<{ success: boolean; data?: Subscription; error?: string }> {
    try {
      const subscriptionRef = doc(db, 'subscriptions', subscriptionId);
      
      return await runTransaction(db, async (transaction) => {
        const subscriptionSnap = await transaction.get(subscriptionRef);
        
        if (!subscriptionSnap.exists()) {
          throw new Error('Subscription not found');
        }
        
        const currentData = subscriptionSnap.data() as Omit<Subscription, 'id'>;
        const now = new Date().toISOString();
        
        let dayFound = false;
        let mealFound = false;
        
        // Find and update the specific day and meal
        const updatedSchedule = currentData.schedule.map(day => {
          if (day.id === mealUpdate.dayId) {
            dayFound = true;
            const updatedMeals = day.meals.map(meal => {
              if (meal.id === mealUpdate.mealId) {
                mealFound = true;
                // Process new items
                const processedItems: SubscriptionPlateItem[] = mealUpdate.items.map(item => ({
                  ...item,
                  id: generateId(),
                  totalPrice: calculatePlateItemTotal(item),
                  addedAt: now,
                  lastModifiedAt: now
                }));
                
                return {
                  ...meal,
                  items: processedItems,
                  mealTotal: calculateMealTotal(processedItems),
                  deliveryTime: mealUpdate.deliveryTime || meal.deliveryTime,
                  specialInstructions: mealUpdate.specialInstructions || meal.specialInstructions
                };
              }
              return meal;
            });
            
            return {
              ...day,
              meals: updatedMeals,
              dayTotal: calculateDayTotal(updatedMeals)
            };
          }
          return day;
        });
        
        if (!dayFound) {
          throw new Error(`Day with id ${mealUpdate.dayId} not found in subscription`);
        }
        
        if (!mealFound) {
          throw new Error(`Meal with id ${mealUpdate.mealId} not found in day ${mealUpdate.dayId}`);
        }
        
        // Recalculate billing
        const newBilling = calculateBilling(updatedSchedule, currentData.frequency);
        
        const updatePayload = {
          schedule: updatedSchedule,
          billing: newBilling,
          updatedAt: now
        };
        
        transaction.update(subscriptionRef, updatePayload);
        
        const updatedSubscription: Subscription = {
          id: subscriptionSnap.id,
          ...currentData,
          ...updatePayload
        };
        
        return { success: true, data: updatedSubscription };
      });
    } catch (error) {
      console.error('Error updating subscription meal:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update meal' 
      };
    }
  },

  // ========== PAUSE SUBSCRIPTION ==========
  
  async pauseSubscription(
    subscriptionId: string,
    pausedUntil: string
  ): Promise<{ success: boolean; data?: Subscription; error?: string }> {
    try {
      const subscriptionRef = doc(db, 'subscriptions', subscriptionId);
      
      const updatePayload = {
        status: 'paused' as SubscriptionStatus,
        pausedUntil,
        updatedAt: new Date().toISOString()
      };
      
      await updateDoc(subscriptionRef, updatePayload);
      
      const updatedSnap = await getDoc(subscriptionRef);
      const updatedSubscription: Subscription = {
        id: updatedSnap.id,
        ...updatedSnap.data() as Omit<Subscription, 'id'>
      };
      
      return { success: true, data: updatedSubscription };
    } catch (error) {
      console.error('Error pausing subscription:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to pause subscription' 
      };
    }
  },

  // ========== RESUME SUBSCRIPTION ==========
  
  async resumeSubscription(
    subscriptionId: string
  ): Promise<{ success: boolean; data?: Subscription; error?: string }> {
    try {
      const subscriptionRef = doc(db, 'subscriptions', subscriptionId);
      
      const updatePayload = {
        status: 'active' as SubscriptionStatus,
        pausedUntil: null,
        updatedAt: new Date().toISOString()
      };
      
      await updateDoc(subscriptionRef, updatePayload);
      
      const updatedSnap = await getDoc(subscriptionRef);
      const updatedSubscription: Subscription = {
        id: updatedSnap.id,
        ...updatedSnap.data() as Omit<Subscription, 'id'>
      };
      
      return { success: true, data: updatedSubscription };
    } catch (error) {
      console.error('Error resuming subscription:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to resume subscription' 
      };
    }
  },

  // ========== CANCEL SUBSCRIPTION ==========
  
  async cancelSubscription(
    subscriptionId: string
  ): Promise<{ success: boolean; data?: Subscription; error?: string }> {
    try {
      const subscriptionRef = doc(db, 'subscriptions', subscriptionId);
      
      const updatePayload = {
        status: 'cancelled' as SubscriptionStatus,
        updatedAt: new Date().toISOString()
      };
      
      await updateDoc(subscriptionRef, updatePayload);
      
      const updatedSnap = await getDoc(subscriptionRef);
      const updatedSubscription: Subscription = {
        id: updatedSnap.id,
        ...updatedSnap.data() as Omit<Subscription, 'id'>
      };
      
      return { success: true, data: updatedSubscription };
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to cancel subscription' 
      };
    }
  },

  // ========== DELETE SUBSCRIPTION ==========
  
  async deleteSubscription(
    subscriptionId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const subscriptionRef = doc(db, 'subscriptions', subscriptionId);
      await deleteDoc(subscriptionRef);
      
      return { success: true };
    } catch (error) {
      console.error('Error deleting subscription:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to delete subscription' 
      };
    }
  },

  // ========== SKIP DELIVERY ==========
  
  async skipDelivery(
    subscriptionId: string,
    deliveryDate: string
  ): Promise<{ success: boolean; data?: Subscription; error?: string }> {
    try {
      const subscriptionRef = doc(db, 'subscriptions', subscriptionId);
      
      return await runTransaction(db, async (transaction) => {
        const subscriptionSnap = await transaction.get(subscriptionRef);
        
        if (!subscriptionSnap.exists()) {
          throw new Error('Subscription not found');
        }
        
        const currentData = subscriptionSnap.data() as Omit<Subscription, 'id'>;
        const skippedDeliveries = currentData.skippedDeliveries || [];
        
        if (!skippedDeliveries.includes(deliveryDate)) {
          skippedDeliveries.push(deliveryDate);
        }
        
        const updatePayload = {
          skippedDeliveries,
          updatedAt: new Date().toISOString()
        };
        
        transaction.update(subscriptionRef, updatePayload);
        
        const updatedSubscription: Subscription = {
          id: subscriptionSnap.id,
          ...currentData,
          ...updatePayload
        };
        
        return { success: true, data: updatedSubscription };
      });
    } catch (error) {
      console.error('Error skipping delivery:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to skip delivery' 
      };
    }
  },

  // ========== GET SUBSCRIPTION SUMMARY ==========
  
  async getSubscriptionSummary(
    subscriptionId: string
  ): Promise<{ success: boolean; data?: SubscriptionSummary; error?: string }> {
    try {
      const subscriptionResult = await this.getSubscription(subscriptionId);
      
      if (!subscriptionResult.success || !subscriptionResult.data) {
        return { success: false, error: 'Subscription not found' };
      }
      
      const subscription = subscriptionResult.data;
      
      // Calculate totals
      const totalDays = subscription.schedule.filter(day => !day.skipDelivery).length;
      const totalMeals = subscription.schedule.reduce((sum, day) => 
        sum + (day.skipDelivery ? 0 : day.meals.length), 0
      );
      
      const totalItems = subscription.schedule.reduce((sum, day) => {
        if (day.skipDelivery) return sum;
        return sum + day.meals.reduce((mealSum, meal) => 
          mealSum + meal.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0
        );
      }, 0);
      
      // Calculate weekly and monthly totals based on frequency
      const weeklyTotal = subscription.frequency === 'weekly' 
        ? subscription.billing.total 
        : subscription.billing.total * 4; // Approximate
      
      const monthlyTotal = subscription.frequency === 'monthly'
        ? subscription.billing.total
        : weeklyTotal;
      
      // Find most ordered plates
      const plateCountMap: Record<string, { name: string; count: number }> = {};
      
      subscription.schedule.forEach(day => {
        if (day.skipDelivery) return;
        day.meals.forEach(meal => {
          meal.items.forEach(item => {
            if (!plateCountMap[item.plateId]) {
              plateCountMap[item.plateId] = {
                name: item.plateName,
                count: 0
              };
            }
            plateCountMap[item.plateId].count += item.quantity;
          });
        });
      });
      
      const mostOrderedPlates = Object.entries(plateCountMap)
        .map(([plateId, data]) => ({
          plateId,
          plateName: data.name,
          count: data.count
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5); // Top 5
      
      const summary: SubscriptionSummary = {
        totalDays,
        totalMeals,
        totalItems,
        weeklyTotal,
        monthlyTotal,
        mostOrderedPlates
      };
      
      return { success: true, data: summary };
    } catch (error) {
      console.error('Error getting subscription summary:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get summary' 
      };
    }
  },

  // ========== RECORD DELIVERY ==========
  
  async recordDelivery(
    subscriptionId: string,
    deliveryData: {
      deliveryDate: string;
      dayOfWeek: DayOfWeek;
      meals: SubscriptionMeal[];
      deliveryStatus: 'scheduled' | 'preparing' | 'out_for_delivery' | 'delivered' | 'failed';
      deliveredAt?: string;
      deliveryNotes?: string;
    }
  ): Promise<{ success: boolean; data?: SubscriptionDelivery; error?: string }> {
    try {
      const deliveriesRef = collection(db, 'subscription_deliveries');
      const now = new Date().toISOString();
      
      const total = calculateDayTotal(deliveryData.meals);
      
      const newDelivery: Omit<SubscriptionDelivery, 'id'> = {
        subscriptionId,
        deliveryDate: deliveryData.deliveryDate,
        dayOfWeek: deliveryData.dayOfWeek,
        meals: deliveryData.meals,
        deliveryStatus: deliveryData.deliveryStatus,
        deliveredAt: deliveryData.deliveredAt,
        deliveryNotes: deliveryData.deliveryNotes,
        total
      };
      
      const docRef = await addDoc(deliveriesRef, newDelivery);
      
      // Update subscription's lastDeliveredAt if delivered
      if (deliveryData.deliveryStatus === 'delivered') {
        const subscriptionRef = doc(db, 'subscriptions', subscriptionId);
        await updateDoc(subscriptionRef, {
          lastDeliveredAt: deliveryData.deliveredAt || now
        });
      }
      
      const createdDelivery: SubscriptionDelivery = {
        id: docRef.id,
        ...newDelivery
      };
      
      return { success: true, data: createdDelivery };
    } catch (error) {
      console.error('Error recording delivery:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to record delivery' 
      };
    }
  },

  // ========== GET DELIVERY HISTORY ==========
  
  async getDeliveryHistory(
    subscriptionId: string,
    limitCount: number = 20
  ): Promise<{ success: boolean; data?: SubscriptionDelivery[]; error?: string }> {
    try {
      const deliveriesRef = collection(db, 'subscription_deliveries');
      const q = query(
        deliveriesRef,
        where('subscriptionId', '==', subscriptionId),
        orderBy('deliveryDate', 'desc'),
        limit(limitCount)
      );
      
      const querySnapshot = await getDocs(q);
      const deliveries: SubscriptionDelivery[] = querySnapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data() as Omit<SubscriptionDelivery, 'id'>
      }));
      
      return { success: true, data: deliveries };
    } catch (error) {
      console.error('Error getting delivery history:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get delivery history' 
      };
    }
  }
};