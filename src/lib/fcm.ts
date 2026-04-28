import { messaging, isSupported } from './firebase';
import { getToken, onMessage, MessagePayload } from 'firebase/messaging';
import { db } from './firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Platform } from '@capacitor/core';

// Get FCM token for current user
export async function getFCMToken(): Promise<string | null> {
  if (!messaging) return null;
  try {
    // Request permission for web
    const permission = await requestNotificationPermission();
    if (!permission) return null;

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
    if (typeof Notification === 'undefined') return false;
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return false;
  }
}

// Listen for incoming messages (web only)
export function onMessageListener(callback: (payload: MessagePayload) => void) {
  if (!messaging) return null;
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

// Initialize FCM for Capacitor (mobile) and web
export async function initializeFCM(): Promise<string | null> {
  const isMobile = Platform.is('android') || Platform.is('ios');

  // For web, request permission and get token
  if (!isMobile) {
    const permission = await requestNotificationPermission();
    if (permission) {
      const token = await getFCMToken();
      return token;
    }
    return null;
  }

  // For mobile (Capacitor), the Capacitor Push Notifications plugin
  // handles FCM token registration automatically
  // You should register for push notifications via Capacitor API
  return null;
}

// Register for push notifications (Capacitor)
export async function registerPushNotifications(): Promise<void> {
  const isMobile = Platform.is('android') || Platform.is('ios');

  if (!isMobile) return;

  try {
    // Import Capacitor PushNotifications dynamically
    const { PushNotifications } = await import('@capacitor/push-notifications');

    // Request permission for Android 13+
    const permissionStatus = await PushNotifications.requestPermissions();

    if (permissionStatus.receive !== 'granted') {
      console.error('Push notification permission not granted');
      return;
    }

    // Register for push notifications
    await PushNotifications.register();

    // VERIFICATION: Get token directly for immediate check
    const tokenResult = await PushNotifications.getToken();
    console.log('=== Direct FCM Token Check:', tokenResult.value);

    // VERIFICATION: Listen for registration event to get FCM token
    // Remove this listener after verifying token is received
    PushNotifications.addListener('registration', (token) => {
      console.log('=== FCM Token from registration event:', token.value);
    });

    // Listen for push notification events
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('Push notification received:', notification);
    });

    PushNotifications.addListener('pushNotificationRegistrationFailed', (error) => {
      console.error('Push notification registration failed:', error);
    });
  } catch (error) {
    console.error('Error registering push notifications:', error);
  }
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
