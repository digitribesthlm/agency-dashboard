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
        accountId,
        data,
        previousData 
      } = req.body;

      if (!action || !assetType || !assetGroupId) {
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

      // Create change record
      const changeRecord = {
        action, // 'add', 'pause', 'resume', 'remove', 'update'
        assetType, // 'headline', 'description', 'image', 'video', 'landing_page'
        assetId: assetId || `temp_${Date.now()}`,
        assetGroupId,
        campaignId: finalCampaignId || 'unknown',
        accountId: accountId || 1,
        data, // New data
        previousData, // Previous data for updates
        changedBy: session.user.email,
        changedAt: new Date(),
        userRole: session.user.role,
        status: 'pending' // pending, approved, rejected
      };

      // Insert into changes collection
      const result = await db.collection('asset_changes').insertOne(changeRecord);

      // Also update the specific collection based on asset type
      let collectionName = '';
      let updateData = {};

      switch (assetType) {
        case 'headline':
          collectionName = 'pending_headlines';
          updateData = {
            'Text Content': data.text,
            'Asset Type': 'TEXT',
            'Field Type': 'HEADLINE',
            'Performance Label': 'PENDING',
            'Campaign ID': campaignId,
            'Asset Group ID': assetGroupId,
            'Account ID': accountId || 1,
            'isPending': true,
            'createdBy': session.user.email,
            'createdAt': new Date(),
            'approved': false,
            'changeId': result.insertedId
          };
          break;

        case 'description':
          collectionName = 'pending_descriptions';
          updateData = {
            'Text Content': data.text,
            'Asset Type': 'TEXT',
            'Field Type': 'DESCRIPTION',
            'Performance Label': 'PENDING',
            'Campaign ID': campaignId,
            'Asset Group ID': assetGroupId,
            'Account ID': accountId || 1,
            'isPending': true,
            'createdBy': session.user.email,
            'createdAt': new Date(),
            'approved': false,
            'changeId': result.insertedId
          };
          break;

        case 'landing_page':
          collectionName = 'pending_landing_pages';
          updateData = {
            'Final URL': data.url,
            'Campaign ID': campaignId,
            'Asset Group ID': assetGroupId,
            'Account ID': accountId || 1,
            'isPending': true,
            'createdBy': session.user.email,
            'createdAt': new Date(),
            'approved': false,
            'changeId': result.insertedId
          };
          break;

        case 'image':
        case 'video':
          collectionName = 'asset_status_changes';
          updateData = {
            assetId,
            assetType,
            action,
            assetGroupId,
            campaignId,
            accountId: accountId || 1,
            changedBy: session.user.email,
            changedAt: new Date(),
            changeId: result.insertedId
          };
          break;
      }

      if (collectionName && updateData) {
        await db.collection(collectionName).insertOne(updateData);
      }

      return res.status(201).json({
        success: true,
        message: 'Change recorded successfully',
        data: {
          changeId: result.insertedId,
          assetId: updateData.assetId || changeRecord.assetId
        }
      });

    } catch (error) {
      console.error('Error recording change:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  if (req.method === 'GET') {
    try {
      const { assetGroupId, assetType } = req.query;
      const { db } = await connectToDatabase();

      let query = {};
      if (assetGroupId) {
        query.assetGroupId = Number(assetGroupId);
      }
      if (assetType) query.assetType = assetType;

      console.log('Fetching changes with query:', query);
      console.log('AssetGroupId from query:', assetGroupId, 'Converted to number:', Number(assetGroupId));

      // Get changes for the specific asset group
      const changes = await db.collection('asset_changes')
        .find(query)
        .sort({ changedAt: -1 })
        .toArray();

      console.log(`Found ${changes.length} changes for assetGroupId: ${assetGroupId}`);
      console.log('Changes:', changes.map(c => ({ action: c.action, assetType: c.assetType, changedBy: c.changedBy, changedAt: c.changedAt })));

      return res.status(200).json({
        success: true,
        data: changes
      });

    } catch (error) {
      console.error('Error fetching changes:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
