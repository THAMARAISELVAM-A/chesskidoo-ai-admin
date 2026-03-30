 import { MongoClient, ServerApiVersion } from 'mongodb';

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

let cachedClient = null;

async function connectDB() {
  if (cachedClient) {
    return cachedClient.db('chesskidoo').collection('students');
  }
  
  try {
    const newClient = await client.connect();
    cachedClient = newClient;
    return newClient.db('chesskidoo').collection('students');
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
      const students = await collection.find({}).toArray();
      return response.status(200).json(students);
    } 
    else if (request.method === 'POST') {
      const newStudent = { 
        id: 's' + Date.now(), 
        ...request.body,
        createdAt: new Date()
      };
      await collection.insertOne(newStudent);
      return response.status(201).json(newStudent);
    } 
    else if (request.method === 'PUT') {
      const { id } = request.query;
      const result = await collection.updateOne(
        { id: id },
        { $set: request.body }
      );
      if (result.matchedCount === 0) return response.status(404).json({ error: 'Student not found' });
      return response.status(200).json({ message: 'Updated' });
    } 
    else if (request.method === 'DELETE') {
      const { id } = request.query;
      await collection.deleteOne({ id: id });
      return response.status(200).json({ message: 'Student deleted' });
    } 
    else {
      return response.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error:', error);
    return response.status(500).json({ error: error.message });
  }
}
