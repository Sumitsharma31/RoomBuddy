import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp } from '@/lib/firebaseAdmin';

export async function POST(request: NextRequest) {
  try {
    const { adminApp } = getAdminApp();
    if (!adminApp) {
      return NextResponse.json({ error: 'Firebase Admin not configured' }, { status: 500 });
    }

    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    try {
      await adminApp.auth().verifyIdToken(token);
    } catch (error) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json();
    const { userIds, tokens, title, body: message, data } = body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ error: 'User IDs array is required' }, { status: 400 });
    }

    if (!title || !message) {
      return NextResponse.json({ error: 'Title and message are required' }, { status: 400 });
    }

    const admin = require('firebase-admin');
    const messaging = admin.messaging();

    // Save notifications to Firestore for each user
    const notificationPromises = userIds.map((uid: string) =>
      adminApp.firestore().collection('notifications').doc(uid).collection('items').add({
        type: data?.type || 'notification',
        message,
        roomId: data?.roomId || null,
        read: false,
        createdAt: new Date(),
        ...data,
      })
    );

    await Promise.all(notificationPromises);

    // Send FCM notifications if tokens are provided
    let fcmResults = [];
    if (tokens && Array.isArray(tokens) && tokens.length > 0) {
      // Build the message payload
      const messagePayload = {
        notification: {
          title,
          body: message,
        },
        data: data || {},
        tokens: tokens,
      };

      // Send multicast message to all tokens
      try {
        const response = await messaging.sendEachForMulticast(messagePayload);
        fcmResults = response.responses;
        console.log('FCM multicast send response:', response);
      } catch (error) {
        console.error('FCM send error:', error);
      }
    }

    return NextResponse.json({
      success: true,
      notifiedCount: userIds.length,
      fcmResults: fcmResults,
    });
  } catch (error) {
    console.error('Error sending notification:', error);
    return NextResponse.json({ error: 'Failed to send notification' }, { status: 500 });
  }
}
