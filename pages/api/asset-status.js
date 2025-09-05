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
          .findOne({ 'AssetGroup ID': Number(assetGroupId) });
        if (existingAsset) {
          finalCampaignId = existingAsset['Campaign ID'];
        }
      }

      // Get campaign and asset group names from existing asset
      let campaignName = 'Unknown Campaign';
      let assetGroupName = 'Unknown Asset Group';
      
      if (finalCampaignId) {
        const existingAsset = await db.collection('PMax_Assets')
          .findOne({ 
            'Campaign ID': finalCampaignId,
            'AssetGroup ID': Number(assetGroupId)
          });
        if (existingAsset) {
          campaignName = existingAsset['Campaign Name'] || 'Unknown Campaign';
          assetGroupName = existingAsset['Asset Group Name'] || 'Unknown Asset Group';
        }
      }

      // Create status change record
      const statusChange = {
        assetId,
        assetType, // 'image' or 'video'
        action, // 'pause', 'resume', 'remove'
        assetGroupId: Number(assetGroupId),
        campaignId: finalCampaignId || 'unknown',
        campaignName: campaignName,
        assetGroupName: assetGroupName,
        accountId: accountId || 1,
        changedBy: session.user.email,
        changedAt: new Date(),
        userRole: session.user.role,
        status: 'active'
      };

      let updateField = {};
      if (action === 'pause') {
        updateField['Asset Status'] = 'PAUSED';
      } else if (action === 'resume') {
        updateField['Asset Status'] = 'ENABLED';
      } else if (action === 'remove') {
        updateField['Asset Status'] = 'REMOVED';
      }

      // Try multiple query formats to handle different data types in the database
      const queryVariants = [
        {
          'Asset ID': String(assetId),
          'AssetGroup ID': Number(assetGroupId)
        },
        {
          'Asset ID': Number(assetId),
          'AssetGroup ID': Number(assetGroupId)
        },
        {
          'Asset ID': String(assetId),
          'AssetGroup ID': String(assetGroupId)
        },
        {
          'Asset ID': Number(assetId),
          'AssetGroup ID': String(assetGroupId)
        }
      ];

      // Add campaign ID to each variant if available
      if (finalCampaignId) {
        queryVariants.forEach(query => {
          query['Campaign ID'] = Number(finalCampaignId);
        });
      }

      let totalUpdated = 0;
      let successfulQuery = null;

      // Try each query variant until we find one that works
      for (const query of queryVariants) {
        console.log(`Trying query variant:`, query);
        
        const updateResult = await db.collection('PMax_Assets').updateMany(
          query,
          { $set: updateField }
        );
        
        console.log(`Query result: ${updateResult.modifiedCount} assets updated`);
        totalUpdated += updateResult.modifiedCount;
        
        if (updateResult.modifiedCount > 0) {
          successfulQuery = query;
          break; // Stop trying once we find a working query
        }
      }

      console.log(`Total assets updated: ${totalUpdated}`);
      
      if (totalUpdated === 0) {
        console.warn('No assets were updated with any query variant. Asset may not exist or data types may not match.');
        
        // Try to find any asset with this ID to debug
        const debugQueries = [
          { 'Asset ID': String(assetId) },
          { 'Asset ID': Number(assetId) }
        ];
        
        for (const debugQuery of debugQueries) {
          const foundAsset = await db.collection('PMax_Assets').findOne(debugQuery);
          if (foundAsset) {
            console.log('Found asset with debug query:', debugQuery);
            console.log('Asset data types:', {
              'Asset ID': typeof foundAsset['Asset ID'],
              'AssetGroup ID': typeof foundAsset['AssetGroup ID'],
              'Campaign ID': typeof foundAsset['Campaign ID']
            });
            console.log('Asset values:', {
              'Asset ID': foundAsset['Asset ID'],
              'AssetGroup ID': foundAsset['AssetGroup ID'],
              'Campaign ID': foundAsset['Campaign ID']
            });
            break;
          }
        }
      } else {
        console.log('Successfully updated asset with query:', successfulQuery);
      }

      // Insert into asset status changes collection
      const result = await db.collection('asset_status_changes').insertOne(statusChange);

      // Record the change for accountability
      const changeRecord = {
        action,
        assetType,
        assetId,
        assetGroupId: Number(assetGroupId),
        campaignId: finalCampaignId || 'unknown',
        campaignName: campaignName,
        assetGroupName: assetGroupName,
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
