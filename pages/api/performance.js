import { connectToDatabase } from '../../lib/mongodb';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { accountId } = req.body;
    console.log('Fetching performance data for Account ID:', accountId);

    const { db } = await connectToDatabase();
    
    const performance = await db.collection('PMax_Assets')
      .find({ 
        'Account ID': Number(accountId)
      })
      .toArray();

    console.log('Found performance metrics:', performance.length);

    return res.status(200).json({
      success: true,
      data: performance.map(item => ({
        campaignName: item['Campaign Name'],
        assetGroupName: item['Asset Group Name'],
        assetType: item['Asset Type'],
        status: item['Campaign Status'],
        finalUrl: item['Final URL']
      }))
    });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
} 