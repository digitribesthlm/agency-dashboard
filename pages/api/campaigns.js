import { connectToDatabase } from '../../lib/mongodb';
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { db } = await connectToDatabase();
    
    // Fetch campaigns based on user's email
    const campaigns = await db
      .collection('campaigns')
      .find({ userEmail: session.user.email })
      .toArray();

    return res.status(200).json(campaigns);
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
} 