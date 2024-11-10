import { connectToDatabase } from '../../lib/mongodb';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Here you would normally get the user ID from the session
    // For now, let's return the basic user data
    const { email } = req.query; // We'll need to pass this from the dashboard

    const { db } = await connectToDatabase();
    const user = await db.collection('users').findOne(
      { email },
      { projection: { password: 0 } } // Exclude password from the result
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json(user);
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
} 