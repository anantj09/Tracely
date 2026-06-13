const http = require('http');

function testEndpoint(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: 'GET'
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function run() {
  try {
    console.log('Testing /api/complaints/public/stats:');
    const stats = await testEndpoint('/api/complaints/public/stats');
    console.log(JSON.stringify(stats, null, 2));

    console.log('\nTesting /api/complaints/public/heatmap:');
    const heatmap = await testEndpoint('/api/complaints/public/heatmap');
    console.log(JSON.stringify(heatmap, null, 2));

    console.log('\nTesting /api/complaints/public/train-routes:');
    const routes = await testEndpoint('/api/complaints/public/train-routes');
    console.log(JSON.stringify(routes, null, 2));
  } catch (err) {
    console.error('Test failed:', err);
  }
}

run();
