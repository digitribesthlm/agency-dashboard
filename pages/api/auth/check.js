import { getServerSession } from 'next-auth/next';
import { authOptions } from './[...nextauth]';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);

  if (session) {
    return res.status(200).json({
      authenticated: true,
      user: session.user
    });
  }

  return res.status(401).json({
    authenticated: false
  });
} 