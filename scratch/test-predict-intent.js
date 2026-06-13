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
    const uniqueDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    console.log('1. Getting prediction for route NDLS -> MMCT on ' + uniqueDate + '...');
    const predictRes = await requestJson('POST', 'http://localhost:3000/api/amenities/intent/predict', {
      from_station: 'NDLS',
      to_station: 'MMCT',
      travel_date: uniqueDate,
      class: 'GEN'
    }, userDevToken);

    console.log('Predict Result Status:', predictRes.statusCode);
    console.log('Predict Response Data:', JSON.stringify(predictRes.data, null, 2));

    if (predictRes.statusCode !== 200) {
      console.error('Failed to get prediction!');
      return;
    }

    console.log('\n2. Listing my intents to verify prediction did NOT insert into the database...');
    const intentsRes = await requestJson('GET', 'http://localhost:3000/api/amenities/intents', null, userDevToken);
    console.log('Intents Status:', intentsRes.statusCode);
    const hasIntent = intentsRes.data.data.some(intent => intent.travel_date === uniqueDate);
    console.log('Is travel date present in active intents list?', hasIntent ? 'YES (Fail)' : 'NO (Pass)');

    console.log('\n3. Declaring travel intent for route NDLS -> MMCT (should write to database)...');
    const declareRes = await requestJson('POST', 'http://localhost:3000/api/amenities/intent', {
      from_station: 'NDLS',
      to_station: 'MMCT',
      travel_date: uniqueDate,
      class: 'GEN'
    }, userDevToken);
    console.log('Declare Result Status:', declareRes.statusCode);
    console.log('Declare Response Data:', JSON.stringify(declareRes.data, null, 2));

    console.log('\n4. Listing my intents again to verify it is now inserted...');
    const intentsAfterRes = await requestJson('GET', 'http://localhost:3000/api/amenities/intents', null, userDevToken);
    const hasIntentAfter = intentsAfterRes.data.data.some(intent => intent.travel_date === uniqueDate);
    console.log('Is travel date present in active intents list now?', hasIntentAfter ? 'YES (Pass)' : 'NO (Fail)');

    if (hasIntentAfter) {
      // Clean up by deleting the intent
      const createdIntent = intentsAfterRes.data.data.find(intent => intent.travel_date === uniqueDate);
      console.log('\n5. Cleaning up (deleting created intent ' + createdIntent.id + ')...');
      const deleteRes = await requestJson('DELETE', `http://localhost:3000/api/amenities/intent/${createdIntent.id}`, null, userDevToken);
      console.log('Delete Status:', deleteRes.statusCode);
    }

  } catch (err) {
    console.error('Test failed:', err);
  }
}

run();
