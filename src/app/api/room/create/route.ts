import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp } from '@/lib/firebaseAdmin';

// Generate a unique 6-character room code
function generateRoomCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Check if room code already exists
async function roomCodeExists(code: string): Promise<boolean> {
  const { adminDb } = getAdminApp();
  if (!adminDb) return false;
  try {
    const querySnap = await adminDb.collection('rooms').where('code', '==', code).get();
    return !querySnap.empty;
  } catch {
    return false;
  }
}

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

    // Get user data
    const userDocRef = adminDb.collection('users').doc(userId);
    const userSnap = await userDocRef.get();
    
    if (userSnap.exists && userSnap.data()?.currentRoomId) {
      return NextResponse.json({ error: 'User already has a room' }, { status: 400 });
    }

    const userData = userSnap.data();
    const userName = userData?.name || 'Roommate';
    const userPhotoURL = userData?.photoURL || null;

    // Generate unique room code
    let roomCode = generateRoomCode();
    let attempts = 0;
    while (await roomCodeExists(roomCode) && attempts < 5) {
      roomCode = generateRoomCode();
      attempts++;
    }

    // Get room name from request body if provided
    let roomName = 'New Room';
    try {
      const body = await request.json();
      if (body.name) roomName = body.name;
    } catch {}

    // Create room
    const roomData = {
      name: roomName,
      code: roomCode,
      adminId: userId,
      status: 'active',
      memberCount: 1,
      createdAt: new Date(), // adminDb handles Date objects
    };

    const roomRef = await adminDb.collection('rooms').add(roomData);

    // Add user as admin member
    await adminDb.collection('rooms').doc(roomRef.id).collection('members').doc(userId).set({
      userId,
      role: 'admin',
      displayName: userName,
      photoURL: userPhotoURL || null,
      joinedAt: new Date(),
    });

    // Update user's currentRoomId
    await userDocRef.update({
      currentRoomId: roomRef.id,
    });

    return NextResponse.json({
      id: roomRef.id,
      ...roomData,
    });
  } catch (error) {
    console.error('Error creating room:', error);
    return NextResponse.json({ error: 'Failed to create room' }, { status: 500 });
  }
}