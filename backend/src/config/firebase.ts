import admin from 'firebase-admin';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  try {
    // Try to load service account key
    const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccountPath),
      // Optional: Add your Firebase project ID
      // projectId: 'your-project-id'
    });

    console.log('✅ Firebase Admin SDK initialized successfully');
  } catch (error) {
    console.error('❌ Firebase Admin SDK initialization failed:', error);
    console.log('📋 Please ensure serviceAccountKey.json exists in src/config/');
    console.log('📋 Download it from Firebase Console → Project Settings → Service accounts');
    process.exit(1);
  }
}

// Export Firestore instance with settings to ignore undefined properties
export const db = admin.firestore();
db.settings({ ignoreUndefinedProperties: true });

// Export Firebase Auth
export const auth = admin.auth();

// Export Firebase Admin for other uses
export default admin;