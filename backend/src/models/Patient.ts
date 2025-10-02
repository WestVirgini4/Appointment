import { Timestamp } from 'firebase-admin/firestore';

export interface Patient {
  id?: string; // Firestore document ID
  hn: string;
  firstName: string; // Changed from first_name to camelCase
  lastName: string;  // Changed from last_name to camelCase
  dateOfBirth?: string; // Changed from date_of_birth to camelCase
  phone?: string;
  address?: string;
  createdAt?: Timestamp | string;
  updatedAt?: Timestamp | string;
}

export interface PatientSearchParams {
  q?: string;
  hn?: string;
  phone?: string;
  limit?: number;
  offset?: number;
}

export interface CreatePatientRequest {
  hn: string;
  firstName: string; // Changed to camelCase
  lastName: string;  // Changed to camelCase
  dateOfBirth?: string; // Changed to camelCase
  phone?: string;
  address?: string;
}

export interface UpdatePatientRequest {
  hn?: string;
  firstName?: string; // Changed to camelCase
  lastName?: string;  // Changed to camelCase
  dateOfBirth?: string; // Changed to camelCase
  phone?: string;
  address?: string;
}