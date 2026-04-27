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

    const body = await request.json();
    const { roomId } = body;

    if (!roomId) {
      return NextResponse.json({ error: 'Room ID is required' }, { status: 400 });
    }

    const roomRef = adminDb.collection('rooms').doc(roomId);
    const roomSnap = await roomRef.get();

    if (!roomSnap.exists) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    const roomData = roomSnap.data();
    if (!roomData) {
      return NextResponse.json({ error: 'Room data not found' }, { status: 404 });
    }

    if (roomData.adminId === userId) {
      return NextResponse.json({ error: 'Admin must transfer ownership before leaving' }, { status: 400 });
    }

    // Remove member and update user
    await adminDb.runTransaction(async (transaction) => {
      transaction.delete(roomRef.collection('members').doc(userId));
      transaction.update(adminDb.collection('users').doc(userId), { currentRoomId: null });
      transaction.update(roomRef, { memberCount: (roomData.memberCount || 1) - 1 });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error leaving room:', error);
    return NextResponse.json({ error: 'Failed to leave room' }, { status: 500 });
  }
}