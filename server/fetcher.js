const axios = require('axios');
const District = require('./models/district');

// Real data.gov.in API endpoint - CORRECT RESOURCE ID
const API_URL = 'https://api.data.gov.in/resource/ee03643a-ee4c-48c2-ac30-9f2ff26ab722';
const API_KEY = process.env.DATA_GOV_API_KEY || '579b464db66ec23bdd000001cdd3946e44ce4aad7209ff7b23ac571b';

async function fetchFromGov() {
  try {
    console.log('Fetching from data.gov.in API...');
    
    // Fetch data for multiple months to get historical records
    const allUpRecords = [];
    let offset = 0;
    const limit = 10; // API max limit
    const maxPages = 1500; // Fetch up to 15000 records to get multiple months of data
    
    for (let page = 0; page < maxPages; page++) {
      console.log(`Fetching page ${page + 1}, offset: ${offset}...`);
      
      const resp = await axios.get(API_URL, { 
        params: { 
          'api-key': API_KEY, 
          format: 'json', 
          limit: limit,
          offset: offset
        },
        timeout: 30000 
      });
      
      if (!resp.data || !resp.data.records || resp.data.records.length === 0) {
        console.log('No more records available');
        break;
      }
      
      // Filter for UTTAR PRADESH
      const upRecords = resp.data.records.filter(r => 
        r.state_name && r.state_name.toUpperCase().includes('UTTAR PRADESH')
      );
      
      allUpRecords.push(...upRecords);
      console.log(`Page ${page + 1}: Found ${upRecords.length} UP records (total UP so far: ${allUpRecords.length})`);
      
      // Check unique district-month combinations to see if we have good coverage
      const uniqueCombos = new Set(allUpRecords.map(r => `${r.district_name}-${r.fin_year}-${r.month}`));
      
      // Stop if we have at least 75 districts and multiple months of data (at least 200 unique records)
      if (allUpRecords.length >= 300 && uniqueCombos.size >= 200) {
        console.log(`Collected ${allUpRecords.length} UP records with ${uniqueCombos.size} unique district-month combinations, stopping pagination`);
        break;
      }
      
      offset += limit;
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`Total UTTAR PRADESH records fetched: ${allUpRecords.length}`);
    return allUpRecords.length > 0 ? allUpRecords : null;
  } catch (err) {
    console.error('fetchFromGov failed:', err.message);
    console.error('Error response:', err.response?.data);
    return null;
  }
}function transformRecordsToDistricts(records) {
  if (!records || records.length === 0) {
    console.warn('No records to transform');
    return [];
  }
  
  console.log('Transforming records... Sample record keys:', Object.keys(records[0]));
  
  const map = {};
  for (const r of records) {
    const state = r.state_name || 'Unknown';
    const district = r.district_name || 'Unknown';
    
    // Skip if essential fields are missing
    if (state === 'Unknown' || district === 'Unknown') continue;
    
    // Create unique key for each state-district combination
    const key = `${state}||${district}`;
    
    if (!map[key]) {
      map[key] = { 
        state, 
        district, 
        slug: `${state.toLowerCase().replace(/\s+/g,'-')}-${district.toLowerCase().replace(/\s+/g,'-')}`, 
        bbox: generateBbox(state, district),
        seriesMap: {} // Use map to track unique months
      };
    }
    
    // Extract metric - use Total_Households_Worked or Total_Individuals_Worked
    const metric = Number(
      r.Total_Households_Worked ||
      r.Total_Individuals_Worked ||
      r.Total_No_of_Active_Workers ||
      r.Persondays_of_Central_Liability_so_far ||
      0
    );
    
    // Extract date/month - combine fin_year and month
    const month = r.fin_year && r.month ? `${r.fin_year}-${r.month}` : r.fin_year || r.month || 'current';
    
    // Add to series if we have a valid metric
    // Keep only the highest metric value for each month (latest/most complete data)
    if (metric > 0) {
      if (!map[key].seriesMap[month] || map[key].seriesMap[month] < metric) {
        map[key].seriesMap[month] = metric;
      }
    }
  }
  
  // Convert seriesMap to series array and sort by date
  const districts = Object.values(map).map(d => {
    const series = Object.entries(d.seriesMap).map(([month, metric]) => ({ month, metric }));
    // Sort series chronologically (oldest first)
    series.sort((a, b) => {
      // Simple string comparison works for YYYY-YYYY-Month format
      return a.month.localeCompare(b.month);
    });
    return {
      state: d.state,
      district: d.district,
      slug: d.slug,
      bbox: d.bbox,
      series
    };
  });
  
  console.log(`Transformed ${districts.length} unique districts`);
  if (districts.length > 0) {
    console.log('Sample district:', JSON.stringify(districts[0]));
  }
  return districts;
}

// Simple bbox generator based on known locations (placeholder - in production use proper geocoding)
function generateBbox(state, district) {
  // For now, return empty bbox - can be enhanced with geocoding service
  // Format: [west, south, east, north]
  const knownLocations = {
    'uttar pradesh-lucknow': [80.8, 26.7, 81.2, 27.1],
    'uttar pradesh-kanpur nagar': [80.2, 26.3, 80.7, 26.6],
    'uttar pradesh-varanasi': [82.9, 25.2, 83.1, 25.4],
    'uttar pradesh-agra': [77.9, 27.1, 78.2, 27.3],
    'uttar pradesh-allahabad': [81.7, 25.3, 82.0, 25.5],
    'uttar pradesh-gorakhpur': [83.2, 26.7, 83.5, 26.9],
    'uttar pradesh-meerut': [77.6, 28.9, 77.9, 29.1],
  };
  
  const key = `${state.toLowerCase()}-${district.toLowerCase()}`.replace(/\s+/g, '-');
  return knownLocations[key] || [];
}

async function upsertDistricts(districts) {
  let upserted = 0;
  for (const d of districts) {
    try {
      const filter = { slug: d.slug };
      const update = { $set: { state: d.state, district: d.district, bbox: d.bbox || [], series: d.series || [] } };
      await District.updateOne(filter, update, { upsert: true });
      upserted++;
    } catch (err) {
      console.error('Upsert error for', d.slug, err.message);
    }
  }
  return { upserted };
}

async function sync() {
  console.log('Starting sync...');
  const records = await fetchFromGov();
  const districts = transformRecordsToDistricts(records);
  
  if (districts.length === 0) {
    console.warn('No districts to upsert');
    return { source: 'none', count: 0, upserted: 0 };
  }
  
  const summary = await upsertDistricts(districts);
  console.log('Sync complete:', summary);
  return { source: records ? 'data.gov.in' : 'none', count: districts.length, ...summary };
}

module.exports = { sync, fetchFromGov, transformRecordsToDistricts };
