/**
 * WhaleMesh Dashboard — serves the D3.js network visualization
 */

import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 3847;

const app = express();

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// API: latest graph data
app.get('/api/graph', (_req, res) => {
  const dataPath = path.join(__dirname, '..', '..', 'data', 'latest-scan.json');
  if (fs.existsSync(dataPath)) {
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
    res.json(data);
  } else {
    res.status(404).json({ error: 'No scan data yet. Run `npm run scan` first.' });
  }
});

app.listen(PORT, () => {
  console.log(`🕸️  WhaleMesh Dashboard: http://localhost:${PORT}`);
});
