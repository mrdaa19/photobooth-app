const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

// Ganti dengan Folder ID dari Google Drive Anda
const FOLDER_ID = 'YOUR_GOOGLE_DRIVE_FOLDER_ID';

async function uploadToDrive(base64Data, filename) {
    try {
        const credentialsPath = path.join(__dirname, '../credentials.json');
        
        // Cek apakah file credentials ada
        if (!fs.existsSync(credentialsPath)) {
            console.log("Mock Upload: credentials.json tidak ditemukan. Menggunakan URL Dummy.");
            // Simulasi delay upload
            await new Promise(r => setTimeout(r, 1000));
            return {
                id: 'dummy_id_123',
                webViewLink: `https://mock-gdrive.com/view/${filename}`,
                webContentLink: `https://mock-gdrive.com/download/${filename}`
            };
        }

        // Jika credentials.json ada, lakukan upload sungguhan
        const auth = new google.auth.GoogleAuth({
            keyFile: credentialsPath,
            scopes: ['https://www.googleapis.com/auth/drive.file'],
        });

        const drive = google.drive({ version: 'v3', auth });

        // Pisahkan metadata base64
        const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
            throw new Error('Invalid base64 input');
        }

        const mimeType = matches[1];
        const buffer = Buffer.from(matches[2], 'base64');

        // Buat stream dari buffer
        const { Readable } = require('stream');
        const stream = new Readable();
        stream.push(buffer);
        stream.push(null);

        const fileMetadata = {
            name: filename,
            parents: [FOLDER_ID]
        };

        const media = {
            mimeType: mimeType,
            body: stream
        };

        const response = await drive.files.create({
            resource: fileMetadata,
            media: media,
            fields: 'id, webViewLink, webContentLink',
        });

        return response.data;
    } catch (error) {
        console.error('Error uploading to Drive:', error);
        throw error;
    }
}

module.exports = {
    uploadToDrive
};
