import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { connectToDatabase } from '../../../lib/mongodb';
import { Long } from 'mongodb';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { db } = await connectToDatabase();
    
    // Convert account ID to MongoDB Long
    const accountId = Long.fromString(session.user.accountId.toString());
    
    // Query videos matching exact document structure
    const videos = await db.collection('PMAX_Assets')
      .find({ 
        'Account ID': accountId,
        'Asset Type': 'YOUTUBE_VIDEO',
        'Field Type': 'YOUTUBE_VIDEO'
      })
      .toArray();

    console.log(`Found ${videos.length} videos for account ${session.user.accountId}`);
    if (videos.length > 0) {
      console.log('Sample video:', {
        id: videos[0]['Asset ID'],
        title: videos[0]['Video Title'],
        videoId: videos[0]['Video ID']
      });
    }

    // Transform for frontend
    const formattedVideos = videos.map(video => ({
      'Asset ID': video['Asset ID']?.$numberLong || video['Asset ID'],
      'Account ID': video['Account ID']?.$numberLong || video['Account ID'],
      'Campaign ID': video['Campaign ID']?.$numberLong || video['Campaign ID'],
      'Asset Group ID': video['Asset Group ID']?.$numberLong || video['Asset Group ID'],
      'Video Title': video['Video Title'],
      'video_id': video['Video ID'],
      'Performance Label': video['Performance Max Label'],
      'Asset Type': video['Asset Type'],
      'Final URL': video['Final URL']
    }));

    res.status(200).json(formattedVideos);
  } catch (error) {
    console.error('Error fetching videos:', error);
    res.status(500).json({ message: 'Error fetching videos' });
  }
}