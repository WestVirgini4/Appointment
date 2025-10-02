import { Request, Response } from 'express';
import { FirestoreService } from '../services/firestore.js';
import {
  Appointment,
  CreateAppointmentRequest,
  UpdateAppointmentRequest,
  AppointmentSearchParams,
  AppointmentCalendarEvent
} from '../models/Appointment.js';
import { Patient } from '../models/Patient.js';

// Create Firestore service instances
const appointmentService = new FirestoreService<Appointment>('appointments');
const patientService = new FirestoreService<Patient>('patients');

export class AppointmentController {
  // Get all appointments with search and join patient data
  static async getAllAppointments(req: Request, res: Response) {
    try {
      const { date, doctorName, status, patientId, limit = 100, offset = 0 }: AppointmentSearchParams = req.query;

      let appointments: Appointment[] = [];

      // Apply filters
      if (date) {
        appointments = await appointmentService.query('appointmentDate', '==', date);
      } else if (doctorName) {
        appointments = await appointmentService.search('doctorName', doctorName as string);
      } else if (status) {
        appointments = await appointmentService.query('status', '==', status);
      } else if (patientId) {
        appointments = await appointmentService.query('patientId', '==', patientId);
      } else {
        appointments = await appointmentService.getAll();
      }

      // Join with patient data
      const appointmentsWithPatients = await Promise.all(
        appointments.map(async (appointment) => {
          const patient = await patientService.getById(appointment.patientId);
          return {
            ...appointment,
            patient: patient ? {
              hn: patient.hn,
              firstName: patient.firstName,
              lastName: patient.lastName,
              phone: patient.phone
            } : undefined
          };
        })
      );

      // Sort by appointment date and time (newest first)
      appointmentsWithPatients.sort((a, b) => {
        const dateA = new Date(`${a.appointmentDate} ${a.appointmentTime}`);
        const dateB = new Date(`${b.appointmentDate} ${b.appointmentTime}`);
        return dateB.getTime() - dateA.getTime();
      });

      // Apply pagination
      const startIndex = Number(offset);
      const endIndex = startIndex + Number(limit);
      const paginatedAppointments = appointmentsWithPatients.slice(startIndex, endIndex);

      res.json({
        appointments: paginatedAppointments,
        total: appointmentsWithPatients.length,
        page: Math.floor(Number(offset) / Number(limit)) + 1,
        totalPages: Math.ceil(appointmentsWithPatients.length / Number(limit))
      });
    } catch (error) {
      console.error('Error getting appointments:', error);
      res.status(500).json({ error: 'Firestore error' });
    }
  }

  // Get appointment by ID
  static async getAppointmentById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const appointment = await appointmentService.getById(id);

      if (!appointment) {
        return res.status(404).json({ error: 'Appointment not found' });
      }

      // Join with patient data
      const patient = await patientService.getById(appointment.patientId);
      const appointmentWithPatient = {
        ...appointment,
        patient: patient ? {
          hn: patient.hn,
          firstName: patient.firstName,
          lastName: patient.lastName,
          phone: patient.phone
        } : undefined
      };

