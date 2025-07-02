const axios = require('axios');

async function geocodeAddress(address) {
  const apiKey = process.env.GOOGLE_GEOCODING_API_KEY;
  const encoded = encodeURIComponent(address);
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encoded}&key=${apiKey}`;

  const res = await axios.get(url);
  const location = res.data.results[0]?.geometry?.location;

  if (!location) throw new Error('Could not geocode address');

  return location; // { lat, lng }
}

module.exports = { geocodeAddress };
