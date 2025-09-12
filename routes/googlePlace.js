const { default: axios } = require('axios');
const express = require('express');
const router = express.Router();

// Route to get all categories
router.post('/', async (req, res) => {
    const { input } = req.body;
    const apiKey = process.env.GOOGLE_GEOCODING_API_KEY;
    const sessionToken = 'some-session-token';

    if (!input || !input.trim()) {
        return res.status(400).json({ error: 'Input is required' });
    }

    try {
        const response = await axios.post('https://places.googleapis.com/v1/places:autocomplete', {
            input,
            sessionToken,
            includedPrimaryTypes: ['street_address', 'premise'],
            languageCode: 'en',
        }, {
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': apiKey,  // Your API key
            },
        });

        // Send back the suggestions from Google Places API
        const data = response.data;
        res.status(200).json(data);
    } catch (error) {
        console.error('Error fetching Google Places API:', error);
        res.status(500).json({ error: 'Failed to fetch from Google Places API' });
    }
});


module.exports = router;
