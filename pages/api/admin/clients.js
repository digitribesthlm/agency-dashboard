import { getSession } from 'next-auth/react';
import clientPromise from '../../../lib/mongodb';

export default async function handler(req, res) {
  const session = await getSession({ req });

  if (!session || session.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Not authorized' });
  }

  try {
    const client = await clientPromise;
    const db = client.db();
    const users = await db.collection('users')
      .find({ role: { $ne: 'admin' } })
      .toArray();

    return res.status(200).json({ 
      success: true, 
      data: users 
    });
  } catch (error) {
    console.error('Database error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error fetching clients' 
    });
  }
} 