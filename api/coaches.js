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
    return client.db('chesskidoo').collection('coaches');
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
      const coaches = await collection.find({}).toArray();
      return response.status(200).json(coaches);
    } 
    else if (request.method === 'POST') {
      const newCoach = { 
        id: 'c' + Date.now(), 
        ...request.body,
        createdAt: new Date()
      };
      await collection.insertOne(newCoach);
      return response.status(201).json(newCoach);
    } 
    else if (request.method === 'PUT') {
      const { id } = request.query;
      const result = await collection.updateOne(
        { id: id },
        { $set: request.body }
      );
      if (result.matchedCount === 0) return response.status(404).json({ error: 'Coach not found' });
      return response.status(200).json({ message: 'Updated' });
    } 
    else if (request.method === 'DELETE') {
      const { id } = request.query;
      await collection.deleteOne({ id: id });
      return response.status(200).json({ message: 'Coach deleted' });
    } 
    else {
      return response.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error:', error);
    return response.status(500).json({ error: 'Server error' });
  }
}
