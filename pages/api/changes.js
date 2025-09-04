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

      // Build query for asset changes
      let query = {};
      if (assetGroupId) {
        query.assetGroupId = Number(assetGroupId);
      }
      if (campaignId) {
        query.campaignId = Number(campaignId);
      }
      if (accountId) {
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

      // Get all changes for this asset group and campaign
      const changes = await db.collection('asset_changes')
        .find(query)
        .sort({ changedAt: -1 })
        .limit(100) // Increased limit
        .toArray();

      // Also get status changes for completeness
      const statusChanges = await db.collection('asset_status_changes')
        .find(query)
        .sort({ changedAt: -1 })
        .limit(100)
        .toArray();

      console.log('Changes API Debug:', {
        query,
        changesCount: changes.length,
        statusChangesCount: statusChanges.length,
        sampleChanges: changes.slice(0, 2),
        sampleStatusChanges: statusChanges.slice(0, 2)
      });

      // Get asset details for context using composite key (Asset Group ID + Asset ID)
      const assetLookupKeys = [...new Set([...changes, ...statusChanges].map(c => `${c.assetGroupId}_${c.assetId}`))];
      console.log('Asset lookup keys found in changes:', assetLookupKeys);
      const assetDetails = {};
      
      if (assetLookupKeys.length > 0) {
        // Build queries for both collections using composite key
        const pmaxQuery = [];
        const pendingQuery = [];
        
        changes.forEach(change => {
          const assetId = change.assetId;
          const assetGroupId = change.assetGroupId;
          
          // Try both string and numeric versions of Asset ID
          pmaxQuery.push({
            'Asset ID': assetId,
            'Asset Group ID': assetGroupId
          });
          pmaxQuery.push({
            'Asset ID': Number(assetId),
            'Asset Group ID': assetGroupId
          });
          
          pendingQuery.push({
            'Asset ID': assetId,
            'Asset Group ID': assetGroupId
          });
          pendingQuery.push({
            'Asset ID': Number(assetId),
            'Asset Group ID': assetGroupId
          });
        });
        
        // Check PMax_Assets collection with composite key
        const assets = await db.collection('PMax_Assets')
          .find({ $or: pmaxQuery })
          .toArray();
        console.log('Found assets in PMax_Assets:', assets.length);
        assets.forEach(asset => {
          const key = `${asset['Asset Group ID']}_${asset['Asset ID']}`;
          assetDetails[key] = {
            assetType: asset['Asset Type'],
            fieldType: asset['Field Type'],
            textContent: asset['Text Content'],
            assetUrl: asset['Asset URL'] || asset['Image URL'] || asset['Video URL'],
            campaignName: asset['Campaign Name'],
            assetGroupName: asset['Asset Group Name']
          };
        });

        // Also check pending_headlines collection with composite key
        const pendingHeadlines = await db.collection('pending_headlines')
          .find({ $or: pendingQuery })
          .toArray();
        console.log('Found assets in pending_headlines:', pendingHeadlines.length);
        pendingHeadlines.forEach(asset => {
          const key = `${asset['Asset Group ID']}_${asset['Asset ID']}`;
          // Only add if not already found in PMax_Assets (PMax_Assets takes precedence)
          if (!assetDetails[key]) {
            assetDetails[key] = {
              assetType: asset['Asset Type'],
              fieldType: asset['Field Type'],
              textContent: asset['Text Content'],
              assetUrl: asset['Asset URL'] || asset['Image URL'] || asset['Video URL'],
              campaignName: asset['Campaign Name'] || 'Pending',
              assetGroupName: asset['Asset Group Name'] || 'Pending'
            };
          }
        });
      }

      // Combine and sort all changes, adding asset context
      const allChanges = [...changes, ...statusChanges]
        .map(change => {
          const compositeKey = `${change.assetGroupId}_${change.assetId}`;
          return {
            ...change,
            assetDetails: assetDetails[compositeKey] || {},
            changeType: change.action,
            needsGoogleAdsUpdate: ['pause', 'resume', 'remove', 'add'].includes(change.action)
          };
        })
        .sort((a, b) => new Date(b.changedAt) - new Date(a.changedAt))
        .slice(0, 100); // Final limit

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
