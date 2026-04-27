import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc, updateDoc, collection, addDoc, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { onAuthChange } from '@/lib/auth';

interface User {
  uid: string;
  name: string;
  email: string;
  photoURL: string | null;
  currentRoomId: string | null;
  fcmToken: string | null;
  createdAt: Date;
}

export default function AddExpensePage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [item, setItem] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const router = useRouter();

  useState(() => {
    const unsubscribe = onAuthChange(async (currentUser) => {
      if (currentUser) {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          setUser({ ...userDoc.data(), uid: currentUser.uid } as User);
        }
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !user.currentRoomId) {
      setError('You must be in a room to add an expense');
      return;
    }
    if (!item || !amount) {
      setError('Item and amount are required');
      return;
    }
    if (parseFloat(amount) <= 0) {
      setError('Amount must be greater than 0');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const expenseData = {
        item,
        amount: parseFloat(amount),
        paidBy: user.uid,
        paidByName: user.name,
        date: new Date(date),
        status: 'pending',
        verifications: [],
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'rooms', user.currentRoomId, 'expenses'), expenseData);

      // Notify other members via API
      const membersSnap = await getDocs(collection(db, 'rooms', user.currentRoomId, 'members'));
      const otherMemberIds = membersSnap.docs
        .filter(d => d.data().userId !== user.uid)
        .map(d => d.data().userId);

      if (otherMemberIds.length > 0) {
        await fetch('/api/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userIds: otherMemberIds,
            title: 'New Expense Added',
            body: `${user.name} added ₹${parseFloat(amount).toFixed(2)} for ${item}`,
            data: {
              type: 'expense_added',
              roomId: user.currentRoomId,
            },
          }),
        });
      }

      router.push('/room');
    } catch (err: any) {
      setError(err.message || 'Failed to add expense');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-md mx-auto px-4">
        <button
          onClick={() => router.push('/room')}
          className="mb-6 text-gray-600 hover:text-indigo-600"
        >
          ← Back to Room
        </button>

        <h1 className="text-2xl font-bold text-gray-900 mb-6">Add New Expense</h1>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Item Name
            </label>
            <input
              type="text"
              value={item}
              onChange={(e) => setItem(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="e.g., Groceries, Utilities"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Amount (₹)
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="0.00"
              step="0.01"
              min="0.01"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              required
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 transition disabled:opacity-50"
          >
            {submitting ? 'Adding...' : 'Add Expense'}
          </button>
        </form>
      </div>
    </div>
  );
}