const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const textToSpeech = require('@google-cloud/text-to-speech');
const util = require('util');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Create audio directory if it doesn't exist
const audioDir = path.join(__dirname, 'audio');
if (!fs.existsSync(audioDir)) {
    fs.mkdirSync(audioDir);
}

// Initialize Google TTS client (you can also use other TTS engines)
// For demo purposes, we'll use a simulated TTS or you can integrate with Google Cloud
// const client = new textToSpeech.TextToSpeechClient();

// Khmer and English voice mapping
const voiceConfig = {
    'en': {
        languageCode: 'en-US',
        name: 'en-US-Neural2-F',
        ssmlGender: 'FEMALE'
    },
    'km': {
        languageCode: 'km-KH',
        name: 'km-KH-Standard-A',
        ssmlGender: 'FEMALE'
    }
};

// Simple TTS function (simulated for demo - in production, use actual TTS service)
async function generateSpeech(text, language) {
    try {
        // For production, uncomment and use Google TTS
        /*
        const request = {
            input: { text: text },
            voice: voiceConfig[language],
            audioConfig: { audioEncoding: 'MP3' },
        };
        
        const [response] = await client.synthesizeSpeech(request);
        return response.audioContent;
        */
        
        // Simulated response for demo
        // In production, replace with actual TTS service
        const audioContent = Buffer.from(`Simulated audio for: ${text}`).toString('base64');
        return audioContent;
        
    } catch (error) {
        console.error('TTS Error:', error);
        throw error;
    }
}

// API Routes
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'TTS API is running' });
});

app.get('/api/voices', (req, res) => {
    res.json({
        languages: [
            { code: 'en', name: 'English', voice: 'en-US-Neural2-F' },
            { code: 'km', name: 'Khmer (ភាសាខ្មែរ)', voice: 'km-KH-Standard-A' }
        ]
    });
});

app.post('/api/tts', async (req, res) => {
    try {
        const { text, language, speed = 1.0, pitch = 0 } = req.body;
        
        if (!text || !language) {
            return res.status(400).json({ error: 'Text and language are required' });
        }
        
        if (!['en', 'km'].includes(language)) {
            return res.status(400).json({ error: 'Language must be either "en" or "km"' });
        }
        
        // Generate audio
        const audioContent = await generateSpeech(text, language);
        
        // Create unique filename
        const filename = `${uuidv4()}.mp3`;
        const filepath = path.join(audioDir, filename);
        
        // Save audio file (in production, you'd save the actual audio)
        // For demo, we'll save the simulated data
        fs.writeFileSync(filepath, Buffer.from(audioContent, 'base64'));
        
        res.json({
            success: true,
            audioUrl: `${req.protocol}://${req.get('host')}/api/audio/${filename}`,
            filename: filename,
            duration: Math.ceil(text.length / 15) // Rough estimate: 15 chars per second
        });
        
    } catch (error) {
        console.error('Error generating speech:', error);
        res.status(500).json({ error: 'Failed to generate speech' });
    }
});

app.get('/api/audio/:filename', (req, res) => {
    const filename = req.params.filename;
    const filepath = path.join(audioDir, filename);
    
    if (fs.existsSync(filepath)) {
        res.sendFile(filepath);
    } else {
        res.status(404).json({ error: 'Audio file not found' });
    }
});

app.delete('/api/audio/:filename', (req, res) => {
    const filename = req.params.filename;
    const filepath = path.join(audioDir, filename);
    
    if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
        res.json({ success: true, message: 'File deleted' });
    } else {
        res.status(404).json({ error: 'Audio file not found' });
    }
});

// Cleanup old files periodically (every hour)
setInterval(() => {
    const files = fs.readdirSync(audioDir);
    const now = Date.now();
    
    files.forEach(file => {
        const filepath = path.join(audioDir, file);
        const stats = fs.statSync(filepath);
        const age = now - stats.mtimeMs;
        
        // Delete files older than 1 hour
        if (age > 3600000) {
            fs.unlinkSync(filepath);
            console.log(`Deleted old file: ${file}`);
        }
    });
}, 3600000);

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Audio directory: ${audioDir}`);
});
