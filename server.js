const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch'); // if Node <18; Node 18+ has global fetch
const app = express();
const PORT = 3000;

app.use(cors());

app.get('/data', async (req, res) => {
  try {
    const { start, end, lat, lon, community, parameters } = req.query;

    // Build the NASA POWER API URL
    const apiUrl = `https://power.larc.nasa.gov/api/temporal/hourly/point?start=${start}&end=${end}&latitude=${lat}&longitude=${lon}&community=${community}&parameters=${parameters}&format=json&units=metric`;

    console.log('Fetching NASA POWER API:', apiUrl);

    const response = await fetch(apiUrl);

    // Check if NASA API returned an error
    if (!response.ok) {
      const text = await response.text(); // Some errors aren't JSON
      console.error('NASA API error:', response.status, text);
      return res.status(response.status).send(text);
    }

    const data = await response.json();
    res.json(data);

  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/config', (req, res) => {
  res.json({ message: 'Config endpoint works!' });
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
