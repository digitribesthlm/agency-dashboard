const bcrypt = require('bcryptjs');
const { MongoClient } = require('mongodb');
require('dotenv').config();

async function createUser() {
  const client = await MongoClient.connect(process.env.MONGODB_URI);
  const db = client.db(process.env.MONGODB_DB);

  // Template values - DO NOT fill these in
  const userData = {
    email: 'EXAMPLE_EMAIL',
    password: 'EXAMPLE_PASSWORD',
    name: 'EXAMPLE_NAME',
    role: 'EXAMPLE_ROLE'
  };

  // Hash password before storing
  const hashedPassword = await bcrypt.hash(userData.password, 10);

  const user = {
    ...userData,
    password: hashedPassword,
    created_at: new Date(),
    status: 'active'
  };

  await db.collection('users').insertOne(user);
  console.log('User created successfully');
  
  await client.close();
}

createUser().catch(console.error); 