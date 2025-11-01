const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const cron = require('node-cron');

const District = require('./models/district');
const fetcher = require('./fetcher');

const app = express();
app.use(cors());
app.use(express.json());

const MONGO_URL = process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/mgnrega';
mongoose.connect(MONGO_URL, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error', err));

// Simple routes
app.get('/api/districts', async (req, res) => {
  const districts = await District.find({}, 'state district slug bbox');
  res.json(districts);
});

app.get('/api/districts/:slug', async (req, res) => {
  const d = await District.findOne({ slug: req.params.slug });
  if (!d) return res.status(404).json({ error: 'Not found' });
  res.json(d);
});

// server-side geolocation lookup: /api/lookup?lat=..&lon=..
app.get('/api/lookup', async (req, res) => {
  const lat = parseFloat(req.query.lat);
  const lon = parseFloat(req.query.lon);
  if (Number.isNaN(lat) || Number.isNaN(lon)) return res.status(400).json({ error: 'lat and lon required' });
  // find simple bbox match
  const found = await District.findOne({ bbox: { $exists: true, $ne: [] } });
  // more efficient: query all and filter in JS because bbox is array
  const all = await District.find({ bbox: { $exists: true } });
  const match = all.find(d => {
    if (!d.bbox || d.bbox.length !== 4) return false;
    const [w, s, e, n] = d.bbox;
    return lon >= w && lon <= e && lat >= s && lat <= n;
  });
  if (!match) return res.status(404).json({ error: 'No district found' });
  res.json(match);
});

// manual sync endpoint: POST /api/sync triggers fetch+upsert
app.post('/api/sync', async (req, res) => {
  try {
    const summary = await fetcher.sync();
    res.json({ ok: true, summary });
  } catch (err) {
    console.error('Sync error', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// minimal health
app.get('/_health', (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log('Server running on', PORT);
});

// Check if data exists, trigger initial sync if database is empty
(async () => {
  const count = await District.countDocuments({});
  if (count === 0) {
    console.log('No data found. Triggering initial sync from data.gov.in...');
    await fetcher.sync().catch(err => console.error('Initial sync failed:', err));
  } else {
    console.log(`✅ Database already has ${count} districts. Ready to serve!`);
    console.log('📅 Next automatic sync will run in 6 hours.');
  }
})();

// background job: sync from data.gov.in every 6 hours
cron.schedule('0 */6 * * *', () => {
  console.log('Running scheduled sync from data.gov.in...');
  fetcher.sync().catch(err => console.error('Scheduled sync failed:', err));
});
