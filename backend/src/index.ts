import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import './config/firebase.js'; // Initialize Firebase Admin SDK
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import patientRoutes from './routes/patients.js';
import appointmentRoutes from './routes/appointments.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Configure Express to handle UTF-8 encoding properly
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Set proper content type for UTF-8
app.use((_req: express.Request, res: express.Response, next: express.NextFunction) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  next();
});

// Request logging middleware
app.use((req: express.Request, _res: express.Response, next: express.NextFunction) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (_req: express.Request, res: express.Response) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'Hospital Appointment System API - Firebase Edition',
    database: 'Firestore',
    authentication: 'Firebase Auth'
  });
});

// API Routes
app.use('/api/patients', patientRoutes);
app.use('/api/appointments', appointmentRoutes);

// Root endpoint
app.get('/', (_req: express.Request, res: express.Response) => {
  res.json({
    message: 'Hospital Appointment System API',
    version: '1.0.0',
    endpoints: {
      patients: '/api/patients',
      appointments: '/api/appointments',
      health: '/health'
    },
    documentation: 'See README.md for API documentation'
  });
});

// Error handling middleware (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`
🏥 Hospital Appointment System API - Firebase Edition
📍 Server running on port ${PORT}
🔗 http://localhost:${PORT}
📊 Health check: http://localhost:${PORT}/health
📖 API Docs: http://localhost:${PORT}
🔥 Database: Firestore
🔐 Auth: Firebase Authentication
  `);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🔄 Gracefully shutting down...');
  process.exit(0);
});

export default app;