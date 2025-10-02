import { Request, Response } from 'express';
import { FirestoreService } from '../services/firestore.js';
import { Patient, CreatePatientRequest, UpdatePatientRequest, PatientSearchParams } from '../models/Patient.js';

// Create Firestore service instance for patients
const patientService = new FirestoreService<Patient>('patients');

export class PatientController {
  // Get all patients with search functionality
  static async getAllPatients(req: Request, res: Response) {
    try {
      const { q, hn, phone, limit = 50, offset = 0 }: PatientSearchParams = req.query;

      let patients: Patient[] = [];

      if (q) {
        // Search by multiple fields (firstName, lastName, hn)
        const [firstNameResults, lastNameResults, hnResults] = await Promise.all([
          patientService.search('firstName', q as string),
          patientService.search('lastName', q as string),
          patientService.search('hn', q as string)
        ]);

        // Combine and deduplicate results
        const allResults = [...firstNameResults, ...lastNameResults, ...hnResults];
        const uniqueResults = allResults.filter((patient, index, self) =>
          index === self.findIndex(p => p.id === patient.id)
        );
        patients = uniqueResults;
      } else if (hn) {
        patients = await patientService.query('hn', '>=', hn);
      } else if (phone) {
        patients = await patientService.query('phone', '>=', phone);
      } else {
        patients = await patientService.getAll();
      }

      // Sort by createdAt (newest first)
      patients.sort((a, b) => {
        const aTime = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
        const bTime = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
        return bTime - aTime;
      });

      // Apply pagination
      const startIndex = Number(offset);
      const endIndex = startIndex + Number(limit);
      const paginatedPatients = patients.slice(startIndex, endIndex);

      res.json({
        patients: paginatedPatients,
        total: patients.length,
        page: Math.floor(Number(offset) / Number(limit)) + 1,
        totalPages: Math.ceil(patients.length / Number(limit))
      });
    } catch (error) {
      console.error('Error getting patients:', error);
      res.status(500).json({ error: 'Firestore error' });
    }
  }

  // Get patient by ID
  static async getPatientById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const patient = await patientService.getById(id);

      if (!patient) {
        return res.status(404).json({ error: 'Patient not found' });
      }
      res.json(patient);
    } catch (error) {
      console.error('Error getting patient:', error);
      res.status(500).json({ error: 'Firestore error' });
    }
  }

  // Create new patient
  static async createPatient(req: Request, res: Response) {
    try {
      const { hn, firstName, lastName, dateOfBirth = '', phone = '', address = '' }: CreatePatientRequest = req.body;

      // Validate required fields
      if (!hn || !firstName || !lastName) {
        return res.status(400).json({ error: 'Hospital Number (HN), first name, and last name are required' });
      }

      // Check if HN already exists
      const existingPatients = await patientService.query('hn', '==', hn);
      if (existingPatients.length > 0) {
        return res.status(400).json({ error: 'Patient with this HN already exists' });
      }

      // Create new patient
      const patientData: any = {
        hn,
        firstName,
        lastName
      };

      // Only add optional fields if they have values
      if (dateOfBirth && dateOfBirth.trim()) {
        patientData.dateOfBirth = dateOfBirth.trim();
      }
      if (phone && phone.trim()) {
        patientData.phone = phone.trim();
      }
      if (address && address.trim()) {
        patientData.address = address.trim();
      }

      const result = await patientService.create(patientData);

      res.status(201).json(result.data);
    } catch (error: any) {
      console.error('Error creating patient:', error);
      res.status(500).json({ error: 'Firestore error' });
    }
  }

  // Update patient
  static async updatePatient(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { hn, firstName, lastName, dateOfBirth = '', phone = '', address = '' }: UpdatePatientRequest = req.body;

      // Check if patient exists
      const existingPatient = await patientService.getById(id);
      if (!existingPatient) {
        return res.status(404).json({ error: 'Patient not found' });
      }

      // Check if HN already exists (if HN is being updated)
      if (hn && hn !== existingPatient.hn) {
        const existingHN = await patientService.query('hn', '==', hn);
        if (existingHN.length > 0) {
          return res.status(400).json({ error: 'Patient with this HN already exists' });
        }
      }

      // Prepare update data (only include fields that have values)
      const updateData: any = {};
      if (hn && hn.trim()) updateData.hn = hn.trim();
      if (firstName && firstName.trim()) updateData.firstName = firstName.trim();
      if (lastName && lastName.trim()) updateData.lastName = lastName.trim();
      if (dateOfBirth && dateOfBirth.trim()) updateData.dateOfBirth = dateOfBirth.trim();
      if (phone && phone.trim()) updateData.phone = phone.trim();
      if (address && address.trim()) updateData.address = address.trim();

      // Update patient
      const updatedPatient = await patientService.update(id, updateData);

      if (!updatedPatient) {
        return res.status(404).json({ error: 'Failed to update patient' });
      }

      res.json(updatedPatient);
    } catch (error: any) {
      console.error('Error updating patient:', error);
      res.status(500).json({ error: 'Firestore error' });
    }
  }

  // Delete patient
  static async deletePatient(req: Request, res: Response) {
    try {
      const { id } = req.params;

      // Check if patient exists
      const existingPatient = await patientService.getById(id);
      if (!existingPatient) {
        return res.status(404).json({ error: 'Patient not found' });
      }

      // Check for existing appointments using Firestore query
      const { FirestoreService } = await import('../services/firestore.js');
      const appointmentService = new FirestoreService('appointments');
      const existingAppointments = await appointmentService.query('patientId', '==', id);

      if (existingAppointments.length > 0) {
        return res.status(400).json({
          error: 'Cannot delete patient with existing appointments',
          appointmentCount: existingAppointments.length
        });
      }

      // Delete patient
      const deleted = await patientService.delete(id);

      if (!deleted) {
        return res.status(404).json({ error: 'Failed to delete patient' });
      }

      res.json({ message: 'Patient deleted successfully' });
    } catch (error) {
      console.error('Error deleting patient:', error);
      res.status(500).json({ error: 'Firestore error' });
    }
  }

  // Search patients (same as getAllPatients with q parameter)
  static async searchPatients(req: Request, res: Response) {
    try {
      const { q } = req.query;

      if (!q) {
        return res.status(400).json({ error: 'Search query is required' });
      }

      // Search by multiple fields (firstName, lastName, hn, phone)
      const [firstNameResults, lastNameResults, hnResults, phoneResults] = await Promise.all([
        patientService.search('firstName', q as string),
        patientService.search('lastName', q as string),
        patientService.search('hn', q as string),
        patientService.search('phone', q as string)
      ]);

      // Combine and deduplicate results
      const allResults = [...firstNameResults, ...lastNameResults, ...hnResults, ...phoneResults];
      const uniqueResults = allResults.filter((patient, index, self) =>
        index === self.findIndex(p => p.id === patient.id)
      );

      // Sort by createdAt (newest first) and limit to 20
      const sortedResults = uniqueResults
        .sort((a, b) => {
          const aTime = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
          const bTime = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
          return bTime - aTime;
        })
        .slice(0, 20);

      res.json({ patients: sortedResults, total: sortedResults.length });
    } catch (error) {
      console.error('Error searching patients:', error);
      res.status(500).json({ error: 'Firestore error' });
    }
  }
}

