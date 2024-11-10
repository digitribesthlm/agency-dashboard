import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI;
console.log('MongoDB Connection Check:');
console.log('MONGODB_URI exists:', !!MONGODB_URI);
console.log('Current NODE_ENV:', process.env.NODE_ENV);

if (!MONGODB_URI) {
  console.error('MONGODB_URI is missing. Current environment variables:', Object.keys(process.env));
  if (process.env.NODE_ENV === 'development') {
    throw new Error(
      'Please define the MONGODB_URI environment variable in .env.local\n' +
      'Make sure the file is in the root directory and the server has been restarted.'
    );
  }
  throw new Error('MongoDB URI is not configured');
}

const options = {
  useUnifiedTopology: true,
  useNewUrlParser: true,
};

let client;
let clientPromise;

if (process.env.NODE_ENV === 'development') {
  if (!global._mongoClientPromise) {
    client = new MongoClient(MONGODB_URI, options);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  client = new MongoClient(MONGODB_URI, options);
  clientPromise = client.connect();
}

export default clientPromise;

export async function connectToDatabase() {
  try {
    const client = await clientPromise;
    const db = client.db("agency");
    return { client, db };
  } catch (error) {
    console.error('Database connection error:', error);
    throw new Error('Failed to connect to database');
  }
}