const axios = require('axios');

async function geocodeAddress(address) {

  const apiKey = process.env.GOOGLE_GEOCODING_API_KEY;
  if (!apiKey) throw new Error('Google Geocoding API key missing');

  const encoded = encodeURIComponent(address);
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encoded}&key=${apiKey}`;

  const res = await axios.get(url);

  if (res.data.status !== 'OK' || !res.data.results.length) {
    // Propagate useful error
    throw new Error(`Geocoding failed: ${res.data.status}`);
  }

  const result = res.data.results[0];
  const location = result.geometry?.location;

  if (!location) throw new Error('Could not geocode address');

  console.log('Geocoded address:', result.formatted_address);
  console.log("lat:" , location.lat, "lng:" , location.lng,);
  

  return {
    lat: location.lat,
    lng: location.lng,
    formatted_address: result.formatted_address,
    place_id: result.place_id,
  };
}

module.exports = { geocodeAddress };
