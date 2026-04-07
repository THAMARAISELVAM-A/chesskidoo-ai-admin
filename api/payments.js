 import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
let cachedClient = null;

async function connectToDatabase() {
  if (cachedClient && cachedClient.topology && cachedClient.topology.isConnected()) {
    return cachedClient;
  }
  if (!uri) throw new Error('MONGODB_URI is not defined');
  try {
    const client = new MongoClient(uri, { retryWrites: true, w: 'majority' });
    await client.connect();
    cachedClient = client;
    return client;
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    throw error;
  }
}

export default async function handler(request, response) {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (request.method === 'OPTIONS') return response.status(200).end();

  try {
    const client = await connectToDatabase();
    const db = client.db('chesskidoo');
    const collection = db.collection('payments');

    switch (request.method) {
      case 'GET':
        const payments = await collection.find({}).toArray();
        return response.status(200).json(payments || []);

      case 'POST':
        const newPayment = { id: 'p' + Date.now(), ...request.body, createdAt: new Date().toISOString() };
        await collection.insertOne(newPayment);
        return response.status(201).json(newPayment);

      default:
        return response.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('API Error:', error);
    return response.status(500).json({ error: error.message });
  }
}

