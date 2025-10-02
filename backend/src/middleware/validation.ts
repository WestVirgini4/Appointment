import { Request, Response, NextFunction } from 'express';

export const validatePatient = (req: Request, res: Response, next: NextFunction) => {
  const { hn, first_name, last_name } = req.body;

  const errors: string[] = [];

  if (!hn || typeof hn !== 'string' || hn.trim().length === 0) {
    errors.push('HN is required and must be a non-empty string');
  }

  if (!first_name || typeof first_name !== 'string' || first_name.trim().length === 0) {
    errors.push('First name is required and must be a non-empty string');
  }

  if (!last_name || typeof last_name !== 'string' || last_name.trim().length === 0) {
    errors.push('Last name is required and must be a non-empty string');
  }

  // Validate HN format (example: alphanumeric, 6-20 characters)
  if (hn && !/^[a-zA-Z0-9]{6,20}$/.test(hn)) {
    errors.push('HN must be 6-20 alphanumeric characters');
  }

  // Validate date format if provided
  if (req.body.date_of_birth && !/^\d{4}-\d{2}-\d{2}$/.test(req.body.date_of_birth)) {
    errors.push('Date of birth must be in YYYY-MM-DD format');
  }

  // Validate phone format if provided
  if (req.body.phone && !/^[\d\-\+\(\)\s]{8,15}$/.test(req.body.phone)) {
    errors.push('Phone number format is invalid');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors
    });
  }

  next();
};

export const validateAppointment = (req: Request, res: Response, next: NextFunction) => {
  const { patient_id, doctor_name, appointment_date, appointment_time, end_time } = req.body;

  const errors: string[] = [];

  if (!patient_id || !Number.isInteger(Number(patient_id))) {
    errors.push('Patient ID is required and must be a valid integer');
  }

  if (!doctor_name || typeof doctor_name !== 'string' || doctor_name.trim().length === 0) {
    errors.push('Doctor name is required and must be a non-empty string');
  }

  if (!appointment_date || !/^\d{4}-\d{2}-\d{2}$/.test(appointment_date)) {
    errors.push('Appointment date is required and must be in YYYY-MM-DD format');
  }

  if (!appointment_time || !/^\d{2}:\d{2}$/.test(appointment_time)) {
    errors.push('Appointment time is required and must be in HH:MM format');
  }

  if (!end_time || !/^\d{2}:\d{2}$/.test(end_time)) {
    errors.push('End time is required and must be in HH:MM format');
  }

  // Validate that end_time is after appointment_time
  if (appointment_time && end_time) {
    const startMinutes = timeToMinutes(appointment_time);
    const endMinutes = timeToMinutes(end_time);

    if (endMinutes <= startMinutes) {
      errors.push('End time must be after appointment time');
    }
  }

  // Validate date is not in the past
  if (appointment_date) {
    const appointmentDate = new Date(appointment_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (appointmentDate < today) {
      errors.push('Appointment date cannot be in the past');
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors
    });
  }

  next();
};

export const validateAppointmentUpdate = (req: Request, res: Response, next: NextFunction) => {
  const { appointment_date, appointment_time, end_time, status } = req.body;

  const errors: string[] = [];

  // Validate date format if provided
  if (appointment_date && !/^\d{4}-\d{2}-\d{2}$/.test(appointment_date)) {
    errors.push('Appointment date must be in YYYY-MM-DD format');
  }

  // Validate time format if provided
  if (appointment_time && !/^\d{2}:\d{2}$/.test(appointment_time)) {
    errors.push('Appointment time must be in HH:MM format');
  }

  if (end_time && !/^\d{2}:\d{2}$/.test(end_time)) {
    errors.push('End time must be in HH:MM format');
  }

  // Validate status if provided
  const validStatuses = ['scheduled', 'confirmed', 'completed', 'cancelled', 'no-show'];
  if (status && !validStatuses.includes(status)) {
    errors.push(`Status must be one of: ${validStatuses.join(', ')}`);
  }

  // Validate that end_time is after appointment_time if both provided
  if (appointment_time && end_time) {
    const startMinutes = timeToMinutes(appointment_time);
    const endMinutes = timeToMinutes(end_time);

    if (endMinutes <= startMinutes) {
      errors.push('End time must be after appointment time');
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors
    });
  }

  next();
};

// Helper function to convert time string to minutes
const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};