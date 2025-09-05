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
        return res.status(400).json({ message: 'AssetGroup ID is required' });
      }

      // Get pending descriptions for this asset group
      const pendingDescriptions = await db.collection('pending_descriptions')
        .find({ 
          'AssetGroup ID': Number(assetGroupId),
          approved: false 
        })
        .sort({ createdAt: -1 })
        .toArray();

      return res.status(200).json({
        success: true,
        data: pendingDescriptions
      });

    } catch (error) {
      console.error('Error fetching descriptions:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { text, assetGroupId, campaignId, campaignName, assetGroupName, accountId } = req.body;

      if (!text || !assetGroupId) {
        return res.status(400).json({ message: 'Text and AssetGroup ID are required' });
      }

      // Validate length for descriptions (max 90 chars)
      const trimmed = (text || '').trim();
      if (!trimmed || trimmed.length > 90) {
        return res.status(400).json({ message: 'Invalid length. Max 90 chars for DESCRIPTION.' });
      }

      const { db } = await connectToDatabase();

      // Generate a unique asset ID
      const assetId = Date.now();

      const descriptionData = {
        'Asset ID': assetId,
        'Text Content': trimmed,
        'Asset Type': 'TEXT',
        'Field Type': 'DESCRIPTION',
        'Performance Label': 'PENDING',
        'Campaign ID': campaignId || 'unknown',
        'Campaign Name': campaignName || 'Unknown Campaign',
        'AssetGroup ID': Number(assetGroupId),
        'Asset Group Name': assetGroupName || 'Unknown Asset Group',
        'Account ID': Number(accountId) || 1,
        'isPending': true,
        'createdBy': session.user.email,
        'createdAt': new Date(),
        'approved': false
      };

      // Save to pending_descriptions collection
      await db.collection('pending_descriptions').insertOne(descriptionData);

      // Also save to PMax_Assets for consistency
      await db.collection('PMax_Assets').insertOne({
        ...descriptionData,
        'Asset Group Status': 'PENDING'
      });

      // Record the change
      await db.collection('asset_changes').insertOne({
        assetGroupId: Number(assetGroupId),
        campaignId: campaignId || 'unknown',
        campaignName: campaignName || 'Unknown Campaign',
        assetGroupName: assetGroupName || 'Unknown Asset Group',
        accountId: Number(accountId) || 1,
        assetId: assetId,
        assetType: 'description',
        action: 'add',
        status: 'PENDING',
        data: { text },
        changedBy: session.user.email,
        changedAt: new Date(),
        userRole: session.user.role || 'client'
      });

      return res.status(200).json({
        success: true,
        data: { assetId },
        message: 'Description added successfully'
      });

    } catch (error) {
      console.error('Error adding description:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}