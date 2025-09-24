// --------------------
// Helper: Get location
// --------------------
async function getLocation() {
  if (navigator.geolocation) {
    try {
      const pos = await new Promise((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej)
      );
      return { lat: pos.coords.latitude, lon: pos.coords.longitude };
    } catch {
      alert('Could not get location. Enter manually.');
      return null;
    }
  } else {
    alert('Geolocation not supported.');
    return null;
  }
}

// --------------------
// Aggregate hourly into daily averages
// --------------------
function aggregateDaily(hoursData) {
  const daily = {};
  for (let dt in hoursData.T2M) {
    const t = Number(hoursData.T2M[dt]);
    const w = Number(hoursData.WS10M[dt]);
    const h = Number(hoursData.RH2M[dt]);
    if (isNaN(t) || isNaN(w) || isNaN(h)) continue; // skip invalid entries

    const date = dt.slice(0, 8); // YYYYMMDD
    if (!daily[date]) daily[date] = { temp: [], wind: [], humidity: [] };
    daily[date].temp.push(t);
    daily[date].wind.push(w);
    daily[date].humidity.push(h);
  }

  const result = [];
  for (let date in daily) {
    const t = daily[date].temp;
    const w = daily[date].wind;
    const h = daily[date].humidity;
    if (!t.length || !w.length || !h.length) continue; // skip empty days
    result.push({
      date,
      temp_min: Math.min(...t),
      temp_max: Math.max(...t),
      temp_avg: t.reduce((a, b) => a + b, 0) / t.length,
      wind_avg: w.reduce((a, b) => a + b, 0) / w.length,
      humidity_avg: h.reduce((a, b) => a + b, 0) / h.length
    });
  }

  return result.sort((a, b) => a.date - b.date);
}


// --------------------
// Simple linear regression prediction
// --------------------
function predictTomorrow(dailyData, key) {
  const n = dailyData.length;
  if (n < 2) return null;
  const x = dailyData.map((_, i) => i + 1);
  const y = dailyData.map(d => d[key]);
  const x_mean = x.reduce((a, b) => a + b, 0) / n;
  const y_mean = y.reduce((a, b) => a + b, 0) / n;
  const numerator = x.map((xi, i) => (xi - x_mean) * (y[i] - y_mean)).reduce((a, b) => a + b, 0);
  const denominator = x.map(xi => Math.pow(xi - x_mean, 2)).reduce((a, b) => a + b, 0);
  const slope = numerator / denominator;
  const intercept = y_mean - slope * x_mean;
  return intercept + slope * (n + 1); // next day
}

// --------------------
// Generate monthly report
// --------------------
let weatherChart = null; // global

async function loadWeather() {
  const container = document.getElementById('data');
  container.innerHTML = 'Loading...';

  try {
    const month = parseInt(document.getElementById('month').value);
    const year = parseInt(document.getElementById('year').value);
    const start = new Date(year, month, 1).toISOString().slice(0, 10).replaceAll('-', '');
    const end = new Date(year, month + 1, 0).toISOString().slice(0, 10).replaceAll('-', '');

    let lat, lon;
    const location = await getLocation();
    if (location) {
      lat = location.lat;
      lon = location.lon;
      document.getElementById('lat').value = lat;
      document.getElementById('lon').value = lon;
    } else {
      lat = document.getElementById('lat').value;
      lon = document.getElementById('lon').value;
    }

    const parameters = 'T2M,WS10M,RH2M';
    const res = await fetch(`http://localhost:3000/data?start=${start}&end=${end}&lat=${lat}&lon=${lon}&community=ag&parameters=${parameters}`);
    const data = await res.json();
    const temps = data.properties.parameter;

    const labels = Object.keys(temps.T2M || {});
    const tempValues = Object.values(temps.T2M || {}).map(Number);
    const windValues = Object.values(temps.WS10M || {}).map(Number);
    const humValues = Object.values(temps.RH2M || {}).map(Number);

    // Update summary cards
    document.getElementById('tempSummary').innerText = tempValues.length
      ? `${Math.max(...tempValues)}°C / ${Math.min(...tempValues)}°C / ${Math.round(tempValues.reduce((a, b) => a + b, 0) / tempValues.length)}°C`
      : '-';
    document.getElementById('windSummary').innerText = windValues.length ? `${Math.max(...windValues)} m/s` : '-';
    document.getElementById('humiditySummary').innerText = humValues.length ? `${Math.max(...humValues)}%` : '-';

    // Update progress bars (use percentage of max possible)
    const clamp = (val, max) => Math.min(Math.max(val, 0), max);
    document.getElementById('tempBar').style.width = `${clamp(tempValues[tempValues.length-1], 50)}%`;
    document.getElementById('tempBarText').innerText = `Current: ${tempValues[tempValues.length-1] || '-'}°C`;

    document.getElementById('windBar').style.width = `${clamp(windValues[windValues.length-1], 60) * 100/60}%`;
    document.getElementById('windBarText').innerText = `Current: ${windValues[windValues.length-1] || '-'} m/s`;

    document.getElementById('humidityBar').style.width = `${clamp(humValues[humValues.length-1], 100)}%`;
    document.getElementById('humidityBarText').innerText = `Current: ${humValues[humValues.length-1] || '-'}%`;

    // Plot line chart
    if (weatherChart) weatherChart.destroy();
    const ctx = document.getElementById('weatherChart').getContext('2d');
    weatherChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          { label: 'Temperature (°C)', data: tempValues, borderColor: 'red', backgroundColor: 'rgba(255, 36, 36, 0.2)', tension: 0.4 },
          { label: 'Wind (m/s)', data: windValues, borderColor: 'blue', backgroundColor: 'rgba(0, 225, 255, 0.2)', tension: 0.4 },
          { label: 'Humidity (%)', data: humValues, borderColor: 'green', backgroundColor: 'rgba(0, 140, 255, 0.2)', tension: 0.4 }
        ]
      },
      options: {
        responsive: true,
        plugins: { legend: { position: 'top' } },
        scales: { x: { display: false } } // optional: hide timestamps if too dense
      }
    });

    document.getElementById('reportSummary').innerText = `Weather report for ${start} to ${end} at location (${lat}, ${lon}).`;
    container.innerHTML = ''; // hide old hourly list

  } catch (err) {
    container.innerHTML = `<span class="text-red-600 dark:text-red-400">Error: ${err.message}</span>`;
  }
}


