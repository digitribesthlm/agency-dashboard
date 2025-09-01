import { connectToDatabase } from '../../lib/mongodb';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (req.method === 'POST') {
    try {
      const { 
        action, 
        assetType, 
        assetId, 
        assetGroupId, 
        campaignId, 
        accountId 
      } = req.body;

      if (!action || !assetType || !assetId || !assetGroupId) {
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

      // Create status change record
      const statusChange = {
        assetId,
        assetType, // 'image' or 'video'
        action, // 'pause', 'resume', 'remove'
        assetGroupId: Number(assetGroupId),
        campaignId: finalCampaignId || 'unknown',
        accountId: accountId || 1,
        changedBy: session.user.email,
        changedAt: new Date(),
        userRole: session.user.role,
        status: 'active'
      };

      // Insert into asset status changes collection
      const result = await db.collection('asset_status_changes').insertOne(statusChange);

      // Record the change for accountability
      const changeRecord = {
        action,
        assetType,
        assetId,
        assetGroupId: Number(assetGroupId),
        campaignId: finalCampaignId || 'unknown',
        accountId: accountId || 1,
        data: { action, assetType },
        changedBy: session.user.email,
        changedAt: new Date(),
        userRole: session.user.role,
        status: 'active'
      };

      await db.collection('asset_changes').insertOne(changeRecord);

      return res.status(201).json({
        success: true,
        message: `${assetType} ${action} successful`,
        data: {
          changeId: result.insertedId,
          assetId: assetId
        }
      });

    } catch (error) {
      console.error('Error updating asset status:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  if (req.method === 'GET') {
    try {
      const { assetGroupId, assetType } = req.query;
      const { db } = await connectToDatabase();

      let query = { assetGroupId: Number(assetGroupId) };
      if (assetType) query.assetType = assetType;

      // Get status changes for the specific asset group
      const statusChanges = await db.collection('asset_status_changes')
        .find(query)
        .sort({ changedAt: -1 })
        .toArray();

      // Also get changes from asset_changes collection for pause/resume actions
      const assetChanges = await db.collection('asset_changes')
        .find({
          assetGroupId: Number(assetGroupId),
          action: { $in: ['pause', 'resume'] }
        })
        .sort({ changedAt: -1 })
        .toArray();

      // Process the changes to determine current status
      const pausedAssets = {
        headlines: new Set(),
        descriptions: new Set(),
        images: new Set(),
        videos: new Set()
      };

      // Process asset_changes to determine current paused status
      assetChanges.forEach(change => {
        if (change.action === 'pause') {
          if (change.assetType === 'headline') {
            pausedAssets.headlines.add(change.assetId);
          } else if (change.assetType === 'description') {
            pausedAssets.descriptions.add(change.assetId);
          } else if (change.assetType === 'image') {
            pausedAssets.images.add(change.assetId);
          } else if (change.assetType === 'video') {
            pausedAssets.videos.add(change.assetId);
          }
        } else if (change.action === 'resume') {
          if (change.assetType === 'headline') {
            pausedAssets.headlines.delete(change.assetId);
          } else if (change.assetType === 'description') {
            pausedAssets.descriptions.delete(change.assetId);
          } else if (change.assetType === 'image') {
            pausedAssets.images.delete(change.assetId);
          } else if (change.assetType === 'video') {
            pausedAssets.videos.delete(change.assetId);
          }
        }
      });

      return res.status(200).json({
        success: true,
        data: {
          statusChanges,
          pausedAssets: {
            headlines: Array.from(pausedAssets.headlines),
            descriptions: Array.from(pausedAssets.descriptions),
            images: Array.from(pausedAssets.images),
            videos: Array.from(pausedAssets.videos)
          }
        }
      });

    } catch (error) {
      console.error('Error fetching asset status changes:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}