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
    const { roomId, newAdminId } = body;

    if (!roomId || !newAdminId) {
      return NextResponse.json({ error: 'Room ID and new admin ID are required' }, { status: 400 });
    }

    // Check if requester is current admin
    const roomRef = adminDb.collection('rooms').doc(roomId);
    const roomSnap = await roomRef.get();
    if (!roomSnap.exists) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    const roomData = roomSnap.data();
    if (!roomData) {
      return NextResponse.json({ error: 'Room data not found' }, { status: 404 });
    }

    if (roomData.adminId !== userId) {
      return NextResponse.json({ error: 'Only admin can transfer ownership' }, { status: 403 });
    }

    // Perform transfer in transaction
    await adminDb.runTransaction(async (transaction) => {
      // Update room doc
      transaction.update(roomRef, { adminId: newAdminId });

      // Update old admin member doc
      transaction.update(roomRef.collection('members').doc(userId), { role: 'member' });

      // Update new admin member doc
      transaction.update(roomRef.collection('members').doc(newAdminId), { role: 'admin' });
    });

    // Notify new admin
    try {
      await fetch(new URL('/api/notify', request.url).toString(), {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': authHeader
        },
        body: JSON.stringify({
          userIds: [newAdminId],
          title: 'Admin Role Transferred',
          body: 'You are now the admin of the room!',
          data: { type: 'admin_transfer', roomId }
        }),
      });
    } catch (err) {
      console.error('Failed to send notification');
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error transferring admin:', error);
    return NextResponse.json({ error: 'Failed to transfer admin' }, { status: 500 });
  }
}