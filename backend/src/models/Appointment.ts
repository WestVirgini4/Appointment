import { Timestamp } from 'firebase-admin/firestore';

export interface Appointment {
  id?: string; // Firestore document ID
  patientId: string; // Reference to patient document ID
  patientHN?: string; // Denormalized for easier queries
  patientName?: string; // Denormalized patient name
  doctorName: string; // Changed from doctor_name to camelCase
  appointmentDate: string; // Changed from appointment_date to camelCase
  appointmentTime: string; // Changed from appointment_time to camelCase
  endTime: string; // Changed from end_time to camelCase
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no-show';
  notes?: string;
  createdAt?: Timestamp | string;
  updatedAt?: Timestamp | string;
  // Optional: Include patient data for joined queries
  patient?: {
    hn: string;
    firstName: string; // Changed to camelCase
    lastName: string;  // Changed to camelCase
    phone?: string;
  };
}

export interface AppointmentSearchParams {
  date?: string;
  doctorName?: string; // Changed to camelCase
  status?: string;
  patientId?: string; // Changed to string for Firestore
  limit?: number;
  offset?: number;
}

export interface CreateAppointmentRequest {
  patientId: string; // Changed to string for Firestore
  doctorName: string; // Changed to camelCase
  appointmentDate: string; // Changed to camelCase
  appointmentTime: string; // Changed to camelCase
  endTime: string; // Changed to camelCase
  notes?: string;
}

export interface UpdateAppointmentRequest {
  doctorName?: string; // Changed to camelCase
  appointmentDate?: string; // Changed to camelCase
  appointmentTime?: string; // Changed to camelCase
  endTime?: string; // Changed to camelCase
  status?: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no-show';
  notes?: string;
}

export interface AppointmentCalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  backgroundColor?: string;
  borderColor?: string;
  extendedProps?: {
    patientHN: string;
    patientName: string;
    doctorName: string;
    status: string;
    notes?: string;
    phone?: string;
  };
}