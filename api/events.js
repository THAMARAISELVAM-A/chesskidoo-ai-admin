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
    return client.db('chesskidoo').collection('events');
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
      const events = await collection.find({}).toArray();
      return response.status(200).json(events);
    } 
    else if (request.method === 'POST') {
      const newEvent = {
        id: 'e' + Date.now(),
        title: request.body.title,
        date: request.body.date,
        type: request.body.type,
        prize: request.body.prize,
        location: request.body.location,
        registrations_count: 0,
        createdAt: new Date()
      };
      await collection.insertOne(newEvent);
      return response.status(201).json(newEvent);
    } 
    else if (request.method === 'DELETE') {
      const { id } = request.query;
      await collection.deleteOne({ id: id });
      return response.status(200).json({ message: 'Event deleted' });
    } 
    else {
      return response.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error:', error);
    return response.status(500).json({ error: 'Server error' });
  }
}
