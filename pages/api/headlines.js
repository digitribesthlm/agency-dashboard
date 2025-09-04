import { connectToDatabase } from '../../lib/mongodb';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    try {
      const { assetGroupId } = req.query;
      const { db } = await connectToDatabase();

      if (!assetGroupId) {
        return res.status(400).json({ message: 'Asset Group ID is required' });
      }

      // Get pending headlines for this asset group
      const pendingHeadlines = await db.collection('pending_headlines')
        .find({ 
          'Asset Group ID': Number(assetGroupId),
          approved: false 
        })
        .sort({ createdAt: -1 })
        .toArray();

      return res.status(200).json({
        success: true,
        data: pendingHeadlines
      });

    } catch (error) {
      console.error('Error fetching headlines:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { text, assetGroupId, campaignId, accountId, fieldType = 'HEADLINE' } = req.body;

      if (!text || !assetGroupId) {
        return res.status(400).json({ message: 'Text and Asset Group ID are required' });
      }

      // Validate length by field type: HEADLINE ≤30, LONG_HEADLINE ≤90
      const trimmed = (text || '').trim();
      const isShort = fieldType === 'HEADLINE';
      const maxLen = isShort ? 30 : 90;
      if (!trimmed || trimmed.length > maxLen) {
        return res.status(400).json({ message: `Invalid length. Max ${maxLen} chars for ${isShort ? 'HEADLINE' : 'LONG_HEADLINE'}.` });
      }

      const { db } = await connectToDatabase();

      // Generate a unique asset ID (use timestamp for now, but should be numeric for consistency)
      const assetId = Date.now();

      const headlineData = {
        'Asset ID': assetId,
        'Text Content': trimmed,
        'Asset Type': 'TEXT',
        'Field Type': fieldType,
        'Performance Label': 'PENDING',
        'Campaign ID': campaignId || 'unknown',
        'Asset Group ID': Number(assetGroupId),
        'Account ID': Number(accountId) || 1,
        'isPending': true,
        'createdBy': session.user.email,
        'createdAt': new Date(),
        'approved': false
      };

      // Save to pending_headlines collection
      await db.collection('pending_headlines').insertOne(headlineData);

      // Also save to PMax_Assets for consistency
      await db.collection('PMax_Assets').insertOne({
        ...headlineData,
        'Asset Group Status': 'PENDING'
      });

      // Record the change
      await db.collection('asset_changes').insertOne({
        assetGroupId: Number(assetGroupId),
        campaignId: campaignId || 'unknown',
        accountId: Number(accountId) || 1,
        assetId: assetId,
        assetType: 'headline',
        action: 'add',
        status: 'PENDING',
        data: { text, fieldType },
        changedBy: session.user.email,
        changedAt: new Date(),
        userRole: session.user.role || 'client'
      });

      return res.status(200).json({
        success: true,
        data: { assetId },
        message: 'Headline added successfully'
      });

    } catch (error) {
      console.error('Error adding headline:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
