const http = require('http');

function get(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: JSON.parse(data)
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            rawBody: data
          });
        }
      });
    }).on('error', reject);
  });
}

async function run() {
  try {
    console.log('Testing GET /api/amenities/station/NDLS...');
    const stationRes = await get('http://localhost:3000/api/amenities/station/NDLS');
    console.log('Status Code:', stationRes.statusCode);
    if (stationRes.body) {
      console.log('Station Code:', stationRes.body.data.station_code);
      console.log('Station Name:', stationRes.body.data.station_name);
      console.log('Amenities count:', stationRes.body.data.amenities?.length);
      console.log('Vendors count:', stationRes.body.data.vendors?.length);
    } else {
      console.log('Raw body:', stationRes.rawBody);
    }

    console.log('\nTesting GET /api/amenities/demand/forecast...');
    const forecastRes = await get('http://localhost:3000/api/amenities/demand/forecast');
    console.log('Status Code:', forecastRes.statusCode);
    if (forecastRes.body) {
      console.log('Forecast data length:', forecastRes.body.data?.forecast?.length);
      console.log('Surge alerts length:', forecastRes.body.data?.surge_alerts?.length);
      if (forecastRes.body.data?.forecast?.length > 0) {
        console.log('Sample forecast:', JSON.stringify(forecastRes.body.data.forecast[0], null, 2));
      }
    } else {
      console.log('Raw body:', forecastRes.rawBody);
    }
  } catch (err) {
    console.error('Error testing endpoints:', err);
  }
}

run();
