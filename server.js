import 'dotenv/config';

import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { getSupabaseClient } from './src/api/supabase.js';

console.log('Supabase client initialized:', getSupabaseClient());

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  console.log(`\n📨 ${req.method} ${req.url}`);
  next();
});

// Serve static files from public directory
app.use(express.static(join(__dirname, '../public')));

// Import API routes dynamically
const apiRoutes = [
  'students', 'coaches', 'events', 'achievements', 'games', 'payments', 'ai', 'hello', 'sessions'
];

for (const route of apiRoutes) {
  try {
    const module = await import(`./src/api/${route}.js`);
    app.use(`/api/${route}`, async (req, res) => {
      console.log(`\n📨 ${req.method} /api/${route}`);
      try {
        await module.default(req, res);
      } catch (error) {
        console.error(`❌ Error in /api/${route}:`, error);
        res.status(500).json({ error: error.message });
      }
    });
    console.log(`✅ Loaded /api/${route}`);
  } catch (error) {
    console.error(`❌ Failed to load /api/${route}:`, error.message);
  }
}

// Razorpay routes
try {
  const orderModule = await import('./src/api/razorpay/order.js');
  app.use('/api/razorpay/order', async (req, res) => {
    try {
      await orderModule.default(req, res);
    } catch (error) {
      console.error('Error in /api/razorpay/order:', error);
      res.status(500).json({ error: error.message });
    }
  });
  console.log('✅ Loaded /api/razorpay/order');
} catch (error) {
  console.error('❌ Failed to load /api/razorpay/order:', error.message);
}

try {
  const verifyModule = await import('./src/api/razorpay/verify.js');
  app.use('/api/razorpay/verify', async (req, res) => {
    try {
      await verifyModule.default(req, res);
    } catch (error) {
      console.error('Error in /api/razorpay/verify:', error);
      res.status(500).json({ error: error.message });
    }
  });
  console.log('✅ Loaded /api/razorpay/verify');
} catch (error) {
  console.error('❌ Failed to load /api/razorpay/verify:', error.message);
}

app.listen(PORT, () => {
  console.log(`\n🚀 Server running at http://localhost:${PORT}`);
  console.log(`📁 Serving static files from: ${join(__dirname, '../public')}`);
  console.log(`🔗 API endpoints available at: http://localhost:${PORT}/api/*\n`);
});
