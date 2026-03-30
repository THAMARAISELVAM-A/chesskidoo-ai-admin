 const { MongoClient, ServerApiVersion } = require('mongodb');

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function connectDB() {
  try {
    await client.connect();
    return client.db('chesskidoo').collection('payments');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
}

export default async function handler(request, response) {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (request.method === 'OPTIONS') return response.status(200).end();

  try {
    const collection = await connectDB();

    if (request.method === 'GET') {
      const payments = await collection.find({}).toArray();
      return response.status(200).json(payments);
    } 
    else if (request.method === 'POST') {
      const newPayment = {
        id: 'pay' + Date.now(),
        student_id: request.body.student_id,
        amount: request.body.amount,
        date: new Date().toISOString(),
        status: 'Completed',
        method: request.body.method
      };
      await collection.insertOne(newPayment);
      return response.status(201).json(newPayment);
    } 
    else {
      return response.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error:', error);
    return response.status(500).json({ error: 'Server error' });
  }
}
