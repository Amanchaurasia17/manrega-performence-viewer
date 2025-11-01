const mongoose = require('mongoose');

const TimeSeriesSchema = new mongoose.Schema({
  month: String, // YYYY-MM
  metric: Number
}, { _id: false });

const DistrictSchema = new mongoose.Schema({
  state: String,
  district: String,
  slug: { type: String, unique: true },
  bbox: { // simple bbox [west, south, east, north]
    type: [Number],
    default: []
  },
  series: [TimeSeriesSchema]
});

module.exports = mongoose.model('District', DistrictSchema);
