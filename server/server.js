const http = require('http');
const { randomBytes } = require('crypto');
const url = require('url');

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);

  if (parsedUrl.pathname === '/ping') {
    // Latency Test
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('pong');
  } else if (parsedUrl.pathname === '/data') {
    // Speed Test with optional DATA_SIZE parameter
    const query = parsedUrl.query;
    const dataSize = parseInt(query.size, 10) || 100 * 1024 * 1024; // Default to 100 MB if size not provided

    if (isNaN(dataSize) || dataSize <= 0) {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('Invalid size parameter. Please provide a positive number.');
      return;
    }

    try {
      const data = randomBytes(dataSize);
      res.writeHead(200, {
        'Content-Type': 'application/octet-stream',
        'Content-Length': data.length
      });
      res.end(data);
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Error generating data: ' + err.message);
    }
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});