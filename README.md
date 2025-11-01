# Our Voice, Our Rights - MGNREGA District Performance Viewer

A production-ready MERN-stack application for viewing MGNREGA district performance data with real-time updates from data.gov.in API. Designed specifically for low-literacy populations in rural India with multilingual support, audio readout, and accessible UI.

**Live Data Source:** Government of India data.gov.in Open API (340,000+ records)  
**Target State:** Uttar Pradesh (75 districts with historical data)  
**Update Frequency:** Automatic 6-hour sync from government API

## 🎯 Key Features

### Accessibility & User Experience

**🌐 Multilingual Support:**
- Auto-detects device locale (Hindi/English)
- Language switcher in header
- Full UI translation for both languages
- Localized number formatting

**🔊 Audio Support:**
- Listen buttons on all key content (district name, stats, trends, FAQ)
- Uses Web Speech Synthesis API
- Supports both Hindi and English voice output
- Helps users with low literacy or visual impairments

**📍 Location Detection:**
- Auto-detects user location on entry (with skip option for privacy)
- Server-side `/api/lookup?lat=X&lon=Y` endpoint
- Bounding box matching for district identification
- Manual district selection via dropdown or tiles

**👁️ Visual Design for Low Literacy:**
- Extra large fonts (18-32px for primary content)
- High contrast colors (#2b6cb0 blue, white backgrounds)
- Pictograms (👤 icons) showing "out of 100 people got work"
- Emoji-based performance badges (😊 Good, 😐 Fair, 😞 Needs Improvement)
- Color-coded comparison bars
- Interactive line charts with clear trends

**📊 Data Visualization:**
- **District Selector**: Dropdown with all 75 UP districts
- **Latest Jobs**: Current month's employment data
- **Performance Badge**: Visual indicator (Good/Fair/Needs Improvement)
- **Pictogram**: Visual representation per 100 people
- **Trend Analysis**: Line chart with month labels and min/max values
- **Trend Indicator**: 📈/📉 arrows with percentage change
- **Historical Data**: Complete timeline of all available months
- **Comparison View**: Compare with 3 other districts side-by-side

**🔍 Views Available:**
1. **Main View**: District overview with key metrics
2. **History View (📅)**: Month-by-month historical data with change indicators
3. **Compare View (📊)**: Side-by-side comparison with other districts
4. **Help & FAQ (❓)**: Educational content about MGNREGA

### Technical Implementation

**Server (Express + MongoDB):**
- RESTful API endpoints:
  - `GET /api/districts` - list all districts (basic info: state, district, slug, bbox)
  - `GET /api/districts/:slug` - get single district with complete time-series data
  - `GET /api/lookup?lat=X&lon=Y` - server-side geolocation
  - `POST /api/sync` - manual trigger for data fetch/upsert from data.gov.in
- **Real-time Data Sync:**
  - Background sync with `node-cron` (every 6 hours at 00:00, 06:00, 12:00, 18:00)
  - Fetches data from data.gov.in API with pagination (max 10 records per request)
  - Fetches up to 15,000 records to get multiple months of historical data
  - Smart deduplication: keeps only highest metric per month (most complete data)
  - Filters for Uttar Pradesh state only
  - Automatic chronological sorting (oldest to newest)
- Mongoose schema with time-series support
- Data validation and error handling
- Upsert logic to prevent duplicates

**Client (React + Vite):**
- Single-page app with view routing (main/compare/history/help)
- i18n module with Hindi and English translations
- Web Speech Synthesis for audio readout
- Auto-location detection on mount
- Responsive grid layout for district tiles
- SVG-based interactive charts
- Dynamic district selection with full data loading
- Loading states and error handling

**Data Strategy:**
- **Source**: data.gov.in API (resource ID: ee03643a-ee4c-48c2-ac30-9f2ff26ab722)
- **Coverage**: 75 Uttar Pradesh districts
- **Historical Data**: Multiple months (2024-2025 financial year: July, November, December)
- **Metrics Used**: Total_Households_Worked (primary), Total_Individuals_Worked (fallback)
- **Time-series Format**: Array of {month: "YYYY-YYYY-Month", metric: number} objects
- **Geolocation**: Bounding boxes [west, south, east, north] for major cities
- **Update Strategy**: Automatic 6-hour sync keeps data fresh

## 🚀 Quick Start (Local Development)

### Prerequisites

- Node.js v18+ and npm
- MongoDB v5+ (local or MongoDB Atlas)
- Modern browser with Web Speech API support

### Installation Steps

1. **Clone the repository:**

```powershell
git clone <your-repo-url>
cd bfh
```

2. **Start MongoDB** (if using local instance):

```powershell
# Windows (if MongoDB installed as service)
net start MongoDB

# Or use MongoDB Atlas and set MONGO_URL environment variable
```

3. **Start the backend server:**

```powershell
cd server
npm install
node index.js
# Server will start on http://localhost:4000
# Initial sync will fetch 75 UP districts from data.gov.in
```

4. **Start the frontend client** (in a new terminal):

```powershell
cd client
npm install
npm run dev
# Client will start on http://localhost:5173
```

5. **Access the application:**

Open your browser and navigate to `http://localhost:5173`

### Configuration

**Environment Variables** (optional):

```bash
# Server (.env or environment)
PORT=4000
MONGO_URL=mongodb://127.0.0.1:27017/mgnrega
DATA_GOV_API_KEY=579b464db66ec23bdd000001cdd3946e44ce4aad7209ff7b23ac571b
```

### API Endpoints

- `GET http://localhost:4000/api/districts` - List all districts (basic info)
- `GET http://localhost:4000/api/districts/:slug` - Get district with full time-series
- `GET http://localhost:4000/api/lookup?lat=26.8&lon=80.9` - Location-based lookup
- `POST http://localhost:4000/api/sync` - Trigger manual data sync
- `GET http://localhost:4000/_health` - Health check

## 📦 Project Structure

```
bfh/
├── server/
│   ├── index.js              # Express server with API routes
│   ├── fetcher.js            # data.gov.in API fetcher with pagination
│   ├── models/
│   │   └── district.js       # Mongoose schema
│   ├── package.json
│   └── Dockerfile
│
├── client/
│   ├── src/
│   │   ├── pages/
│   │   │   └── App.jsx       # Main React component with all views
│   │   ├── i18n.js           # Hindi/English translations
│   │   └── styles.css        # Accessible styling
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── Dockerfile
│
├── docker-compose.yml         # Docker orchestration
└── README.md
```

## 🎨 UI Features Demo

### Main View
- District dropdown selector (75 UP districts)
- Latest employment statistics with audio readout
- Performance badge (Good/Fair/Needs Improvement)
- Visual pictogram (out of 100 people)
- Trend chart with percentage change indicator

### History View (📅 View History)
- Complete month-by-month timeline
- Change indicators (↑/↓ with percentages)
- Latest month highlighted in blue
- Bilingual labels

### Compare View (📊 Compare Nearby)
- Your district vs 3 other districts
- Horizontal bar charts showing relative performance
- Real-time data for all districts

### Help View (❓ Help & FAQs)
- What is MGNREGA? (with audio)
- What do these numbers mean?
- How to use this tool?

## 🔄 Data Sync Process

1. **Initial Sync**: On first startup, fetches 300+ records from data.gov.in API
2. **Pagination**: API returns max 10 records per request, tool handles pagination automatically
3. **Filtering**: Filters for Uttar Pradesh state only
4. **Deduplication**: Keeps only highest metric per district-month combination
5. **Storage**: Upserts to MongoDB (creates if new, updates if exists)
6. **Automatic Updates**: Cron job runs every 6 hours (00:00, 06:00, 12:00, 18:00)
7. **Manual Trigger**: POST to `/api/sync` for immediate update

**Current Data Coverage:**
- 75 Uttar Pradesh districts
- 2-3 months of historical data per district
- Financial Year 2024-2025 (July, November, December)
- ~150+ unique district-month records

## 🐳 Deployment

### Production Architecture

**Recommended stack for production:**

- **Web Server**: NGINX as reverse proxy (SSL termination, gzip compression, static asset serving)
- **Process Manager**: PM2 for Node.js server (auto-restart, clustering, monitoring)
- **Database**: MongoDB Atlas (managed) or self-hosted replica set for redundancy
- **Caching**: Redis for API response caching and rate-limiting
- **CDN**: CloudFlare or AWS CloudFront for client static assets
- **Monitoring**: Prometheus + Grafana, or managed APM (New Relic, Datadog)

### VPS/VM Deployment Steps

1. **Provision a VM** (Ubuntu 22.04 recommended, min 2 CPU, 4GB RAM)

2. **Install dependencies:**

```bash
sudo apt update
sudo apt install -y nodejs npm mongodb nginx
sudo npm install -g pm2
```

3. **Clone and setup:**

```bash
git clone <your-repo> /var/www/mgnrega
cd /var/www/mgnrega/server
npm install --production
cd /var/www/mgnrega/client
npm install
npm run build
```

4. **Configure MongoDB:**

- Start MongoDB service: `sudo systemctl start mongod`
- Or use managed MongoDB Atlas and set `MONGO_URL` env var

5. **Run server with PM2:**

```bash
cd /var/www/mgnrega/server
pm2 start index.js --name mgnrega-server -i 2
pm2 save
pm2 startup
```

6. **Configure NGINX** (example `/etc/nginx/sites-available/mgnrega`):

```nginx
server {
    listen 80;
    server_name your-domain.com;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript;

    # Serve client static files
    location / {
        root /var/www/mgnrega/client/dist;
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests to Node server
    location /api {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable site: `sudo ln -s /etc/nginx/sites-available/mgnrega /etc/nginx/sites-enabled/`

Test and reload: `sudo nginx -t && sudo systemctl reload nginx`

7. **SSL with Let's Encrypt:**

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### Docker Setup (Alternative)

Create `docker-compose.yml` in project root:

```yaml
version: '3.8'
services:
  mongo:
    image: mongo:7
    volumes:
      - mongo-data:/data/db
    ports:
      - "27017:27017"

  server:
    build: ./server
    environment:
      - MONGO_URL=mongodb://mongo:27017/mgnrega
    ports:
      - "4000:4000"
    depends_on:
      - mongo

  client:
    build: ./client
    ports:
      - "80:80"

volumes:
  mongo-data:
```

Run: `docker-compose up -d`

### Scaling and Production Hardening

- **Rate Limiting**: Use NGINX `limit_req` or Redis-based rate limiter middleware
- **Background Jobs**: Run separate PM2 process for cron/sync jobs
- **Database Indexes**: Create indexes on `slug`, `state`, `district` fields
- **Backup Strategy**: Daily MongoDB backups using `mongodump`, store off-site (S3)
- **Health Checks**: Implement `/health` endpoint and monitor with UptimeRobot or similar
- **Logging**: Centralized logging with Winston + Logstash or CloudWatch
- **Security**: Enable helmet.js, configure CORS properly, validate all inputs
- **API Caching**: Cache `/api/districts` with 1-hour TTL using Redis
- **Data.gov.in Throttling**: Implement exponential backoff, respect rate limits (max 1 req/sec)

