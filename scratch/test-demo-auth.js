const http = require('http');

const adminDevToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYWZhNWI3NTAtNzZjZS00OWI0LTkxNTItMjY4MjA2ZTgwZjBjIiwicGhvbmUiOiI5OTk5OTk5OTk5IiwiaWF0IjoxNzgxMDIxNzk3LCJleHAiOjE3ODM2MTM3OTd9.JRm7oCU_rnG7qcvqYL7NdlwizhpRFZ41nPgWQdju4XQ';
const userDevToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoidXNlci1kZW1vLWlkLTEyMzQ1IiwicGhvbmUiOiIxMjM0NTY3ODkwIiwiaWF0IjoxNzgxMDIxNzk3LCJleHAiOjE3ODM2MTM3OTd9.mockSignature';

function postJson(url, data) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(data);
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = http.request(url, options, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: body ? JSON.parse(body) : null
        });
      });
    });

    req.on('error', (e) => reject(e));
    req.write(payload);
    req.end();
  });
}

async function test() {
  try {
    console.log('Testing Admin login...');
    const adminRes = await postJson('http://localhost:3000/api/auth/verify-otp', {
      phone: '9999999999',
      access_token: adminDevToken
    });
    console.log('Admin Status:', adminRes.statusCode);
    console.log('Admin Data:', adminRes.data);
  } catch (err) {
    console.error('Admin Failed:', err.message);
  }

  try {
    console.log('Testing User login...');
    const userRes = await postJson('http://localhost:3000/api/auth/verify-otp', {
      phone: '1234567890',
      access_token: userDevToken
    });
    console.log('User Status:', userRes.statusCode);
    console.log('User Data:', userRes.data);
  } catch (err) {
    console.error('User Failed:', err.message);
  }
}

test();
