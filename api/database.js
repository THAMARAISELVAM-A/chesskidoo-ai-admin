import { MongoClient } from 'mongodb';
import { Octokit } from "@octokit/rest";

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
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (request.method === 'OPTIONS') return response.status(200).end();

  const { GITHUB_TOKEN, GITHUB_REPO, GITHUB_OWNER } = process.env;

  try {
    const client = await connectToDatabase();
    const db = client.db('chesskidoo');

    switch (request.method) {
      case 'GET': {
        const collections = await db.listCollections().toArray();
        const allData = {};
        
        for (const coll of collections) {
          const data = await db.collection(coll.name).find({}).toArray();
          allData[coll.name] = data;
        }
        
        return response.status(200).json(allData);
      }
      
      case 'POST': {
        if (!GITHUB_TOKEN || !GITHUB_REPO || !GITHUB_OWNER) {
          return response.status(500).json({ error: 'GitHub not configured' });
        }

        const collections = await db.listCollections().toArray();
        const allData = {};
        
        for (const coll of collections) {
          const data = await db.collection(coll.name).find({}).toArray();
          allData[coll.name] = data;
        }
        
        const content = JSON.stringify(allData, null, 2);
        const contentBase64 = Buffer.from(content).toString('base64');
        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `chesskidoo-full-backup-${timestamp}.json`;
        const path = `backups/${filename}`;
        
        const octokit = new Octokit({ auth: GITHUB_TOKEN });
        
        try {
          const existing = await octokit.repos.getContent({
            owner: GITHUB_OWNER,
            repo: GITHUB_REPO,
            path: path
          });
          
          await octokit.repos.createOrUpdateFileContents({
            owner: GITHUB_OWNER,
            repo: GITHUB_REPO,
            path: path,
            message: `Auto backup: Chesskidoo data ${timestamp}`,
            content: contentBase64,
            sha: existing.data.sha
          });
        } catch (e) {
          if (e.status === 404) {
            await octokit.repos.createOrUpdateFileContents({
              owner: GITHUB_OWNER,
              repo: GITHUB_REPO,
              path: path,
              message: `Auto backup: Chesskidoo data ${timestamp}`,
              content: contentBase64
            });
          } else throw e;
        }
        
        return response.status(200).json({ 
          success: true, 
          message: 'Full backup created successfully',
          filename: filename,
          collectionsCount: collections.length,
          totalRecords: Object.values(allData).reduce((sum, arr) => sum + arr.length, 0)
        });
      }
      
      default:
        return response.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Database/Backup Error:', error);
    return response.status(500).json({ error: error.message });
  }
}