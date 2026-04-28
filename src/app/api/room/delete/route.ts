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

    // Check if user is admin
    if (roomData.adminId !== userId) {
      return NextResponse.json({ error: 'Only admin can delete room' }, { status: 403 });
    }

    // Check if room has only one member (admin)
    const membersSnap = await roomRef.collection('members').get();
    const memberCount = membersSnap.size;

    if (memberCount === 1) {
      // Single-member room: delete immediately
      await adminDb.runTransaction(async (transaction) => {
        // Clear currentRoomId for the admin
        transaction.update(adminDb.collection('users').doc(userId), { currentRoomId: null });
        transaction.delete(roomRef);
      });
      return NextResponse.json({ success: true });
    }

    // Multi-member room: check deletionRequest
    const delRequestRef = roomRef.collection('deletionRequest').doc('current');
    const delSnap = await delRequestRef.get();
    const delData = delSnap.data();

    if (!delSnap.exists || !delData || delData.status !== 'approved') {
      return NextResponse.json({ error: 'Deletion not authorized or request not found' }, { status: 403 });
    }

    // Get all members to clear their currentRoomId
    const memberIds = membersSnap.docs.map(d => d.id);

    // Delete everything related to the room
    await adminDb.runTransaction(async (transaction) => {
      // Clear currentRoomId for all members
      memberIds.forEach(uid => {
        transaction.update(adminDb.collection('users').doc(uid), { currentRoomId: null });
      });
      transaction.delete(roomRef);
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting room:', error);
    return NextResponse.json({ error: 'Failed to delete room' }, { status: 500 });
  }
}
