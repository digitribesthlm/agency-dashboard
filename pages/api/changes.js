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

      // Get asset details for context
      const assetLookupKeys = [...new Set([...changes, ...statusChanges].map(c => `${c.campaignId}_${c.assetGroupId}_${c.assetId}`))];
      const assetDetails = {};
      
      if (assetLookupKeys.length > 0) {
        const pmaxQuery = [];
        [...changes, ...statusChanges].forEach(change => {
          const assetId = change.assetId;
          const assetGroupId = change.assetGroupId;
          const campaignId = change.campaignId;
          
          pmaxQuery.push({ 'Asset ID': assetId, 'Asset Group ID': assetGroupId, 'Campaign ID': Number(campaignId) });
          pmaxQuery.push({ 'Asset ID': Number(assetId), 'Asset Group ID': assetGroupId, 'Campaign ID': Number(campaignId) });
        });
        
        const assets = await db.collection('PMax_Assets')
          .find({ $or: pmaxQuery })
          .toArray();
          
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
      }

      // Combine and sort all changes
      const allChanges = [...changes, ...statusChanges]
        .map(change => {
          const compositeKey = `${change.campaignId}_${change.assetGroupId}_${change.assetId}`;
          const assetDetail = assetDetails[compositeKey] || {};
          return {
            ...change,
            assetDetails: assetDetail,
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