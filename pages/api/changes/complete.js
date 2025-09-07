import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { connectToDatabase } from '../../../lib/mongodb';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Only admin users can mark changes as complete
  if (session.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden - Admin access required' });
  }

  const { db } = await connectToDatabase();

  try {
    const { changeId } = req.body;

    if (!changeId) {
      return res.status(400).json({ error: 'Change ID is required' });
    }

    // Update the change record to mark it as completed
    const result = await db.collection('asset_changes').updateOne(
      { _id: changeId },
      { 
        $set: { 
          status: 'completed',
          completed_at: new Date(),
          completed_by: session.user.email
        }
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Change not found' });
    }

    return res.status(200).json({ 
      success: true, 
      message: 'Change marked as complete' 
    });

  } catch (error) {
    console.error('Complete change API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

