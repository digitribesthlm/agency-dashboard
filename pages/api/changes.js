import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import { connectToDatabase } from '../../lib/mongodb';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Only admin users can view changes
  if (session.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden - Admin access required' });
  }

  const { db } = await connectToDatabase();

  try {
    const { asset_group_id, needs_update, limit = 100 } = req.query;

    // Build query for asset_changes collection
    const query = {};
    
    if (asset_group_id) {
      query.asset_group_id = asset_group_id;
    }
    
    if (needs_update === 'true') {
      query.needs_google_ads_update = true;
    }

    console.log('Changes query:', query);

    // Fetch changes from asset_changes collection only
    const changes = await db.collection('asset_changes')
      .find(query)
      .sort({ changed_at: -1 })
      .limit(parseInt(limit))
      .toArray();

    // Transform data for frontend compatibility
    const transformedChanges = changes.map(change => ({
      id: change._id,
      asset_id: change.asset_id,
      action: change.action,
      asset_type: change.asset_type,
      campaign_id: change.campaign_id,
      campaign_name: change.campaign_name,
      asset_group_id: change.asset_group_id,
      asset_group_name: change.asset_group_name,
      changed_by: change.changed_by,
      changed_at: change.changed_at,
      needs_google_ads_update: change.needs_google_ads_update,
      
      // Frontend compatibility fields
      'Asset ID': change.asset_id,
      'Asset Type': change.asset_type,
      'Campaign ID': change.campaign_id,
      'Campaign Name': change.campaign_name,
      'AssetGroup ID': change.asset_group_id,
      'Asset Group Name': change.asset_group_name,
      'Changed By': change.changed_by,
      'Changed At': change.changed_at,
      'Action': change.action
    }));

    return res.status(200).json(transformedChanges);

  } catch (error) {
    console.error('Changes API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}