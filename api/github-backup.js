import { Octokit } from "@octokit/rest";

export default async function handler(request, response) {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (request.method === 'OPTIONS') return response.status(200).end();

  const { GITHUB_TOKEN, GITHUB_REPO, GITHUB_OWNER } = process.env;

  if (!GITHUB_TOKEN || !GITHUB_REPO || !GITHUB_OWNER) {
    return response.status(500).json({ error: 'GitHub environment not configured' });
  }

  try {
    const octokit = new Octokit({ auth: GITHUB_TOKEN });
    
    switch (request.method) {
      case 'POST': {
        const { action, data, filename, branch } = request.body;
        
        if (action === 'backup') {
          const content = JSON.stringify(data, null, 2);
          const contentBase64 = Buffer.from(content).toString('base64');
          
          const path = branch ? `backup/${branch}/${filename}` : `backup/${filename}`;
          
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
              message: `backup: ${filename} - ${new Date().toISOString()}`,
              content: contentBase64,
              sha: existing.data.sha
            });
          } catch (e) {
            if (e.status === 404) {
              await octokit.repos.createOrUpdateFileContents({
                owner: GITHUB_OWNER,
                repo: GITHUB_REPO,
                path: path,
                message: `backup: ${filename} - ${new Date().toISOString()}`,
                content: contentBase64
              });
            } else throw e;
          }
          
          return response.status(200).json({ 
            success: true, 
            message: 'Backup created successfully',
            path: path
          });
        }
        
        return response.status(400).json({ error: 'Invalid action' });
      }
      
      case 'GET': {
        const path = request.query.path || 'backups';
        
        try {
          const contents = await octokit.repos.getContent({
            owner: GITHUB_OWNER,
            repo: GITHUB_REPO,
            path: path
          });
          
          return response.status(200).json(Array.isArray(contents.data) ? contents.data : [contents.data]);
        } catch (e) {
          if (e.status === 404) {
            return response.status(200).json([]);
          }
          throw e;
        }
      }
      
      default:
        return response.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('GitHub Backup Error:', error);
    return response.status(500).json({ error: error.message });
  }
}