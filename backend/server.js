const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { uploadToDrive } = require('./services/driveService');

const app = express();

// Middleware
app.use(cors());
// Set limits for base64 image payload
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const DB_FILE = path.join(__dirname, 'db.json');

// Initialize local DB if it doesn't exist
if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({ photos: [], settings: {} }, null, 2));
}

// Basic health check route
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Photobooth API is running' });
});

// History Route for Admin Dashboard
app.get('/api/history', (req, res) => {
    try {
        const dbData = JSON.parse(fs.readFileSync(DB_FILE));
        res.json(dbData.photos || []);
    } catch (err) {
        res.status(500).json({ error: 'Failed to read database' });
    }
});

// Upload Route
app.post('/api/upload', async (req, res) => {
    try {
        const { image, type } = req.body; // type can be 'frame' or 'gif'
        if (!image) {
            return res.status(400).json({ error: 'No image data provided' });
        }

        const timestamp = Date.now();
        const extension = type === 'gif' ? 'gif' : 'jpg';
        const filename = `Photobooth_${timestamp}.${extension}`;

        // Upload to Google Drive (or mock if no credentials)
        const driveData = await uploadToDrive(image, filename);

        // Save to Local DB History
        const dbData = JSON.parse(fs.readFileSync(DB_FILE));
        const newRecord = {
            id: driveData.id,
            filename: filename,
            type: type || 'frame',
            date: new Date().toISOString(),
            webViewLink: driveData.webViewLink,
            webContentLink: driveData.webContentLink
        };
        
        if (!dbData.photos) dbData.photos = [];
        dbData.photos.unshift(newRecord); // Add to top
        
        fs.writeFileSync(DB_FILE, JSON.stringify(dbData, null, 2));

        res.json({
            success: true,
            message: 'Successfully uploaded',
            data: newRecord
        });

    } catch (err) {
        console.error("Upload Error:", err);
        res.status(500).json({ error: 'Failed to process upload' });
    }
});

// Start Server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Backend server is running on http://localhost:${PORT}`);
});
