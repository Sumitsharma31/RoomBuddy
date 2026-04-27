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
    const { roomId, expenseId, action } = body;

    if (!roomId || !expenseId || !action) {
      return NextResponse.json({ error: 'Room ID, expense ID, and action are required' }, { status: 400 });
    }

    if (action !== 'verified' && action !== 'disputed') {
      return NextResponse.json({ error: 'Action must be "verified" or "disputed"' }, { status: 400 });
    }

    // Get expense
    const expenseDocRef = adminDb.collection('rooms').doc(roomId).collection('expenses').doc(expenseId);
    const expenseSnap = await expenseDocRef.get();

    if (!expenseSnap.exists) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    const expenseData = expenseSnap.data();

    if (!expenseData) {
      return NextResponse.json({ error: 'Expense data not found' }, { status: 404 });
    }

    // Check if user is trying to verify own expense
    if (expenseData.paidBy === userId) {
      return NextResponse.json({ error: 'Cannot verify own expense' }, { status: 400 });
    }

    // Check if user has already voted
    const verifications = expenseData.verifications || [];
    const hasVoted = verifications.some((v: any) => v.userId === userId);
    if (hasVoted) {
      return NextResponse.json({ error: 'Already voted on this expense' }, { status: 400 });
    }

    // Get user's name for the verification log
    const userDocRef = adminDb.collection('users').doc(userId);
    const userSnap = await userDocRef.get();
    const userName = userSnap.exists ? userSnap.data()?.name || 'A member' : 'A member';

    // Add verification
    const newVerification = {
      userId,
      userName,
      action,
      at: new Date(),
    };

    const updatedVerifications = [...verifications, newVerification];
    const status = action === 'verified' ? 'verified' : 'disputed';

    // Update expense
    await expenseDocRef.update({
      verifications: updatedVerifications,
      status,
    });

    // Notify expense owner
    try {
      await fetch(new URL('/api/notify', request.url).toString(), {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': authHeader
        },
        body: JSON.stringify({
          userIds: [expenseData.paidBy],
          title: action === 'verified' ? 'Expense Verified' : 'Expense Disputed',
          body: action === 'verified'
            ? `Your expense "${expenseData.item}" was verified!`
            : `Your expense "${expenseData.item}" was disputed.`,
          data: {
            type: action === 'verified' ? 'expense_verified' : 'expense_disputed',
            roomId,
            expenseId,
          },
        }),
      });
    } catch (err) {
      console.error('Failed to send notification:', err);
    }

    return NextResponse.json({
      id: expenseId,
      ...expenseData,
      verifications: updatedVerifications,
      status,
    });
  } catch (error) {
    console.error('Error verifying expense:', error);
    return NextResponse.json({ error: 'Failed to verify expense' }, { status: 500 });
  }
}