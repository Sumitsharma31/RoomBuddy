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

    // Verify user is a member
    const memberRef = roomRef.collection('members').doc(userId);
    const memberSnap = await memberRef.get();
    if (!memberSnap.exists) {
      return NextResponse.json({ error: 'User is not a member of this room' }, { status: 403 });
    }

    // Get deletion request
    const delRequestRef = roomRef.collection('deletionRequest').doc('current');
    const delSnap = await delRequestRef.get();

    if (!delSnap.exists || !delSnap.data()) {
      return NextResponse.json({ error: 'Deletion request not found' }, { status: 404 });
    }

    const delData = delSnap.data()!;

    // Check if user already voted
    const existingVoteIndex = delData.votes?.findIndex((v: any) => v.userId === userId);
    if (existingVoteIndex !== -1) {
      return NextResponse.json({ error: 'You have already approved this deletion' }, { status: 400 });
    }

    // Add user's vote
    const votes = delData.votes || [];
    votes.push({ userId, action: 'approved', at: new Date() });

    // Get all members to check if all have approved
    const membersSnap = await roomRef.collection('members').get();
    const allMemberIds = membersSnap.docs.map(d => d.id);

    // Check if all members have approved
    const approvedUserIds = votes.map((v: any) => v.userId);
    const allApproved = allMemberIds.every(uid => approvedUserIds.includes(uid));

    // Update deletion request with new vote
    await delRequestRef.update({
      votes,
      status: allApproved ? 'approved' : 'pending'
    });

    // If all approved, auto-delete the room
    if (allApproved) {
      await adminDb.runTransaction(async (transaction) => {
        // Clear currentRoomId for all members
        allMemberIds.forEach(uid => {
          transaction.update(adminDb.collection('users').doc(uid), { currentRoomId: null });
        });
        transaction.delete(roomRef);
      });

      return NextResponse.json({ success: true, deleted: true });
    }

    return NextResponse.json({ success: true, deleted: false });
  } catch (error) {
    console.error('Error approving deletion:', error);
    return NextResponse.json({ error: 'Failed to approve deletion' }, { status: 500 });
  }
}
