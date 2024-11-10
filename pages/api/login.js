// pages/api/login.js
import { connectToDatabase } from '../../lib/mongodb';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    console.log('Server: Attempting login for:', email);

    const { db } = await connectToDatabase();

    // Find user in database
    const user = await db.collection('users').findOne({ email });

    if (!user) {
      console.log('Server: User not found');
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // In production, you should use proper password hashing
    if (user.password !== password) {
      console.log('Server: Invalid password');
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Remove password from user object before sending
    const { password: _, ...userWithoutPassword } = user;

    console.log('Server: Login successful');
    return res.status(200).json({
      message: 'Logged in successfully',
      user: {
        email: userWithoutPassword.email,
        role: userWithoutPassword.role
      }
    });

  } catch (error) {
    console.error('Server Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}