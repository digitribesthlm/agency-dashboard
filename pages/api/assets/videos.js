import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { connectToDatabase } from '../../../lib/mongodb';

export default async function handler(req, res) {
  console.log('Starting video assets retrieval process');

  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    console.log('Unauthorized access attempt');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  console.log('Session retrieved:', session);

  if (req.method !== 'GET') {
    console.log(`Method not allowed: ${req.method}`);
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    console.log('Connecting to MongoDB');
    const { db } = await connectToDatabase();
    console.log('Connected to MongoDB');
    
    console.log('Fetching video assets from PMax_Assets collection');
    const videoAssets = await db.collection('PMax_Assets')
      .find({ 'Asset Type': 'YOUTUBE_VIDEO' })
      .toArray();

    console.log(`Found ${videoAssets.length} video assets`);
    if (videoAssets.length > 0) {
      console.log('Sample video asset:', {
        id: videoAssets[0]['Asset ID'],
        title: videoAssets[0]['Video Title'],
        videoId: videoAssets[0]['Video ID']
      });
    } else {
      console.log('No video assets found');
    }

    const formattedVideoAssets = videoAssets.map(asset => ({
      'Asset ID': asset['Asset ID']?.$numberLong || asset['Asset ID'],
      'Account ID': asset['Account ID']?.$numberLong || asset['Account ID'],
      'Campaign ID': asset['Campaign ID']?.$numberLong || asset['Campaign ID'],
      'AssetGroup ID': asset['AssetGroup ID']?.$numberLong || asset['AssetGroup ID'],
      'Video Title': asset['Video Title'],
      'video_id': asset['Video ID'],
      'Performance Label': asset['Performance Max Label'],
      'Asset Type': asset['Asset Type'],
      'Final URL': asset['Final URL']
    }));

    console.log('Formatted Video Assets:', formattedVideoAssets);

    res.status(200).json(formattedVideoAssets);
  } catch (error) {
    console.error('Error fetching video assets:', error);
    res.status(500).json({ message: 'Error fetching video assets' });
  }
}