const bcrypt = require('bcryptjs');
const { MongoClient } = require('mongodb');
require('dotenv').config();

async function createUser() {
  const client = await MongoClient.connect(process.env.MONGODB_URI);
  const db = client.db(process.env.MONGODB_DB);

  const password = 'your-password-here'; // Replace with actual password
  const hashedPassword = await bcrypt.hash(password, 10);

  const user = {
    username: 'admin',
    password: hashedPassword,
    email: 'admin@example.com',
    createdAt: new Date()
  };

  await db.collection('users').insertOne(user);
  console.log('User created successfully');
  
  await client.close();
}

createUser().catch(console.error); 