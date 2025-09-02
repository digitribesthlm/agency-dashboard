import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import { connectToDatabase } from '../../lib/mongodb';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  try {
    const { db } = await connectToDatabase();

    if (req.method === 'GET') {
      const { assetGroupId, all } = req.query;
      
      if (all === 'true') {
        // Fetch all videos from the database for library selection
        const pendingVideos = await db.collection('pending_videos').find({}).toArray();
        const pmaxVideos = await db.collection('PMax_Assets').find({
          'Asset Type': 'VIDEO'
        }).toArray();
        
        // Combine and deduplicate
        const allVideos = [...pendingVideos, ...pmaxVideos];
        const uniqueVideos = allVideos.filter((video, index, self) => 
          index === self.findIndex(vid => vid['Asset ID'] === video['Asset ID'])
        );
        
        return res.status(200).json({ 
          success: true, 
          data: uniqueVideos 
        });
      } else if (assetGroupId) {
        // Fetch pending videos for specific asset group
        const pendingVideos = await db.collection('pending_videos').find({
          'Asset Group ID': Number(assetGroupId)
        }).toArray();
        
        return res.status(200).json({ 
          success: true, 
          data: pendingVideos 
        });
      }
      
      return res.status(400).json({ success: false, message: 'Missing parameters' });
    }

    if (req.method === 'POST') {
      const { videoId, videoTitle, assetGroupId, campaignId, accountId } = req.body;
      
      if (!videoId || !assetGroupId) {
        return res.status(400).json({ success: false, message: 'Missing required fields' });
      }

      // Generate a unique asset ID
      const assetId = Date.now().toString();
      
      const videoData = {
        'Asset ID': assetId,
        'Video ID': videoId,
        'Video Title': videoTitle || 'Untitled Video',
        'Asset Type': 'VIDEO',
        'Performance Label': 'PENDING',
        'Campaign ID': campaignId || 'unknown',
        'Asset Group ID': Number(assetGroupId),
        'Account ID': Number(accountId) || 1,
        'isPending': true,
        'createdBy': session.user.email,
        'createdAt': new Date(),
        'approved': false
      };

      // Save to pending_videos collection
      await db.collection('pending_videos').insertOne(videoData);

      // Also save to PMax_Assets for consistency
      await db.collection('PMax_Assets').insertOne({
        ...videoData,
        'Asset Group Status': 'PENDING'
      });

      // Record the change
      await db.collection('asset_changes').insertOne({
        assetGroupId: Number(assetGroupId),
        campaignId: campaignId || 'unknown',
        accountId: Number(accountId) || 1,
        assetId: assetId,
        assetType: 'video',
        action: 'add',
        status: 'PENDING',
        data: { videoId, videoTitle },
        changedBy: session.user.email,
        changedAt: new Date(),
        userRole: session.user.role || 'client'
      });

      return res.status(200).json({ 
        success: true, 
        data: { assetId },
        message: 'Video added successfully' 
      });
    }

    return res.status(405).json({ success: false, message: 'Method not allowed' });
  } catch (error) {
    console.error('Error in videos API:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}
