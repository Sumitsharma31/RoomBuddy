import * as admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';

// Initialize Firebase Admin only once
export function getAdminApp() {
  if (!admin.apps.length) {
    // Try to load from service-account.json file first (more reliable than env vars for JSON)
    const serviceAccountPath = path.join(process.cwd(), 'service-account.json');
    
    if (fs.existsSync(serviceAccountPath)) {
      try {
        const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
        console.log('Firebase Admin initialized successfully using service-account.json file');
      } catch (error) {
        console.error('Failed to initialize Firebase Admin from file:', error);
      }
    }

    // If still not initialized, try environment variables
    if (!admin.apps.length) {
      const serviceAccountVar = process.env.FIREBASE_SERVICE_ACCOUNT;
      
      if (serviceAccountVar) {
        try {
          const serviceAccount = JSON.parse(serviceAccountVar);
          admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
          });
          console.log('Firebase Admin initialized successfully using FIREBASE_SERVICE_ACCOUNT env var');
        } catch (error) {
          console.error('Failed to initialize Firebase Admin from JSON env var:', error);
        }
      }
    }

    // Last resort: individual env vars
    if (!admin.apps.length) {
      const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
      const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
      const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

      if (privateKey && clientEmail) {
        try {
          admin.initializeApp({
            credential: admin.credential.cert({
              projectId,
              clientEmail,
              privateKey: privateKey.replace(/\\n/g, '\n'),
            }),
          });
          console.log('Firebase Admin initialized successfully using individual env vars');
        } catch (error) {
          console.error('Failed to initialize Firebase Admin from individual vars:', error);
        }
      }
    }

    if (!admin.apps.length) {
      console.error('Firebase Admin credentials missing or invalid in all locations (file, JSON env var, individual env vars)');
    }
  }

  return {
    adminApp: admin.apps[0],
    adminDb: admin.apps.length ? admin.firestore() : null,
    adminAuth: admin.apps.length ? admin.auth() : null,
  };
}
