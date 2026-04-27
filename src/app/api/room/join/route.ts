import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp } from '@/lib/firebaseAdmin';

export async function POST(request: NextRequest) {
  try {
    const { adminAuth, adminDb } = getAdminApp();
    if (!adminAuth || !adminDb) {
      return NextResponse.json({ error: 'Firebase Admin not configured' }, { status: 500 });
    }

    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    let userId: string;
    try {
      const decodedToken = await adminAuth.verifyIdToken(token);
      userId = decodedToken.uid;
    } catch (error) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Check if user already has a room
    const userDocRef = adminDb.collection('users').doc(userId);
    const userSnap = await userDocRef.get();
    if (userSnap.exists && userSnap.data()?.currentRoomId) {
      return NextResponse.json({ error: 'User already has a room' }, { status: 400 });
    }

    const body = await request.json();
    const { code } = body;

    if (!code || code.length !== 6) {
      return NextResponse.json({ error: 'Invalid room code' }, { status: 400 });
    }

    // Find room by code
    const querySnap = await adminDb.collection('rooms').where('code', '==', code.toUpperCase()).get();

    if (querySnap.empty) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    const roomDoc = querySnap.docs[0];
    const roomId = roomDoc.id;

    // Check if user is already a member
    const memberDoc = await adminDb.collection('rooms').doc(roomId).collection('members').doc(userId).get();

    if (memberDoc.exists) {
      return NextResponse.json({ error: 'You are already a member of this room' }, { status: 400 });
    }

    // Get user data
    const userData = userSnap.data();
    const userName = userData?.name || 'Roommate';
    const userPhotoURL = userData?.photoURL || null;

    // Add user as member
    await adminDb.collection('rooms').doc(roomId).collection('members').doc(userId).set({
      userId,
      role: 'member',
      displayName: userName,
      photoURL: userPhotoURL || null,
      joinedAt: new Date(),
    });

    // Update member count
    await adminDb.collection('rooms').doc(roomId).update({
      memberCount: (roomDoc.data().memberCount || 0) + 1,
    });

    // Update user's currentRoomId
    await userDocRef.update({
      currentRoomId: roomId,
    });

    return NextResponse.json({ roomId });
  } catch (error) {
    console.error('Error joining room:', error);
    return NextResponse.json({ error: 'Failed to join room' }, { status: 500 });
  }
}