// --------------------
// Predict tomorrow's weather
// --------------------
async function predictTomorrowWeather() {
  const container = document.getElementById('data');
  container.innerHTML = 'Fetching data for prediction...';

  try {
    let lat, lon;
    const location = await getLocation();
    if (location) { lat = location.lat; lon = location.lon; }
    else { lat = document.getElementById('lat').value; lon = document.getElementById('lon').value; }

    // Last 30 days
    const today = new Date();
    const end = today.toISOString().slice(0, 10).replaceAll('-', '');
    const startObj = new Date();
    startObj.setDate(today.getDate() - 30);
    const start = startObj.toISOString().slice(0, 10).replaceAll('-', '');

    const parameters = 'T2M,WS10M,RH2M';
    const res = await fetch(`http://localhost:3000/data?start=${start}&end=${end}&lat=${lat}&lon=${lon}&community=ag&parameters=${parameters}`);
    const data = await res.json();

    const temps = data.properties.parameter;
    if (!Object.keys(temps.T2M || {}).length) {
      container.innerHTML = 'No hourly data found for prediction.';
      return;
    }

    const dailyData = aggregateDaily(temps);

    if (!dailyData.length || dailyData.length < 3) {
      container.innerHTML = 'Not enough data to predict tomorrow.';
      return;
    }

    // Clamp function to avoid unrealistic values
    const clamp = (val, min, max) => Math.min(Math.max(val, min), max);

    const predTemp = clamp(predictTomorrow(dailyData, 'temp_avg'), -50, 50);
    const predWind = clamp(predictTomorrow(dailyData, 'wind_avg'), 0, 60);
    const predHum = clamp(predictTomorrow(dailyData, 'humidity_avg'), 0, 100);

    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
    const predDate = tomorrow.toISOString().slice(0, 10);

    const predDiv = document.createElement('div');
    predDiv.classList.add('p-3', 'mb-4', 'bg-green-100', 'dark:bg-green-900', 'rounded', 'text-slate-800', 'dark:text-green-200');
    predDiv.innerHTML = `
      <strong>Predicted Weather for ${predDate}:</strong><br>
      Temp: ${predTemp.toFixed(1)}°C<br>
      Wind: ${predWind.toFixed(1)} m/s<br>
      Humidity: ${predHum.toFixed(1)}%
    `;
    container.prepend(predDiv);

  } catch (err) {
    container.innerHTML = `<span class="text-red-600 dark:text-red-400">Error: ${err.message}</span>`;
  }
}


// --------------------
// Event bindings
// --------------------
document.getElementById('generateBtn').addEventListener('click', loadWeather);
document.getElementById('predictTomorrowBtn').addEventListener('click', predictTomorrowWeather);
