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

      console.log('Headlines API - Request body:', req.body);

      if (!text || !assetGroupId) {
        return res.status(400).json({ 
          message: 'Missing required fields',
          received: { text: !!text, assetGroupId: !!assetGroupId, campaignId: !!campaignId }
        });
      }

      const { db } = await connectToDatabase();

      // Generate a unique asset ID for the new headline
      const assetId = `pending_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Create the new headline document
      const newHeadline = {
        'Asset ID': assetId,
        'Text Content': text,
        'Asset Type': 'TEXT',
        'Field Type': 'HEADLINE',
        'Performance Label': 'PENDING',
        'Campaign ID': campaignId,
        'Asset Group ID': assetGroupId,
        'Account ID': accountId || 1,
        'Campaign Name': '', // Will be populated from existing data
        'Asset Group Name': '', // Will be populated from existing data
        'Campaign Status': 'ENABLED',
        'Asset Group Status': 'ENABLED',
        'Final URL': '',
        'isPending': true,
        'createdBy': session.user.email,
        'createdAt': new Date(),
        'approved': false
      };

      // Get campaign and asset group details to populate missing fields
      let actualCampaignId = campaignId;
      const existingAsset = await db.collection('PMax_Assets')
        .findOne({ 
          'Asset Group ID': assetGroupId 
        });

      if (existingAsset) {
        actualCampaignId = existingAsset['Campaign ID'];
        newHeadline['Campaign ID'] = actualCampaignId;
        newHeadline['Campaign Name'] = existingAsset['Campaign Name'];
        newHeadline['Asset Group Name'] = existingAsset['Asset Group Name'];
        newHeadline['Campaign Status'] = existingAsset['Campaign Status'];
        newHeadline['Asset Group Status'] = existingAsset['Asset Group Status'];
        newHeadline['Final URL'] = existingAsset['Final URL'];
      }

      // Insert the new headline into the pending headlines collection
      const result = await db.collection('pending_headlines').insertOne(newHeadline);

      // Record the change for accountability
      const changeRecord = {
        action: 'add',
        assetType: 'headline',
        assetId: assetId,
        assetGroupId: Number(assetGroupId),
        campaignId: actualCampaignId,
        accountId: accountId || 1,
        data: { text },
        changedBy: session.user.email,
        changedAt: new Date(),
        userRole: session.user.role,
        status: 'pending'
      };

      console.log('Recording change:', changeRecord);
      const changeResult = await db.collection('asset_changes').insertOne(changeRecord);
      console.log('Change recorded with ID:', changeResult.insertedId);

      return res.status(201).json({
        success: true,
        message: 'Headline added successfully',
        data: {
          id: result.insertedId,
          assetId: assetId
        }
      });

    } catch (error) {
      console.error('Error adding headline:', error);
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

      // Get pending headlines for the specific asset group
      const pendingHeadlines = await db.collection('pending_headlines')
        .find({ 
          'Asset Group ID': Number(assetGroupId)
        })
        .toArray();

      console.log('Fetching pending headlines for assetGroupId:', assetGroupId);
      console.log('User email:', session.user.email);
      console.log('Found pending headlines:', pendingHeadlines.length);

      return res.status(200).json({
        success: true,
        data: pendingHeadlines
      });

    } catch (error) {
      console.error('Error fetching pending headlines:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
