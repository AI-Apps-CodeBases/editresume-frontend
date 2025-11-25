const http = require('http');
const https = require('https');
const { URL } = require('url');

const TARGET_URL = 'https://staging.editresume.io';
const PROXY_PORT = 3000;

const server = http.createServer((req, res) => {
  const targetUrl = new URL(req.url, TARGET_URL);
  
  const options = {
    hostname: targetUrl.hostname,
    port: targetUrl.port || 443,
    path: targetUrl.pathname + targetUrl.search,
    method: req.method,
    headers: {
      ...req.headers,
      host: targetUrl.hostname,
    },
  };

  const proxyReq = https.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    console.error('Proxy error:', err);
    res.writeHead(500);
    res.end('Proxy error: ' + err.message);
  });

  req.pipe(proxyReq);
});

server.listen(PROXY_PORT, () => {
  console.log(`Proxy server running on http://localhost:${PROXY_PORT}`);
  console.log(`Proxying to ${TARGET_URL}`);
});

