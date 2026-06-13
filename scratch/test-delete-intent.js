const http = require('http');

const userDevToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoidXNlci1kZW1vLWlkLTEyMzQ1IiwicGhvbmUiOiIxMjM0NTY3ODkwIiwiaWF0IjoxNzgxMDIxNzk3LCJleHAiOjE3ODM2MTM3OTd9.mockSignature';
const anotherUserToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYWZhNWI3NTAtNzZjZS00OWI0LTkxNTItMjY4MjA2ZTgwZjBjIiwicGhvbmUiOiI5OTk5OTk5OTk5IiwiaWF0IjoxNzgxMDIxNzk3LCJleHAiOjE3ODM2MTM3OTd9.JRm7oCU_rnG7qcvqYL7NdlwizhpRFZ41nPgWQdju4XQ';

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
    console.log('1. Declaring a travel intent first...');
    const createRes = await requestJson('POST', 'http://localhost:3000/api/amenities/intent', {
      from_station: 'NDLS',
      to_station: 'ADI',
      travel_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      class: '3A'
    }, userDevToken);
    
    console.log('Create Intent Status:', createRes.statusCode);
    if (createRes.statusCode !== 210 && createRes.statusCode !== 201) {
      console.error('Failed to create travel intent:', createRes);
      return;
    }

    const intentId = createRes.data.data.id;
    console.log('Created Intent ID:', intentId);

    console.log('\n2. Trying to DELETE intent with ANOTHER user token (should be 403)...');
    const deleteForbiddenRes = await requestJson('DELETE', `http://localhost:3000/api/amenities/intent/${intentId}`, null, anotherUserToken);
    console.log('Status Code:', deleteForbiddenRes.statusCode);
    console.log('Response:', deleteForbiddenRes.data);

    console.log('\n3. Trying to DELETE intent with the OWNER token (should be 200)...');
    const deleteSuccessRes = await requestJson('DELETE', `http://localhost:3000/api/amenities/intent/${intentId}`, null, userDevToken);
    console.log('Status Code:', deleteSuccessRes.statusCode);
    console.log('Response:', deleteSuccessRes.data);

    console.log('\n4. Trying to DELETE the same intent again (should be 404)...');
    const deleteAgainRes = await requestJson('DELETE', `http://localhost:3000/api/amenities/intent/${intentId}`, null, userDevToken);
    console.log('Status Code:', deleteAgainRes.statusCode);
    console.log('Response:', deleteAgainRes.data);

    console.log('\n5. Trying to DELETE a non-existent UUID (should be 404)...');
    const deleteNonExistentRes = await requestJson('DELETE', `http://localhost:3000/api/amenities/intent/00000000-0000-0000-0000-000000000000`, null, userDevToken);
    console.log('Status Code:', deleteNonExistentRes.statusCode);
    console.log('Response:', deleteNonExistentRes.data);

  } catch (err) {
    console.error('Test failed:', err);
  }
}

run();
