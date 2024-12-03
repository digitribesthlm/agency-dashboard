import { connectToDatabase } from '../../../lib/mongodb';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { db } = await connectToDatabase();
    
    // Just get all blocked assets
    const blacklist = await db.collection('PMAX_Assets_black_list')
      .find({ status: 'ACTIVE' })
      .toArray();

    console.log('Blocked assets:', blacklist);
    
    res.status(200).json(blacklist);
  } catch (error) {
    console.error('Error fetching blacklist:', error);
    res.status(500).json({ message: 'Error fetching blacklist' });
  }
}