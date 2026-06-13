const http = require('http');

const userDevToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoidXNlci1kZW1vLWlkLTEyMzQ1IiwicGhvbmUiOiIxMjM0NTY3ODkwIiwiaWF0IjoxNzgxMDIxNzk3LCJleHAiOjE3ODM2MTM3OTd9.mockSignature';

function postJson(url, data, token) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(data);
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        'Authorization': `Bearer ${token}`
      }
    };

    const req = http.request(url, options, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: body ? JSON.parse(body) : null
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            rawBody: body
          });
        }
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function get(url, token) {
  return new Promise((resolve, reject) => {
    const options = {
      method: 'GET'
    };
    if (token) {
      options.headers = { 'Authorization': `Bearer ${token}` };
    }
    http.get(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: JSON.parse(data)
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
    console.log('Fetching amenities and vendors for NDLS...');
    const ndlsRes = await get('http://localhost:3000/api/amenities/station/NDLS');
    const firstAmenity = ndlsRes.data.data.amenities[0];
    const firstVendor = ndlsRes.data.data.vendors[0];

    console.log(`First Amenity: ${firstAmenity.label} (ID: ${firstAmenity.id})`);
    console.log(`First Vendor: ${firstVendor.name} (ID: ${firstVendor.id})`);

    console.log('\nTesting POST /api/amenities/vote (Protected)...');
    const voteRes = await postJson('http://localhost:3000/api/amenities/vote', {
      amenity_id: firstAmenity.id,
      vote: 'BROKEN'
    }, userDevToken);
    console.log('Status Code:', voteRes.statusCode);
    console.log('Response:', voteRes.data);

    console.log('\nTesting POST /api/amenities/vendor-review (Protected)...');
    const reviewRes = await postJson('http://localhost:3000/api/amenities/vendor-review', {
      vendor_id: firstVendor.id,
      rating: 5,
      comment: 'Excellent food and quick service!'
    }, userDevToken);
    console.log('Status Code:', reviewRes.statusCode);
    console.log('Response:', reviewRes.data);

    console.log('\nTesting POST /api/amenities/hawker-report (Protected)...');
    const hawkerRes = await postJson('http://localhost:3000/api/amenities/hawker-report', {
      station_code: 'NDLS',
      description: 'Unauthorized vendor selling water on platform 1',
      schematic_x: 230.5,
      schematic_y: 110.2
    }, userDevToken);
    console.log('Status Code:', hawkerRes.statusCode);
    console.log('Response:', hawkerRes.data);

  } catch (err) {
    console.error('Error testing endpoints:', err);
  }
}

run();
