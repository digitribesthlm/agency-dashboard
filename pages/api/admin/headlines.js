import { connectToDatabase } from '../../../lib/mongodb';
import { getSession } from 'next-auth/react';

export default async function handler(req, res) {
  const session = await getSession({ req });

  if (!session || session.user.role !== 'admin') {
    return res.status(403).json({ message: 'Unauthorized - Admin access required' });
  }

  if (req.method === 'GET') {
    try {
      const { db } = await connectToDatabase();

      // Get all pending headlines
      const pendingHeadlines = await db.collection('pending_headlines')
        .find({ approved: false })
        .sort({ createdAt: -1 })
        .toArray();

      return res.status(200).json({
        success: true,
        data: pendingHeadlines
      });

    } catch (error) {
      console.error('Error fetching pending headlines:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { action, headlineId } = req.body;

      if (!action || !headlineId) {
        return res.status(400).json({ message: 'Missing required fields' });
      }

      const { db } = await connectToDatabase();

      if (action === 'approve') {
        // Get the pending headline
        const pendingHeadline = await db.collection('pending_headlines')
          .findOne({ _id: headlineId });

        if (!pendingHeadline) {
          return res.status(404).json({ message: 'Headline not found' });
        }

        // Create the approved headline for the main collection
        const approvedHeadline = {
          ...pendingHeadline,
          'Performance Label': 'UNKNOWN', // Reset to unknown for new assets
          approved: true,
          approvedBy: session.user.email,
          approvedAt: new Date()
        };

        // Remove the _id and other MongoDB-specific fields
        delete approvedHeadline._id;
        delete approvedHeadline.createdBy;
        delete approvedHeadline.createdAt;
        delete approvedHeadline.isPending;

        // Insert into the main PMax_Assets collection
        await db.collection('PMax_Assets').insertOne(approvedHeadline);

        // Remove from pending collection
        await db.collection('pending_headlines').deleteOne({ _id: headlineId });

        return res.status(200).json({
          success: true,
          message: 'Headline approved successfully'
        });

      } else if (action === 'reject') {
        // Simply remove from pending collection
        const result = await db.collection('pending_headlines').deleteOne({ _id: headlineId });

        if (result.deletedCount === 0) {
          return res.status(404).json({ message: 'Headline not found' });
        }

        return res.status(200).json({
          success: true,
          message: 'Headline rejected successfully'
        });

      } else {
        return res.status(400).json({ message: 'Invalid action. Use "approve" or "reject"' });
      }

    } catch (error) {
      console.error('Error processing headline approval:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
