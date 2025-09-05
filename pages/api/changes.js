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
      const { assetGroupId, campaignId, accountId, filter, dateRange } = req.query;
      const { db } = await connectToDatabase();

      // Build query for asset changes - simplified approach
      let query = {};
      
      // Only add filters if they exist and are valid
      if (assetGroupId && assetGroupId !== 'undefined') {
        query.assetGroupId = Number(assetGroupId);
      }
      if (campaignId && campaignId !== 'undefined') {
        query.campaignId = Number(campaignId);
      }
      if (accountId && accountId !== 'undefined') {
        query.accountId = Number(accountId);
      }

      // Add date range filter
      if (dateRange && dateRange !== 'all') {
        const days = parseInt(dateRange);
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        query.changedAt = { $gte: startDate };
      }

      console.log('Changes API query:', query);

      // Get all changes
      const changes = await db.collection('asset_changes')
        .find(query)
        .sort({ changedAt: -1 })
        .limit(100)
        .toArray();

      const statusChanges = await db.collection('asset_status_changes')
        .find(query)
        .sort({ changedAt: -1 })
        .limit(100)
        .toArray();

      console.log(`Found ${changes.length} changes and ${statusChanges.length} status changes`);

      // Get asset details for context - try both PMax_Assets and pending collections
      const assetLookupKeys = [...new Set([...changes, ...statusChanges].map(c => ({
        'Campaign ID': Number(c.campaignId),
        'Asset Group ID': Number(c.assetGroupId), 
        'Asset ID': isNaN(Number(c.assetId)) ? c.assetId : Number(c.assetId)
      })))];
      const assetDetails = {};
      
      if (assetLookupKeys.length > 0) {
        // Try PMax_Assets first
        const assets = await db.collection('PMax_Assets')
          .find({
            $or: assetLookupKeys.map(key => ({
              'Campaign ID': key['Campaign ID'],
              'Asset Group ID': key['Asset Group ID'],
              'Asset ID': key['Asset ID']
            }))
          })
          .toArray();
          
        // Create lookup map using the same key format
        assets.forEach(asset => {
          const key = `${asset['Campaign ID']}_${asset['Asset Group ID']}_${asset['Asset ID']}`;
          assetDetails[key] = {
            assetType: asset['Asset Type'],
            fieldType: asset['Field Type'],
            textContent: asset['Text Content'],
            assetUrl: asset['Asset URL'] || asset['Image URL'] || asset['Video URL'],
            campaignName: asset['Campaign Name'],
            assetGroupName: asset['Asset Group Name']
          };
        });

        // Also try pending collections for missing assets
        const pendingCollections = ['pending_headlines', 'pending_descriptions', 'pending_images', 'pending_videos'];
        for (const collectionName of pendingCollections) {
          const pendingAssets = await db.collection(collectionName)
            .find({
              $or: assetLookupKeys.map(key => ({
                'Campaign ID': key['Campaign ID'],
                'Asset Group ID': key['Asset Group ID'],
                'Asset ID': key['Asset ID']
              }))
            })
            .toArray();
            
          pendingAssets.forEach(asset => {
            const key = `${asset['Campaign ID']}_${asset['Asset Group ID']}_${asset['Asset ID']}`;
            if (!assetDetails[key]) {
              assetDetails[key] = {
                assetType: asset['Asset Type'],
                fieldType: asset['Field Type'],
                textContent: asset['Text Content'],
                assetUrl: asset['Asset URL'] || asset['Image URL'] || asset['Video URL'],
                campaignName: asset['Campaign Name'] || `Campaign ${asset['Campaign ID']}`,
                assetGroupName: asset['Asset Group Name'] || `Asset Group ${asset['Asset Group ID']}`
              };
            }
          });
        }
      }

      // Combine and sort all changes
      const allChanges = [...changes, ...statusChanges]
        .map(change => {
          const compositeKey = `${change.campaignId}_${change.assetGroupId}_${change.assetId}`;
          const assetDetail = assetDetails[compositeKey] || {};
          
          // Use campaign/asset group names from change record if available, otherwise from asset details
          const finalAssetDetails = {
            ...assetDetail,
            campaignName: change.campaignName || assetDetail.campaignName || `Campaign ${change.campaignId}`,
            assetGroupName: change.assetGroupName || assetDetail.assetGroupName || `Asset Group ${change.assetGroupId}`
          };
          
          return {
            ...change,
            assetDetails: finalAssetDetails,
            changeType: change.action,
            needsGoogleAdsUpdate: ['pause', 'resume', 'remove', 'add'].includes(change.action)
          };
        })
        .sort((a, b) => new Date(b.changedAt) - new Date(a.changedAt))
        .slice(0, 100);

      return res.status(200).json({
        success: true,
        data: allChanges
      });
    } catch (error) {
      console.error('Error fetching changes:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}