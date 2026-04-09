import express from 'express';
import cors from 'cors';
import 'dotenv/config';

const app = express();
const PORT = 5001;

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  console.log(`\n📨 ${req.method} ${req.url}`);
  console.log('📦 Body:', JSON.stringify(req.body, null, 2));
  next();
});

app.post('/test', (req, res) => {
  console.log('✅ Test endpoint hit!');
  res.json({ message: 'Test successful', body: req.body });
});

app.listen(PORT, () => {
  console.log(`\n🚀 Test server running at http://localhost:${PORT}`);
});