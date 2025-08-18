const http = require('http');

const data = JSON.stringify({
  username: 'employee',
  password: 'password123'
});

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
  let body = '';
  res.on('data', (chunk) => {
    body += chunk;
  });
  res.on('end', () => {
    try {
      const response = JSON.parse(body);
      if (response.data && response.data.token) {
        console.log(response.data.token);
      } else {
        console.error('No token in response:', response);
      }
    } catch (error) {
      console.error('Parse error:', error, body);
    }
  });
});

req.on('error', (error) => {
  console.error('Request error:', error);
});

req.write(data);
req.end();