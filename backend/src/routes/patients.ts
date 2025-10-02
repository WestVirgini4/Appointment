import express from 'express';
import { PatientController } from '../controllers/patientController.js';

const router = express.Router();

// GET /api/patients - Get all patients with optional search
router.get('/', PatientController.getAllPatients);

// GET /api/patients/:id - Get patient by ID
router.get('/:id', PatientController.getPatientById);

// POST /api/patients - Create new patient
router.post('/', PatientController.createPatient);

// PUT /api/patients/:id - Update patient
router.put('/:id', PatientController.updatePatient);

// DELETE /api/patients/:id - Delete patient
router.delete('/:id', PatientController.deletePatient);

export default router;