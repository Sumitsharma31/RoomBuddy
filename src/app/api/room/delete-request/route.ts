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

    if (roomSnap.data().adminId !== userId) {
      return NextResponse.json({ error: 'Only admin can request deletion' }, { status: 403 });
    }

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    
    await roomRef.collection('deletionRequest').doc('current').set({
      initiatedBy: userId,
      createdAt: new Date(),
      expiresAt,
      status: 'pending',
      votes: [{ userId, action: 'approved', at: new Date() }],
    });

    // Notify all members
    const membersSnap = await roomRef.collection('members').get();
    const otherMemberIds = membersSnap.docs
      .map(d => d.id)
      .filter(id => id !== userId);

    if (otherMemberIds.length > 0) {
      try {
        await fetch(new URL('/api/notify', request.url).toString(), {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': authHeader
          },
          body: JSON.stringify({
            userIds: otherMemberIds,
            title: 'Room Deletion Requested',
            body: 'Admin has requested to delete the room. Your approval is required within 24h.',
            data: { type: 'deletion_requested', roomId }
          }),
        });
      } catch (err) {
        console.error('Failed to send notification');
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error requesting deletion:', error);
    return NextResponse.json({ error: 'Failed to request deletion' }, { status: 500 });
  }
}
