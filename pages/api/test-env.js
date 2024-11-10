// pages/api/test-env.js
export default function handler(req, res) {
    console.log('Environment Variables Test:');
    console.log('MONGODB_URI:', process.env.MONGODB_URI ? 'Exists' : 'Missing');
    console.log('NODE_ENV:', process.env.NODE_ENV);
    
    res.status(200).json({
      mongodbUri: process.env.MONGODB_URI ? 'Exists' : 'Missing',
      nodeEnv: process.env.NODE_ENV,
      allEnvs: Object.keys(process.env)
    });
  }