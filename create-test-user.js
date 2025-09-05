const { MongoClient } = require('mongodb');
require('dotenv').config();

async function createTestUser() {
  const client = await MongoClient.connect(process.env.MONGODB_URI);
  const db = client.db(process.env.MONGODB_DB);

  const userData = {
    email: 'test@example.com',
    password: 'password123', // Plain text as per the auth provider
    name: 'Test User',
    role: 'client',
    'Account ID': 1,
    clientId: 'test-client'
  };

  try {
    await db.collection('users').insertOne(userData);
    console.log('Test user created successfully');
    console.log('Email: test@example.com');
    console.log('Password: password123');
  } catch (error) {
    if (error.code === 11000) {
      console.log('User already exists');
    } else {
      console.error('Error creating user:', error);
    }
  }
  
  await client.close();
}

createTestUser().catch(console.error);



