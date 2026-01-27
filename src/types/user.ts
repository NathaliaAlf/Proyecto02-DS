export type UserType = 'customer' | 'restaurant';

export interface BaseUser {
  id: string;
  uid: string;
  email: string;
  name: string;
  picture?: string;
  provider: string;
  userType: UserType;
  emailVerified: boolean;
  lastLogin: string;
  loginSource: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerUser extends BaseUser {
  userType: 'customer';
  phone?: string;
  address?: string;
}

export interface RestaurantUser extends BaseUser {
  userType: 'restaurant';
  restaurantId?: string; // Reference to restaurant document
}

export type User = CustomerUser | RestaurantUser;

export interface UserCreateDTO {
  uid: string;
  email: string;
  name: string;
  picture?: string;
  provider: string;
  userType: UserType;
  emailVerified?: boolean;
  loginSource?: string;
}

export interface UserUpdateDTO {
  name?: string;
  picture?: string;
  lastLogin?: string;
  loginSource?: string;
}

