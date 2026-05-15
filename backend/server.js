const express = require('express');
const cors = require('cors');
const multer = require('multer');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Basic health check route
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Photobooth API is running' });
});

// Start Server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Backend server is running on http://localhost:${PORT}`);
});
