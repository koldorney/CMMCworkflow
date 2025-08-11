const express = require('express');
const path = require('path');
const fs = require('fs');

// Import the scraper function
const collectDODAwardees = require('./scrape.js');

const app = express();

// Middleware
app.use(express.json());

// Basic logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Main scraping endpoint
app.post('/scrape', async (req, res) => {
    try {
        console.log('Scrape request received:', req.body);

        const options = {
            headless: req.body.headless !== false, // Default to true unless explicitly false
            outputDir: req.body.outputDir || './output',
            states: req.body.states || null, // null means all states
            timeout: req.body.timeout || 8000
        };

        console.log('Starting scrape with options:', options);

        // Call the scraper function
        const result = await collectDODAwardees(options);

        res.json({
            success: true,
            data: result,
            timestamp: new Date().toISOString(),
            message: `Found ${result.summary.totalUniqueAwardees} unique awardees`
        });

    } catch (error) {
        console.error('Scraping error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Get latest results endpoint
app.get('/results/latest', (req, res) => {
    try {
        const outputDir = './output';

        if (!fs.existsSync(outputDir)) {
            return res.status(404).json({
                success: false,
                error: 'No results found'
            });
        }

        const files = fs.readdirSync(outputDir)
            .filter(file => file.startsWith('dod_awardees_') && file.endsWith('.json'))
            .map(file => ({
                name: file,
                path: path.join(outputDir, file),
                mtime: fs.statSync(path.join(outputDir, file)).mtime
            }))
            .sort((a, b) => b.mtime - a.mtime);

        if (files.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'No result files found'
            });
        }

        const latestFile = files[0];
        const data = JSON.parse(fs.readFileSync(latestFile.path, 'utf8'));

        res.json({
            success: true,
            data: data,
            filename: latestFile.name,
            lastModified: latestFile.mtime
        });

    } catch (error) {
        console.error('Error reading results:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// List all result files
app.get('/results', (req, res) => {
    try {
        const outputDir = './output';

        if (!fs.existsSync(outputDir)) {
            return res.json({
                success: true,
                files: []
            });
        }

        const files = fs.readdirSync(outputDir)
            .filter(file => file.startsWith('dod_awardees_') && file.endsWith('.json'))
            .map(file => {
                const filePath = path.join(outputDir, file);
                const stats = fs.statSync(filePath);
                return {
                    name: file,
                    size: stats.size,
                    created: stats.birthtime,
                    modified: stats.mtime
                };
            })
            .sort((a, b) => b.modified - a.modified);

        res.json({
            success: true,
            files: files,
            count: files.length
        });

    } catch (error) {
        console.error('Error listing results:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'dod-scraper-api',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// API documentation endpoint
app.get('/', (req, res) => {
    res.json({
        service: 'DOD Scraper API',
        version: '1.0.0',
        endpoints: {
            'POST /scrape': 'Start a new scraping job',
            'GET /results/latest': 'Get the most recent results',
            'GET /results': 'List all result files',
            'GET /health': 'Health check'
        },
        scrapeOptions: {
            headless: 'boolean (default: true)',
            outputDir: 'string (default: "./output")',
            states: 'array of state objects or null for all states',
            timeout: 'number (default: 8000)'
        }
    });
});

// Handle 404 - using a more compatible approach
app.use((req, res) => {
    res.status(404).json({
        error: 'Endpoint not found',
        availableEndpoints: ['POST /scrape', 'GET /results/latest', 'GET /results', 'GET /health']
    });
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({
        success: false,
        error: 'Internal server error'
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`DOD Scraper API running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
    console.log(`Scrape endpoint: POST http://localhost:${PORT}/scrape`);
    console.log(`Latest results: GET http://localhost:${PORT}/results/latest`);

    // Create output directory if it doesn't exist
    if (!fs.existsSync('./output')) {
        fs.mkdirSync('./output');
        console.log('Created output directory');
    }
});