import { connectToDatabase } from '../../lib/mongodb';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const session = await getServerSession(req, res, authOptions);
      
      if (!session) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const { text, assetGroupId, campaignId, accountId } = req.body;

      if (!text || !assetGroupId) {
        return res.status(400).json({ message: 'Missing required fields' });
      }

      const { db } = await connectToDatabase();

      // If campaignId is not provided, try to get it from existing assets
      let finalCampaignId = campaignId;
      if (!finalCampaignId) {
        const existingAsset = await db.collection('PMax_Assets')
          .findOne({ 'Asset Group ID': Number(assetGroupId) });
        if (existingAsset) {
          finalCampaignId = existingAsset['Campaign ID'];
        }
      }

      // Generate a unique asset ID for the new description
      const assetId = `pending_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Create the new description document
      const newDescription = {
        'Asset ID': assetId,
        'Text Content': text,
        'Asset Type': 'TEXT',
        'Field Type': 'DESCRIPTION',
        'Performance Label': 'PENDING',
        'Campaign ID': finalCampaignId || 'unknown',
        'Asset Group ID': assetGroupId,
        'Account ID': accountId || 1,
        'Campaign Name': '',
        'Asset Group Name': '',
        'Campaign Status': 'ENABLED',
        'Asset Group Status': 'ENABLED',
        'Final URL': '',
        'isPending': true,
        'createdBy': session.user.email,
        'createdAt': new Date(),
        'approved': false
      };

      // Get campaign and asset group details to populate missing fields
      const existingAsset = await db.collection('PMax_Assets')
        .findOne({ 
          'Campaign ID': finalCampaignId, 
          'Asset Group ID': Number(assetGroupId) 
        });

      if (existingAsset) {
        newDescription['Campaign Name'] = existingAsset['Campaign Name'];
        newDescription['Asset Group Name'] = existingAsset['Asset Group Name'];
        newDescription['Campaign Status'] = existingAsset['Campaign Status'];
        newDescription['Asset Group Status'] = existingAsset['Asset Group Status'];
        newDescription['Final URL'] = existingAsset['Final URL'];
      }

      // Insert the new description into the pending descriptions collection
      const result = await db.collection('pending_descriptions').insertOne(newDescription);

      // Record the change for accountability
      const changeRecord = {
        action: 'add',
        assetType: 'description',
        assetId: assetId,
        assetGroupId: Number(assetGroupId),
        campaignId: finalCampaignId || 'unknown',
        accountId: accountId || 1,
        data: { text },
        changedBy: session.user.email,
        changedAt: new Date(),
        userRole: session.user.role,
        status: 'pending'
      };

      await db.collection('asset_changes').insertOne(changeRecord);

      return res.status(201).json({
        success: true,
        message: 'Description added successfully',
        data: {
          id: result.insertedId,
          assetId: assetId
        }
      });

    } catch (error) {
      console.error('Error adding description:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  if (req.method === 'GET') {
    try {
      const session = await getServerSession(req, res, authOptions);
      
      if (!session) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const { assetGroupId } = req.query;

      if (!assetGroupId) {
        return res.status(400).json({ message: 'Asset Group ID is required' });
      }

      const { db } = await connectToDatabase();

      // Get pending descriptions for the specific asset group
      const pendingDescriptions = await db.collection('pending_descriptions')
        .find({ 
          'Asset Group ID': Number(assetGroupId)
        })
        .toArray();

      return res.status(200).json({
        success: true,
        data: pendingDescriptions
      });

    } catch (error) {
      console.error('Error fetching pending descriptions:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
