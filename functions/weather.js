// netlify/functions/weather.js
import fetch from "node-fetch";

export async function handler(event, context) {
  try {
    const { lat, lon, start, end, parameters } = event.queryStringParameters;

    if (!lat || !lon || !start || !end || !parameters) {
      return { statusCode: 400, body: JSON.stringify({ error: "Missing required query parameters" }) };
    }

    // Replace this URL with your actual weather API endpoint
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=${parameters}&start_date=${start}&end_date=${end}`;
    
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch weather API");
    const data = await res.json();

    return {
      statusCode: 200,
      body: JSON.stringify({ properties: { parameter: data.hourly } })
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
}
