const http = require('http');

const data = JSON.stringify({
  identifier: 'employee',
  password: 'password123'
});

console.log('Sending login request with data:', data);

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  console.log('Status:', res.statusCode);
  let body = '';
  res.on('data', (chunk) => {
    body += chunk;
  });
  res.on('end', () => {
    console.log('Response body:', body);
    try {
      const response = JSON.parse(body);
      if (response.data && response.data.token) {
        console.log('Token:', response.data.token);
      } else {
        console.log('Full response:', response);
      }
    } catch (error) {
      console.error('Parse error:', error);
    }
  });
});

req.on('error', (error) => {
  console.error('Request error:', error);
});

req.write(data);
req.end();