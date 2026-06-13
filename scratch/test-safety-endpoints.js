const http = require('http');

const userDevToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoidXNlci1kZW1vLWlkLTEyMzQ1IiwicGhvbmUiOiIxMjM0NTY3ODkwIiwiaWF0IjoxNzgxMDIxNzk3LCJleHAiOjE3ODM2MTM3OTd9.mockSignature';

function requestJson(method, url, data, token) {
  return new Promise((resolve, reject) => {
    const payload = data ? JSON.stringify(data) : '';
    const parsedUrl = new URL(url);
    const options = {
      method: method,
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    };
    if (payload) {
      options.headers['Content-Length'] = Buffer.byteLength(payload);
    }

    const req = http.request(options, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            data: body ? JSON.parse(body) : null
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            rawBody: body
          });
        }
      });
    });

    req.on('error', reject);
    if (payload) {
      req.write(payload);
    }
    req.end();
  });
}

async function run() {
  try {
    console.log('1. Testing POST /api/safety/compartment ...');
    const compRes = await requestJson('POST', 'http://localhost:3000/api/safety/compartment', {
      train_number: '12951',
      coach: 'A1',
      alert_subtype: 'MALE_OCCUPANT',
      description: 'Test male occupant in ladies coach'
    }, userDevToken);

    console.log('Compartment Status:', compRes.statusCode);
    console.log('Compartment Response:', JSON.stringify(compRes.data, null, 2));

    console.log('\n2. Testing POST /api/safety/hazard ...');
    const hazardRes = await requestJson('POST', 'http://localhost:3000/api/safety/hazard', {
      alert_subtype: 'TRACK_DAMAGE',
      description: 'Test track damage reported',
      lat: 28.6419,
      lng: 77.2194,
      photo_url: 'http://test.com/photo.jpg'
    }, userDevToken);

    console.log('Hazard Status:', hazardRes.statusCode);
    console.log('Hazard Response:', JSON.stringify(hazardRes.data, null, 2));

  } catch (err) {
    console.error('Test failed:', err);
  }
}

run();
