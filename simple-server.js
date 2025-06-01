// Simple Express server to serve the frontend
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');

const app = express();
const port = 3000;

// Proxy API requests to the backend
app.use('/api', createProxyMiddleware({ 
  target: 'http://localhost:8000',
  changeOrigin: true,
  pathRewrite: {
    '^/api': '/' // Remove /api prefix when forwarding to backend
  }
}));

// Serve static files
app.use(express.static(path.join(__dirname, 'src')));

// Serve the index.html for all routes to enable client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'src', 'index.html'));
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
}); 