// server.js
const express = require('express');
const fetch = require('node-fetch'); // or "npm i node-fetch"
const cors = require('cors');

const app = express();
const PORT = 3000;

app.use(cors()); // Allow browser to access server

// Route to get configuration
app.get('/config', async (req, res) => {
  try {
    const response = await fetch('https://power.larc.nasa.gov/api/temporal/hourly/configuration');
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route to get data
app.get('/data', async (req, res) => {
  try {
    const { start, end, lat, lon, community, parameters } = req.query;
    const apiUrl = `https://power.larc.nasa.gov/api/temporal/hourly/point?start=${start}&end=${end}&latitude=${lat}&longitude=${lon}&community=${community}&parameters=${parameters}&format=json&units=metric`;
    const response = await fetch(apiUrl);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
