import { Timestamp } from 'firebase-admin/firestore';

export interface User {
  uid: string; // Firebase Auth UID
  email: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  role: 'admin' | 'doctor' | 'nurse' | 'staff';
  isActive: boolean;
  createdAt?: Timestamp | string;
  updatedAt?: Timestamp | string;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  role: 'admin' | 'doctor' | 'nurse' | 'staff';
}

export interface UpdateUserRequest {
  displayName?: string;
  firstName?: string;
  lastName?: string;
  role?: 'admin' | 'doctor' | 'nurse' | 'staff';
  isActive?: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  idToken: string;
  refreshToken: string;
  user: Omit<User, 'password'>;
}

export interface AuthenticatedUser {
  uid: string;
  email: string;
  displayName?: string;
  role: string;
  isActive: boolean;
}