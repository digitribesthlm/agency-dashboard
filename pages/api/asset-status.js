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

      // Update the actual asset status in PMax_Assets collection
      const updateQuery = {
        'Asset ID': Number(assetId),
        'Asset Group ID': Number(assetGroupId)
      };
      if (finalCampaignId) {
        updateQuery['Campaign ID'] = Number(finalCampaignId);
      }

      let updateField = {};
      if (action === 'pause') {
        updateField['Asset Status'] = 'PAUSED';
      } else if (action === 'resume') {
        updateField['Asset Status'] = 'ENABLED';
      } else if (action === 'remove') {
        updateField['Asset Status'] = 'REMOVED';
      }

      // Update the asset in PMax_Assets collection
      const updateResult = await db.collection('PMax_Assets').updateMany(
        updateQuery,
        { $set: updateField }
      );

      console.log(`Updated ${updateResult.modifiedCount} assets in PMax_Assets collection`);

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
        data: { action, assetType, newStatus: updateField['Asset Status'] },
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
      const { assetGroupId, assetType, campaignId } = req.query;
      const { db } = await connectToDatabase();

      let query = { assetGroupId: Number(assetGroupId) };
      if (assetType) query.assetType = assetType;
      if (campaignId) query.campaignId = campaignId;

      // Get status changes for the specific asset group and campaign combination
      const statusChanges = await db.collection('asset_status_changes')
        .find(query)
        .sort({ changedAt: -1 })
        .toArray();

      // Also get changes from asset_changes collection for pause/resume actions
      // Filter by both assetGroupId and campaignId to ensure we only get changes for this specific combination
      const assetChangesQuery = {
        assetGroupId: Number(assetGroupId),
        action: { $in: ['pause', 'resume'] }
      };
      if (campaignId) assetChangesQuery.campaignId = campaignId;

      const assetChanges = await db.collection('asset_changes')
        .find(assetChangesQuery)
        .sort({ changedAt: -1 })
        .toArray();

      // Process the changes to determine current status
      // Use a Map to track status by assetId for this specific assetGroupId + campaignId combination
      const pausedAssets = {
        headlines: new Set(),
        descriptions: new Set(),
        images: new Set(),
        videos: new Set()
      };

      // Process asset_changes to determine current paused status
      // Only consider changes that match the current assetGroupId and campaignId
      assetChanges.forEach(change => {
        // Double-check that this change is for the current asset group and campaign
        if (change.assetGroupId === Number(assetGroupId) && 
            (!campaignId || change.campaignId === campaignId)) {
          
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