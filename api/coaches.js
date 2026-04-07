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
    const collection = db.collection('coaches');

    const { id } = request.query;

    switch (request.method) {
      case 'GET':
        if (id) {
          const coach = await collection.findOne({ id });
          return coach ? response.status(200).json(coach) : response.status(404).json({ error: 'Coach not found' });
        }
        const coaches = await collection.find({}).toArray();
        return response.status(200).json(coaches || []);

      case 'POST':
        const newCoach = { id: 'c' + Date.now(), ...request.body, createdAt: new Date().toISOString() };
        await collection.insertOne(newCoach);
        return response.status(201).json(newCoach);

      case 'PUT':
        if (!id) return response.status(400).json({ error: 'ID is required' });
        await collection.updateOne({ id }, { $set: request.body });
        return response.status(200).json({ message: 'Updated' });

      case 'DELETE':
        if (!id) return response.status(400).json({ error: 'ID is required' });
        await collection.deleteOne({ id });
        return response.status(200).json({ message: 'Deleted' });

      default:
        return response.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('API Error:', error);
    return response.status(500).json({ error: error.message });
  }
}

