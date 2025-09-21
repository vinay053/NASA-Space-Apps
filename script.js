async function loadWeather() {
  const container = document.getElementById('data');
  container.innerHTML = 'Loading...';

  try {
    // 1. Get configuration
    const configResp = await fetch('http://localhost:3000/config');
    const config = await configResp.json();
    console.log('Config:', config);

    // Pick some default parameter from config
    const defaultParam = 'T2M_MAX';

    // 2. Get data
    const dataResp = await fetch(`http://localhost:3000/data?start=20250920&end=20250921&lat=22.7196&lon=75.8577&community=ag&parameters=${defaultParam}`);
    const data = await dataResp.json();
    console.log('Data:', data);

    // 3. Render
    container.innerHTML = '';
    for (let param in data.properties.parameter) {
      const div = document.createElement('div');
      div.className = 'param';
      div.innerHTML = `<strong>${param}</strong>: ${JSON.stringify(data.properties.parameter[param])}`;
      container.appendChild(div);
    }

  } catch (err) {
    container.innerHTML = `<span style="color:red;">Error: ${err.message}</span>`;
  }
}
