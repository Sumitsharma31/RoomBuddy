import { messaging } from './firebase';
import { getToken, onMessage, MessagePayload } from 'firebase/messaging';
import { db } from './firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

// Get FCM token for current user
export async function getFCMToken(): Promise<string | null> {
  if (!messaging) return null;
  try {
    const token = await getToken(messaging, {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
    });
    return token;
  } catch (error) {
    console.error('Error getting FCM token:', error);
    return null;
  }
}

// Request notification permission
export async function requestNotificationPermission(): Promise<boolean> {
  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return false;
  }
}

// Listen for incoming messages
export function onMessageListener(callback: (payload: MessagePayload) => void) {
  return onMessage(messaging, (payload) => {
    callback(payload);
  });
}

// Save notification to Firestore
export async function saveNotification(userId: string, notification: {
  type: string;
  message: string;
  roomId: string;
  data?: Record<string, string>;
}): Promise<string> {
  const notifDoc = await addDoc(collection(db, 'notifications', userId, 'items'), {
    type: notification.type,
    message: notification.message,
    roomId: notification.roomId,
    read: false,
    createdAt: serverTimestamp(),
    ...notification.data,
  });
  return notifDoc.id;
}

// Initialize FCM for Capacitor (mobile)
export async function initializeFCM(): Promise<string | null> {
  // For web
  const permission = await requestNotificationPermission();
  if (permission) {
    const token = await getFCMToken();
    return token;
  }
  return null;
}

// Send notification via API (called from server-side)
export interface NotificationData {
  userIds: string[];
  title: string;
  body: string;
  data?: Record<string, string>;
}

export async function sendNotification(data: NotificationData): Promise<void> {
  // This function is typically called from an API route with Firebase Admin SDK
  // For client-side, we'd call a server endpoint
  console.log('Send notification:', data);
}