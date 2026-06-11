import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());

// Custom proxy endpoints for Chess platforms
app.get('/api/lichess-proxy', async (req, res) => {
  const username = req.query.username;
  if (!username) return res.status(400).send({ error: 'Username is required' });
  try {
    const response = await fetch(`https://lichess.org/api/user/${username}/rating-history`);
    if (!response.ok) throw new Error(`Lichess responded with ${response.status}`);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});

app.get('/api/chesscom-proxy', async (req, res) => {
  const username = req.query.username;
  if (!username) return res.status(400).send({ error: 'Username is required' });
  try {
    const response = await fetch(`https://api.chess.com/pub/player/${username}/stats`, {
      headers: {
        'User-Agent': 'Chesskidoo-Academy-Management-System'
      }
    });
    if (!response.ok) throw new Error(`Chess.com responded with ${response.status}`);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});

app.get('/api/chessable-proxy', async (req, res) => {
  const username = req.query.username;
  if (!username) return res.status(400).send({ error: 'Username is required' });
  try {
    const response = await fetch(`https://www.chessable.com/profile/${username}/`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)'
      }
    });
    if (!response.ok) throw new Error(`Chessable responded with ${response.status}`);
    const html = await response.text();
    
    // Scrape XP using regex (looking for standard profile elements, may be brittle)
    // Often Chessable shows points in <span class="points">123,456</span> or similar
    const xpMatch = html.match(/([\d,]+)\s*<br>\s*<span[^>]*>Points<\/span>/i) || html.match(/class="points"[^>]*>\s*([\d,]+)\s*</i);
    const streakMatch = html.match(/([\d]+)\s*<br>\s*<span[^>]*>Day Streak<\/span>/i);
    
    let xp = 0;
    let streak = 0;
    if (xpMatch && xpMatch[1]) xp = parseInt(xpMatch[1].replace(/,/g, ''), 10);
    if (streakMatch && streakMatch[1]) streak = parseInt(streakMatch[1].replace(/,/g, ''), 10);
    
    // As a fallback, try to extract total words or any number near "XP"
    if (!xp) {
        const altMatch = html.match(/([\d,]+)\s*XP/i);
        if (altMatch && altMatch[1]) xp = parseInt(altMatch[1].replace(/,/g, ''), 10);
    }
    
    res.json({ username, xp, streak });
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});

// Proxy /api requests to Supabase edge functions cleanly using standard middleware
app.use('/api', async (req, res) => {
  // Reconstruct the sub-path from req.originalUrl or req.url
  const subPath = req.originalUrl.substring(5); // Strips "/api/"
  const targetUrl = `https://vseombfkrvpffnpgbsnk.supabase.co/functions/v1/${subPath}`;
  console.log(`[Proxy] ${req.method} ${req.originalUrl} -> ${targetUrl}`);
  
  const headers = { ...req.headers };
  delete headers.host;
  delete headers.connection;

  try {
    const fetchOptions = {
      method: req.method,
      headers: headers,
    };

    if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body && Object.keys(req.body).length > 0) {
      fetchOptions.body = JSON.stringify(req.body);
    }

    const response = await fetch(targetUrl, fetchOptions);
    const contentType = response.headers.get('content-type');
    
    res.status(response.status);
    if (contentType) res.setHeader('content-type', contentType);

    const bodyText = await response.text();
    res.send(bodyText);
  } catch (err) {
    console.error(`[Proxy Error]`, err);
    res.status(500).send({ error: 'Proxy failed', details: err.message });
  }
});

// Serve static frontend assets
app.use(express.static(path.join(__dirname, 'public')));

// Catch-all fallback to index.html for SPA router (Express 5.x safe)
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Proxy server running at http://localhost:${PORT}`);
});
