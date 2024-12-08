// server.js
import express from 'express';
import cors from 'cors';
import { createProxyMiddleware } from 'http-proxy-middleware';

const app = express();

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));

// Add error handling for the proxy
const proxy = createProxyMiddleware({
  target: 'https://login.a2mac1.com',
  changeOrigin: true,
  pathRewrite: {
    '^/api': ''
  },
  cookieDomainRewrite: 'localhost',
  onProxyReq: (proxyReq, req) => {
    if (req.headers.cookie) {
      proxyReq.setHeader('Cookie', req.headers.cookie);
    }
    proxyReq.setHeader('Origin', 'https://login.a2mac1.com');
    proxyReq.setHeader('Referer', 'https://login.a2mac1.com/');
  },
  onProxyRes: (proxyRes) => {
    proxyRes.headers['access-control-allow-credentials'] = 'true';
    if (proxyRes.headers['set-cookie']) {
      proxyRes.headers['set-cookie'] = proxyRes.headers['set-cookie'].map(cookie =>
        cookie.replace('secure;', '').replace('SameSite=Lax', 'SameSite=None')
      );
    }
  },
  // Add error handling
  onError: (err, req, res) => {
    console.error('Proxy Error:', err);
    res.status(500).send('Proxy Error');
  }
});

app.use('/api', proxy);

// Add general error handling
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).send('Server Error');
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Proxy server running on port ${PORT}`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Please stop the existing server.`);
  } else {
    console.error('Server error:', err);
  }
});