      res.json(appointmentWithPatient);
    } catch (error) {
      console.error('Error getting appointment:', error);
      res.status(500).json({ error: 'Firestore error' });
    }
  }

  // Create new appointment
  static async createAppointment(req: Request, res: Response) {
    try {
      const { patientId, doctorName, appointmentDate, appointmentTime, endTime, notes = '' }: CreateAppointmentRequest = req.body;
      console.log('Received appointment data:', JSON.stringify(req.body, null, 2));

      // Validate required fields
      if (!patientId || !doctorName || !appointmentDate || !appointmentTime || !endTime) {
        return res.status(400).json({
          error: 'Patient ID, doctor name, appointment date, start time, and end time are required'
        });
      }

      // Check if patient exists
      const patient = await patientService.getById(patientId);
      if (!patient) {
        return res.status(400).json({ error: 'Patient not found' });
      }

      // Check for time conflicts
      const existingAppointments = await appointmentService.query('appointmentDate', '==', appointmentDate);
      const timeConflicts = existingAppointments.filter(apt => {
        const startA = new Date(`${appointmentDate} ${appointmentTime}`);
        const endA = new Date(`${appointmentDate} ${endTime}`);
        const startB = new Date(`${apt.appointmentDate} ${apt.appointmentTime}`);
        const endB = new Date(`${apt.appointmentDate} ${apt.endTime}`);

        return (startA < endB && endA > startB);
      });

      if (timeConflicts.length > 0) {
        return res.status(400).json({
          error: 'Time slot conflicts with existing appointment',
          conflictingAppointments: timeConflicts.map(apt => ({
            id: apt.id,
            time: `${apt.appointmentTime} - ${apt.endTime}`,
            doctor: apt.doctorName
          }))
        });
      }

      // Create appointment with denormalized patient data
      const appointmentData: any = {
        patientId,
        patientHN: patient.hn,
        patientName: `${patient.firstName} ${patient.lastName}`,
        doctorName,
        appointmentDate,
        appointmentTime,
        endTime,
        status: 'scheduled'
      };

      // Add notes only if it has a value
      if (notes && notes.trim()) {
        appointmentData.notes = notes.trim();
      }

      // Remove any undefined values
      const cleanedData = Object.fromEntries(
        Object.entries(appointmentData).filter(([_, value]) => value !== undefined)
      );

      console.log('Final appointment data for Firestore:', JSON.stringify(cleanedData, null, 2));
      const result = await appointmentService.create(cleanedData);

      // Return appointment with patient data
      const appointmentWithPatient = {
        ...result.data,
        patient: {
          hn: patient.hn,
          firstName: patient.firstName,
          lastName: patient.lastName,
          phone: patient.phone
        }
      };

      res.status(201).json(appointmentWithPatient);
    } catch (error) {
      console.error('Error creating appointment:', error);
      res.status(500).json({ error: 'Firestore error' });
    }
  }

  // Update appointment
  static async updateAppointment(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { doctorName, appointmentDate, appointmentTime, endTime, status, notes }: UpdateAppointmentRequest = req.body;

      // Check if appointment exists
      const existingAppointment = await appointmentService.getById(id);
      if (!existingAppointment) {
        return res.status(404).json({ error: 'Appointment not found' });
      }

      // Prepare update data
      const updateData: Partial<Appointment> = {};
      if (doctorName !== undefined) updateData.doctorName = doctorName;
      if (appointmentDate !== undefined) updateData.appointmentDate = appointmentDate;
      if (appointmentTime !== undefined) updateData.appointmentTime = appointmentTime;
      if (endTime !== undefined) updateData.endTime = endTime;
      if (status !== undefined) updateData.status = status;
      if (notes !== undefined && notes.trim()) updateData.notes = notes.trim();

      // Check for time conflicts if date/time is being updated
      if (appointmentDate || appointmentTime || endTime) {
        const checkDate = appointmentDate || existingAppointment.appointmentDate;
        const checkStartTime = appointmentTime || existingAppointment.appointmentTime;
        const checkEndTime = endTime || existingAppointment.endTime;

        const existingAppointments = await appointmentService.query('appointmentDate', '==', checkDate);
        const timeConflicts = existingAppointments.filter(apt => {
          if (apt.id === id) return false; // Exclude current appointment

          const startA = new Date(`${checkDate} ${checkStartTime}`);
          const endA = new Date(`${checkDate} ${checkEndTime}`);
          const startB = new Date(`${apt.appointmentDate} ${apt.appointmentTime}`);
          const endB = new Date(`${apt.appointmentDate} ${apt.endTime}`);

          return (startA < endB && endA > startB);
        });

        if (timeConflicts.length > 0) {
          return res.status(400).json({
            error: 'Time slot conflicts with existing appointment',
            conflictingAppointments: timeConflicts.map(apt => ({
              id: apt.id,
              time: `${apt.appointmentTime} - ${apt.endTime}`,
              doctor: apt.doctorName
            }))
          });
        }
      }

      // Update appointment
      const updatedAppointment = await appointmentService.update(id, updateData);

      if (!updatedAppointment) {
        return res.status(404).json({ error: 'Failed to update appointment' });
      }

      // Join with patient data
      const patient = await patientService.getById(updatedAppointment.patientId);
      const appointmentWithPatient = {
        ...updatedAppointment,
        patient: patient ? {
          hn: patient.hn,
          firstName: patient.firstName,
          lastName: patient.lastName,
          phone: patient.phone
        } : undefined
      };

      res.json(appointmentWithPatient);
    } catch (error) {
      console.error('Error updating appointment:', error);
      res.status(500).json({ error: 'Firestore error' });
    }
  }

  // Delete appointment
  static async deleteAppointment(req: Request, res: Response) {
    try {
      const { id } = req.params;

      // Check if appointment exists
      const existingAppointment = await appointmentService.getById(id);
      if (!existingAppointment) {
        return res.status(404).json({ error: 'Appointment not found' });
      }

      // Delete appointment
      const deleted = await appointmentService.delete(id);

      if (!deleted) {
        return res.status(404).json({ error: 'Failed to delete appointment' });
      }

      res.json({ message: 'Appointment deleted successfully' });
    } catch (error) {
      console.error('Error deleting appointment:', error);
      res.status(500).json({ error: 'Firestore error' });
    }
  }

  // Get appointments by date
  static async getAppointmentsByDate(req: Request, res: Response) {
    try {
      const { date } = req.params;

      if (!date) {
        return res.status(400).json({ error: 'Date parameter is required' });
      }

      const appointments = await appointmentService.query('appointmentDate', '==', date);

      // Join with patient data
      const appointmentsWithPatients = await Promise.all(
        appointments.map(async (appointment) => {
          const patient = await patientService.getById(appointment.patientId);
          return {
            ...appointment,
            patient: patient ? {
              hn: patient.hn,
              firstName: patient.firstName,
              lastName: patient.lastName,
              phone: patient.phone
            } : undefined
          };
        })
      );

      // Sort by appointment time
      appointmentsWithPatients.sort((a, b) => {
        const timeA = new Date(`${date} ${a.appointmentTime}`);
        const timeB = new Date(`${date} ${b.appointmentTime}`);
        return timeA.getTime() - timeB.getTime();
      });

      res.json({
        appointments: appointmentsWithPatients,
        date,
        total: appointmentsWithPatients.length
      });
    } catch (error) {
      console.error('Error getting appointments by date:', error);
      res.status(500).json({ error: 'Firestore error' });
    }
  }

  // Get calendar events (formatted for FullCalendar)
  static async getCalendarEvents(req: Request, res: Response) {
    try {
      const { start, end } = req.query;

      let appointments: Appointment[] = [];

      if (start && end) {
        // Get appointments in date range
        const allAppointments = await appointmentService.getAll();
        appointments = allAppointments.filter(apt => {
          const aptDate = new Date(apt.appointmentDate);
          const startDate = new Date(start as string);
          const endDate = new Date(end as string);
          return aptDate >= startDate && aptDate <= endDate;
        });
      } else {
        appointments = await appointmentService.getAll();
      }

      // Transform to calendar events
      const events: AppointmentCalendarEvent[] = await Promise.all(
        appointments.map(async (appointment) => {
          const patient = await patientService.getById(appointment.patientId);

          // Status color mapping
          const getStatusColor = (status: string) => {
            switch (status) {
              case 'scheduled': return '#3788d8';
              case 'confirmed': return '#28a745';
              case 'completed': return '#6c757d';
              case 'cancelled': return '#dc3545';
              case 'no-show': return '#fd7e14';
              default: return '#3788d8';
            }
          };

          return {
            id: appointment.id || '',
            title: `${appointment.doctorName} - ${patient?.firstName} ${patient?.lastName}`,
            start: `${appointment.appointmentDate}T${appointment.appointmentTime}`,
            end: `${appointment.appointmentDate}T${appointment.endTime}`,
            backgroundColor: getStatusColor(appointment.status),
            borderColor: getStatusColor(appointment.status),
            extendedProps: {
              patientHN: patient?.hn || '',
              patientName: `${patient?.firstName} ${patient?.lastName}`,
              doctorName: appointment.doctorName,
              status: appointment.status,
              notes: appointment.notes,
              phone: patient?.phone
            }
          };
        })
      );

      res.json(events);
    } catch (error) {
      console.error('Error getting calendar events:', error);
      res.status(500).json({ error: 'Firestore error' });
    }
  }
}