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

    // Check if user is admin
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
      return NextResponse.json({ error: 'Only admin can initiate settlement' }, { status: 403 });
    }

    // Get all members
    const membersSnap = await roomRef.collection('members').get();
    const members = membersSnap.docs.map(d => ({
      userId: d.id,
      name: d.data().displayName || 'Roommate',
    }));

    // Get all verified expenses
    const expensesSnap = await roomRef.collection('expenses').where('status', '==', 'verified').get();
    const expenses = expensesSnap.docs.map(d => ({
      id: d.id,
      ...d.data()
    }));

    // Calculate totals
    const paid: Record<string, number> = {};
    members.forEach(m => paid[m.userId] = 0);
    expenses.forEach((e: any) => {
      paid[e.paidBy] = (paid[e.paidBy] || 0) + e.amount;
    });

    const total = Object.values(paid).reduce((a, b) => a + b, 0);
    const fairShare = total / members.length;

    // Breakdown
    const breakdown = members.map(m => ({
      userId: m.userId,
      name: m.name,
      totalPaid: paid[m.userId],
      balance: paid[m.userId] - fairShare
    }));

    // Transfers
    const creditors = breakdown.filter(b => b.balance > 0).sort((a, b) => b.balance - a.balance);
    const debtors = breakdown.filter(b => b.balance < 0).sort((a, b) => a.balance - b.balance);

    const transfers: any[] = [];
    let i = 0, j = 0;
    const tempDebtors = JSON.parse(JSON.stringify(debtors));
    const tempCreditors = JSON.parse(JSON.stringify(creditors));

    while (i < tempDebtors.length && j < tempCreditors.length) {
      const amount = Math.min(Math.abs(tempDebtors[i].balance), tempCreditors[j].balance);
      if (amount > 0.01) {
        transfers.push({
          from: tempDebtors[i].userId,
          to: tempCreditors[j].userId,
          fromName: tempDebtors[i].name,
          toName: tempCreditors[j].name,
          amount: parseFloat(amount.toFixed(2))
        });
      }
      tempDebtors[i].balance += amount;
      tempCreditors[j].balance -= amount;
      if (Math.abs(tempDebtors[i].balance) < 0.01) i++;
      if (tempCreditors[j].balance < 0.01) j++;
    }

    const settlementData = {
      total: parseFloat(total.toFixed(2)),
      fairShare: parseFloat(fairShare.toFixed(2)),
      breakdown,
      transfers,
      settledAt: new Date(),
    };

    // Save settlement
    const settlementRef = await roomRef.collection('settlements').add(settlementData);

    // Notify members
    try {
      await fetch(new URL('/api/notify', request.url).toString(), {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': authHeader
        },
        body: JSON.stringify({
          userIds: members.map(m => m.userId),
          title: 'Monthly Settlement Ready',
          body: 'The settlement breakdown for this month is ready. Tap to view.',
          data: { type: 'settlement_ready', roomId, settlementId: settlementRef.id }
        }),
      });
    } catch (err) {
      console.error('Failed to send notification');
    }

    return NextResponse.json({ id: settlementRef.id, ...settlementData });
  } catch (error) {
    console.error('Error in settlement:', error);
    return NextResponse.json({ error: 'Failed to process settlement' }, { status: 500 });
  }
}