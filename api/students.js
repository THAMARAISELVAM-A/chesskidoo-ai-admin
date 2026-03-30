 import { MongoClient, ServerApiVersion } from 'mongodb';

const uri = process.env.MONGODB_URI;
let cachedClient = null;

async function connectToDatabase() {
  if (cachedClient) {
    return cachedClient;
  }

  try {
    const client = new MongoClient(uri, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: false,
        deprecationErrors: true,
      },
      retryWrites: true,
      w: 'majority',
      maxPoolSize: 1,
      minPoolSize: 1,
    });

    await client.connect();
    cachedClient = client;
    return client;
  } catch (error) {
    console.error('MongoDB connection failed:', error);
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
    const collection = db.collection('students');

    if (request.method === 'GET') {
      const students = await collection.find({}).toArray();
      return response.status(200).json(students);
    } 
    else if (request.method === 'POST') {
      const newStudent = { id: 's' + Date.now(), ...request.body };
      await collection.insertOne(newStudent);
      return response.status(201).json(newStudent);
    } 
    else if (request.method === 'PUT') {
      const { id } = request.query;
      const result = await collection.findOneAndUpdate(
        { id },
        { $set: request.body },
        { returnDocument: 'after' }
      );
      return response.status(200).json(result.value || { message: 'Updated' });
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
    console.error('API Error:', error);
    return response.status(500).json({ error: error.message || 'Server error' });
  }
}
