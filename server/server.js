// Server Code
const http = require('http');
const { randomBytes } = require('crypto');

const DATA_SIZE = 100 * 1024 * 1024; // 100 MB data size for speed test
const data = randomBytes(DATA_SIZE);

const server = http.createServer((req, res) => {
  if (req.url === '/ping') {
    // Latency Test
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('pong');
  } else if (req.url === '/data') {
    // Speed Test
    res.writeHead(200, {
      'Content-Type': 'application/octet-stream',
      'Content-Length': data.length
    });
    res.end(data);
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
