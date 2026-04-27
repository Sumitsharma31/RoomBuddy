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
    const { roomId, item, amount, date } = body;

    if (!roomId || !item || !amount) {
      return NextResponse.json({ error: 'Room ID, item, and amount are required' }, { status: 400 });
    }

    // Check if user is a member of the room
    const memberDoc = await adminDb.collection('rooms').doc(roomId).collection('members').doc(userId).get();

    if (!memberDoc.exists) {
      return NextResponse.json({ error: 'User is not a member of this room' }, { status: 403 });
    }

    // Get user data for paidByName
    const userSnap = await adminDb.collection('users').doc(userId).get();
    const userData = userSnap.data();
    const userName = userData?.name || 'Roommate';

    // Add expense
    const expenseData = {
      item,
      amount: parseFloat(amount),
      paidBy: userId,
      paidByName: userName,
      date: date ? new Date(date) : new Date(),
      status: 'pending',
      verifications: [],
      createdAt: new Date(),
    };

    const expenseRef = await adminDb.collection('rooms').doc(roomId).collection('expenses').add(expenseData);

    // Notify all other members
    const membersSnap = await adminDb.collection('rooms').doc(roomId).collection('members').get();
    const otherMemberIds = membersSnap.docs
      .filter(d => d.id !== userId)
      .map(d => d.id);

    if (otherMemberIds.length > 0) {
      // Call notify logic (internal or via fetch if needed, but let's assume we can call the logic directly or just trigger it)
      // For now, let's just trigger notifications via the notify API if it's functional
      try {
        await fetch(new URL('/api/notify', request.url).toString(), {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': authHeader // Forward the auth header
          },
          body: JSON.stringify({
            userIds: otherMemberIds,
            title: 'New Expense Added',
            body: `${userName} added $${parseFloat(amount).toFixed(2)} for ${item}`,
            data: {
              type: 'expense_added',
              roomId,
              expenseId: expenseRef.id,
            },
          }),
        });
      } catch (err) {
        console.error('Failed to send notifications:', err);
      }
    }

    return NextResponse.json({
      id: expenseRef.id,
      ...expenseData,
    });
  } catch (error) {
    console.error('Error adding expense:', error);
    return NextResponse.json({ error: 'Failed to add expense' }, { status: 500 });
  }
}