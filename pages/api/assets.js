import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import { connectToDatabase } from '../../lib/mongodb';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { db } = await connectToDatabase();

  try {
    switch (req.method) {
      case 'GET':
        return await handleGet(req, res, db);
      case 'POST':
        return await handlePost(req, res, db, session);
      case 'PUT':
        return await handlePut(req, res, db, session);
      case 'DELETE':
        return await handleDelete(req, res, db, session);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Assets API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// GET /api/assets?campaign_id=123&asset_group_id=456&asset_type=IMAGE&status=ACTIVE
async function handleGet(req, res, db) {
  const { campaign_id, asset_group_id, asset_type, status, all } = req.query;

  // Build query - ALWAYS filter out REMOVED assets
  const query = {
    status: { $ne: 'REMOVED' }
  };

  if (campaign_id) query.campaign_id = campaign_id;
  if (asset_group_id) query.asset_group_id = asset_group_id;
  if (asset_type) query.asset_type = asset_type;
  if (status) query.status = status;

  // If 'all=true', get all assets regardless of campaign/asset_group
  if (all === 'true') {
    delete query.campaign_id;
    delete query.asset_group_id;
  }

  console.log('Assets query:', query);

  const assets = await db.collection('assets').find(query).toArray();
  
  // Transform data for frontend compatibility
  const transformedAssets = assets.map(asset => ({
        ...asset,
    // Ensure consistent field names for frontend
    'Asset ID': asset.asset_id,
    'Asset Type': asset.asset_type,
    'Asset URL': asset.asset_url,
    'Campaign ID': asset.campaign_id,
    'Campaign Name': asset.campaign_name,
    'AssetGroup ID': asset.asset_group_id,
    'Asset Group Name': asset.asset_group_name,
    'Text Content': asset.text_content,
    'Field Type': asset.field_type,
    'Landing Page URL': asset.landing_page_url,
    'Performance Label': asset.performance_label || 'UNKNOWN',
    'Image URL': asset.asset_type === 'IMAGE' ? asset.asset_url : undefined,
    'Video Title': asset.asset_type === 'YOUTUBE_VIDEO' ? asset.text_content : undefined,
    'Video ID': asset.asset_type === 'YOUTUBE_VIDEO' ? asset.asset_url?.split('v=')[1] : undefined,
    'Video URL': asset.asset_type === 'YOUTUBE_VIDEO' ? asset.asset_url : undefined
  }));

  return res.status(200).json(transformedAssets);
}

// POST /api/assets (add new asset)
async function handlePost(req, res, db, session) {
  const {
    asset_type,
    asset_url,
    text_content,
    field_type,
    landing_page_url,
    campaign_id,
    campaign_name,
    asset_group_id,
    asset_group_name
  } = req.body;

  if (!asset_type || !campaign_id || !asset_group_id) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Generate unique asset_id
  const asset_id = Date.now().toString();

  const assetData = {
    account_id: "3729097555",
    campaign_id: campaign_id,
    campaign_name: campaign_name || 'Unknown Campaign',
    asset_group_id: asset_group_id,
    asset_group_name: asset_group_name || 'Unknown Asset Group',
    asset_id: asset_id,
    asset_type: asset_type,
    asset_url: asset_url,
    text_content: text_content || '',
    field_type: field_type || asset_type,
    landing_page_url: landing_page_url || '',
    status: 'ACTIVE',
    is_pending: true, // User-added assets are pending
    created_by: session.user.email,
    last_modified_by: session.user.email,
    created_at: new Date(),
    last_modified: new Date()
  };

  // Insert asset
  await db.collection('assets').insertOne(assetData);

  // Log change
  await logChange(db, {
    asset_id: asset_id,
    action: 'ADD',
    asset_type: asset_type,
    campaign_id: campaign_id,
    campaign_name: campaign_name || 'Unknown Campaign',
    asset_group_id: asset_group_id,
    asset_group_name: asset_group_name || 'Unknown Asset Group',
    changed_by: session.user.email,
    changed_at: new Date(),
    needs_google_ads_update: true
  });

  return res.status(201).json({ 
    success: true, 
    asset_id: asset_id,
    message: 'Asset added successfully' 
  });
}

// PUT /api/assets/:id (edit asset)
async function handlePut(req, res, db, session) {
  const { id } = req.query;
  const updateData = req.body;

  if (!id) {
    return res.status(400).json({ error: 'Asset ID required' });
  }

  // Get existing asset for change logging
  const existingAsset = await db.collection('assets').findOne({ asset_id: id });
  if (!existingAsset) {
    return res.status(404).json({ error: 'Asset not found' });
  }

  // Update asset
  const updateResult = await db.collection('assets').updateOne(
    { asset_id: id },
    { 
      $set: {
        ...updateData,
        last_modified_by: session.user.email,
        last_modified: new Date()
      }
    }
  );

  if (updateResult.matchedCount === 0) {
    return res.status(404).json({ error: 'Asset not found' });
  }

  // Log change
  await logChange(db, {
    asset_id: id,
    action: 'EDIT',
    asset_type: existingAsset.asset_type,
    campaign_id: existingAsset.campaign_id,
    campaign_name: existingAsset.campaign_name,
    asset_group_id: existingAsset.asset_group_id,
    asset_group_name: existingAsset.asset_group_name,
    changed_by: session.user.email,
    changed_at: new Date(),
    needs_google_ads_update: true
  });

  return res.status(200).json({ success: true, message: 'Asset updated successfully' });
}

// DELETE /api/assets/:id (mark as REMOVED)
async function handleDelete(req, res, db, session) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Asset ID required' });
  }

  // Get existing asset for change logging
  const existingAsset = await db.collection('assets').findOne({ asset_id: id });
  if (!existingAsset) {
    return res.status(404).json({ error: 'Asset not found' });
  }

  // Mark as REMOVED instead of actually deleting
  const updateResult = await db.collection('assets').updateOne(
    { asset_id: id },
    { 
      $set: {
        status: 'REMOVED',
        last_modified_by: session.user.email,
        last_modified: new Date()
      }
    }
  );

  if (updateResult.matchedCount === 0) {
    return res.status(404).json({ error: 'Asset not found' });
  }

  // Log change
  await logChange(db, {
    asset_id: id,
    action: 'REMOVE',
    asset_type: existingAsset.asset_type,
    campaign_id: existingAsset.campaign_id,
    campaign_name: existingAsset.campaign_name,
    asset_group_id: existingAsset.asset_group_id,
    asset_group_name: existingAsset.asset_group_name,
    changed_by: session.user.email,
    changed_at: new Date(),
    needs_google_ads_update: true
  });

  return res.status(200).json({ success: true, message: 'Asset removed successfully' });
}

// Helper function to log changes
async function logChange(db, changeData) {
  try {
    await db.collection('asset_changes').insertOne(changeData);
  } catch (error) {
    console.error('Error logging change:', error);
    // Don't fail the main operation if logging fails
  }
} 