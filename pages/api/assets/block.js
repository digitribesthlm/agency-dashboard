import { connectToDatabase } from '../../../lib/mongodb';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session || session.user.role !== 'admin') {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { db } = await connectToDatabase();
    const {
      assetId,
      accountId,
      campaignId,
      assetGroupId,
      reason,
      blockedBy,
      blockedAt,
      status,
      assetType,
      block_level
    } = req.body;

    const result = await db.collection('PMAX_Assets_black_list').insertOne({
      assetId,
      accountId,
      campaignId,
      assetGroupId,
      reason,
      blockedBy,
      blockedAt,
      status,
      assetType,
      block_level
    });

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error('Error blocking asset:', error);
    res.status(500).json({ message: 'Error blocking asset' });
  }
}
