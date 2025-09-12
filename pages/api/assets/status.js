import { connectToDatabase } from '../../../lib/mongodb';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  // Authentication check
  const session = await getServerSession(req, res, authOptions);
  if (!session || !session.user) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  try {
    const { db } = await connectToDatabase();
    const { assetGroupId, campaignId, newStatus } = req.body;

    if (!assetGroupId || !campaignId || !newStatus) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields: assetGroupId, campaignId, newStatus' 
      });
    }

    // Validate status value (PENDING is set by Google, not user-selectable)
    const validStatuses = ['ENABLED', 'PAUSED', 'REMOVED'];
    if (!validStatuses.includes(newStatus)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid status. Must be one of: ' + validStatuses.join(', ') 
      });
    }

    // Update all assets in the asset group with the new status
    const updateResult = await db.collection('assets').updateMany(
      { 
        asset_group_id: assetGroupId,
        campaign_id: campaignId
      },
      { 
        $set: { 
          asset_group_status: newStatus,
          updated_at: new Date()
        } 
      }
    );

    if (updateResult.matchedCount === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'No assets found for the specified asset group' 
      });
    }

    // Log the change for audit trail
    const changeLog = {
      action: 'STATUS_CHANGE',
      asset_group_id: assetGroupId,
      campaign_id: campaignId,
      old_status: 'UNKNOWN', // We don't track old status currently
      new_status: newStatus,
      changed_by: session.user.email,
      changed_at: new Date(),
      needs_google_ads_update: true
    };

    await db.collection('asset_changes').insertOne(changeLog);

    console.log(`Asset group ${assetGroupId} status updated to ${newStatus} by ${session.user.email}`);

    return res.status(200).json({ 
      success: true, 
      message: `Asset group status updated to ${newStatus}`,
      updatedCount: updateResult.modifiedCount
    });

  } catch (error) {
    console.error('Error updating asset group status:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
}
