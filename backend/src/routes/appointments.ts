import express from 'express';
import { AppointmentController } from '../controllers/appointmentController.js';

const router = express.Router();

// GET /api/appointments - Get all appointments with optional filters
router.get('/', AppointmentController.getAllAppointments);

// GET /api/appointments/calendar - Get appointments formatted for calendar
router.get('/calendar', AppointmentController.getCalendarEvents);

// GET /api/appointments/:id - Get appointment by ID
router.get('/:id', AppointmentController.getAppointmentById);

// POST /api/appointments - Create new appointment
router.post('/', AppointmentController.createAppointment);

// PUT /api/appointments/:id - Update appointment
router.put('/:id', AppointmentController.updateAppointment);

// DELETE /api/appointments/:id - Delete appointment
router.delete('/:id', AppointmentController.deleteAppointment);

export default router;