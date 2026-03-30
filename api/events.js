 import { MongoClient, ServerApiVersion } from 'mongodb';

const uri = process.env.MONGODB_URI;
let client;

async function getDB() {
  if (!client) {
    client = new MongoClient(uri, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      }
    });
    await client.connect();
  }
  return client.db('chesskidoo');
}

export default async function handler(request, response) {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (request.method === 'OPTIONS') return response.status(200).end();

  try {
    const db = await getDB();
    const collection = db.collection('events');

    if (request.method === 'GET') {
      const events = await collection.find({}).toArray();
      return response.status(200).json(events);
    } 
    else if (request.method === 'POST') {
      const newEvent = { id: 'e' + Date.now(), ...request.body };
      await collection.insertOne(newEvent);
      return response.status(201).json(newEvent);
    } 
    else if (request.method === 'DELETE') {
      const { id } = request.query;
      await collection.deleteOne({ id });
      return response.status(200).json({ message: 'Deleted' });
    } 
    else {
      return response.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    return response.status(500).json({ error: error.message });
  }
}
