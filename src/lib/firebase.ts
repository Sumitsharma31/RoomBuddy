"use client";

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { initializeFirestore, getFirestore, Firestore, terminate } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import type { Messaging } from 'firebase/messaging';
import type { Analytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Check if keys are missing or placeholders
const isConfigValid = firebaseConfig.apiKey && firebaseConfig.apiKey !== 'your_api_key_here';

let firebaseApp: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;
let messaging: Messaging;
let analytics: Analytics;

if (isConfigValid) {
  if (!getApps().length) {
    firebaseApp = initializeApp(firebaseConfig);
  } else {
    firebaseApp = getApps()[0];
  }

  auth = getAuth(firebaseApp);
  
  // Use initializeFirestore with settings to help with "offline" issues
  try {
    db = initializeFirestore(firebaseApp, {
      experimentalForceLongPolling: true,
    });
  } catch (e) {
    db = getFirestore(firebaseApp);
  }
  
  storage = getStorage(firebaseApp);
  
  // Initialize messaging and analytics only on client side with support check
  if (typeof window !== 'undefined') {
    import('firebase/messaging').then(({ getMessaging, isSupported }) => {
      isSupported().then(supported => {
        if (supported) {
          try {
            messaging = getMessaging(firebaseApp);
          } catch (e) {
            console.warn("Firebase Messaging initialization failed:", e);
          }
        }
      });
    }).catch(err => console.warn("Failed to load Firebase Messaging:", err));

    import('firebase/analytics').then(({ getAnalytics, isSupported }) => {
      isSupported().then(supported => {
        if (supported) {
          try {
            analytics = getAnalytics(firebaseApp);
          } catch (e) {
            console.warn("Firebase Analytics initialization failed:", e);
          }
        }
      });
    }).catch(err => console.warn("Failed to load Firebase Analytics:", err));
  }
} else {
  console.error("Firebase configuration is missing or invalid. Please check your .env.local file.");
  // Provide mock objects to prevent immediate crashes in components
  auth = {} as Auth;
  db = {} as Firestore;
  storage = {} as FirebaseStorage;
  messaging = {} as Messaging;
}

export { firebaseApp, auth, db, storage, messaging, analytics };
