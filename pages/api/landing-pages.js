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

      const { url, assetGroupId, campaignId, accountId } = req.body;

      if (!url || !assetGroupId) {
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

      // Generate a unique ID for the new landing page
      const landingPageId = `pending_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Create the new landing page document
      const newLandingPage = {
        'Landing Page ID': landingPageId,
        'Final URL': url,
        'Campaign ID': finalCampaignId || 'unknown',
        'Asset Group ID': assetGroupId,
        'Account ID': accountId || 1,
        'isPending': true,
        'createdBy': session.user.email,
        'createdAt': new Date(),
        'approved': false
      };

      // Insert the new landing page into the pending landing pages collection
      const result = await db.collection('pending_landing_pages').insertOne(newLandingPage);

      // Record the change for accountability
      const changeRecord = {
        action: 'add',
        assetType: 'landing_page',
        assetId: landingPageId,
        assetGroupId: Number(assetGroupId),
        campaignId: finalCampaignId || 'unknown',
        accountId: accountId || 1,
        data: { url },
        changedBy: session.user.email,
        changedAt: new Date(),
        userRole: session.user.role,
        status: 'pending'
      };

      await db.collection('asset_changes').insertOne(changeRecord);

      return res.status(201).json({
        success: true,
        message: 'Landing page added successfully',
        data: {
          id: result.insertedId,
          landingPageId: landingPageId
        }
      });

    } catch (error) {
      console.error('Error adding landing page:', error);
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

      // Get pending landing pages for the specific asset group
      const pendingLandingPages = await db.collection('pending_landing_pages')
        .find({ 
          'Asset Group ID': Number(assetGroupId)
        })
        .toArray();

      return res.status(200).json({
        success: true,
        data: pendingLandingPages
      });

    } catch (error) {
      console.error('Error fetching pending landing pages:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
