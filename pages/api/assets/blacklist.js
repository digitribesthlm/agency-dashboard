import { connectToDatabase } from '../../../lib/mongodb';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { db } = await connectToDatabase();
    
    // Get all active blocked assets and ensure numeric fields
    const blacklist = await db.collection('PMAX_Assets_black_list')
      .find({ 
        status: 'ACTIVE',
      })
      .project({
        assetId: 1,
        accountId: 1,
        campaignId: 1,
        assetGroupId: 1,
        block_level: 1,
        status: 1
      })
      .toArray();

    // Convert IDs to numbers
    const formattedBlacklist = blacklist.map(item => ({
      ...item,
      assetId: Number(item.assetId),
      accountId: Number(item.accountId),
      campaignId: Number(item.campaignId),
      assetGroupId: Number(item.assetGroupId)
    }));

    console.log('Sending blacklist:', formattedBlacklist);
    
    res.status(200).json(formattedBlacklist);
  } catch (error) {
    console.error('Error fetching blacklist:', error);
    res.status(500).json({ message: 'Error fetching blacklist' });
  }
}