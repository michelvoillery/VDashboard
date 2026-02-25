const express = require('express');
console.log('--- SERVER SCRIPT STARTING ---');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const ping = require('ping');
const net = require('net');

const app = express();
const PORT = process.env.PORT || 3001;
const CONFIG_PATH = path.join(__dirname, '../data/config.json');
const BACKGROUNDS_DIR = path.join(__dirname, '../data/backgrounds');
const ICONS_DIR = path.join(__dirname, '../data/icons');

// Ensure directories exist
[path.dirname(CONFIG_PATH), BACKGROUNDS_DIR, ICONS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configure multer for background uploads
const bgStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, BACKGROUNDS_DIR),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const uploadBg = multer({ storage: bgStorage });

// Configure multer for icon uploads
const iconStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, ICONS_DIR),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'icon-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const uploadIcon = multer({ storage: iconStorage });

app.use(cors());
app.use(bodyParser.json());

// Serve background images and custom icons statically
app.use('/api/backgrounds/images', express.static(BACKGROUNDS_DIR));
app.use('/api/icons/images', express.static(ICONS_DIR));

// Get list of background images
app.get('/api/backgrounds', (req, res) => {
  fs.readdir(BACKGROUNDS_DIR, (err, files) => {
    if (err) return res.status(500).send('Error reading backgrounds');
    const images = files.filter(file => /\.(jpg|jpeg|png|gif|webp)$/i.test(file));
    res.json(images);
  });
});

// Upload background image
app.post('/api/backgrounds/upload', uploadBg.single('background'), (req, res) => {
  if (!req.file) return res.status(400).send('No file uploaded');
  res.json({ filename: req.file.filename });
});

// Upload custom icon
app.post('/api/icons/upload', uploadIcon.single('icon'), (req, res) => {
  if (!req.file) return res.status(400).send('No file uploaded');
  res.json({ filename: req.file.filename });
});

// Delete background image
app.delete('/api/backgrounds/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(BACKGROUNDS_DIR, filename);
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).send('File not found');
  }

  fs.unlink(filePath, (err) => {
    if (err) {
      console.error('Error deleting file:', err);
      return res.status(500).send('Error deleting file');
    }
    res.send('File deleted successfully');
  });
});

// Get dashboard config
app.get('/api/config', (req, res) => {
  console.log('GET request received for config');
  
  const defaultConfig = {
    sections: [],
    dashboardTitle: 'Homelab Dashboard',
    titleColor: '#ffffff',
    cardColor: '#1e293b',
    cardOpacity: 80,
    useBlur: true,
    textColor: '#ffffff',
    titleFontSize: 18,
    urlFontSize: 12,
    ipFontSize: 10,
    fontFamily: 'sans-serif',
    cardSize: 200,
    cardHeight: 160,
    cardRounding: 16,
    iconSize: 64
  };

  if (!fs.existsSync(CONFIG_PATH)) {
    return res.json(defaultConfig);
  }

  fs.readFile(CONFIG_PATH, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading config:', err);
      return res.json(defaultConfig);
    }
    
    try {
      let config = JSON.parse(data || '{}');
      
      // Merge with defaults to ensure all required fields exist
      config = { ...defaultConfig, ...config };

      // Migration logic: convert flat services to sections if necessary
      if (config.services && !config.sections.length) {
        config.sections = [
          {
            id: 'default-section',
            name: 'Default Section',
            services: config.services
          }
        ];
        delete config.services;
      }
      
      res.json(config);
    } catch (parseErr) {
      console.error('Error parsing config JSON:', parseErr);
      res.json(defaultConfig);
    }
  });
});

// Check status of services
app.get('/api/status', async (req, res) => {
  const { ips } = req.query;
  if (!ips) return res.json({});

  const ipList = ips.split(',');
  const results = {};

  const checkStatus = async (address) => {
    if (!address) return 'none';
    
    // Check if it has a port (e.g. 192.168.1.50:8080)
    if (address.includes(':')) {
      const [host, port] = address.split(':');
      return new Promise((resolve) => {
        const socket = new net.Socket();
        socket.setTimeout(2000);
        socket.on('connect', () => {
          socket.destroy();
          resolve('online');
        })
        .on('timeout', () => {
          socket.destroy();
          resolve('offline');
        })
        .on('error', () => {
          socket.destroy();
          resolve('offline');
        })
        .connect(port, host);
      });
    } else {
      // Simple ICMP Ping
      try {
        const res = await ping.promise.probe(address, { timeout: 2 });
        return res.alive ? 'online' : 'offline';
      } catch (e) {
        return 'offline';
      }
    }
  };

  await Promise.all(ipList.map(async (ip) => {
    results[ip] = await checkStatus(ip);
  }));

  res.json(results);
});

// Update dashboard config
app.post('/api/config', (req, res) => {
  try {
    const newConfig = req.body;
    console.log('Received config update request');
    
    if (!newConfig || typeof newConfig !== 'object' || !Array.isArray(newConfig.sections)) {
      console.error('Invalid config data structure received:', JSON.stringify(newConfig));
      return res.status(400).send('Invalid config data: sections must be an array');
    }

    const jsonString = JSON.stringify(newConfig, null, 2);
    
    // Allow empty services array, but reject if stringify somehow fails or results in empty object
    if (!jsonString || jsonString === '{}') {
      console.error('Refusing to write empty or trivial config');
      return res.status(400).send('Config appears invalid');
    }

    // Ensure data directory exists
    const dataDir = path.dirname(CONFIG_PATH);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    fs.writeFile(CONFIG_PATH, jsonString, (err) => {
      if (err) {
        console.error('Error writing config file:', err);
        return res.status(500).send('Error writing config file');
      }
      console.log('Config updated successfully');
      res.send('Config updated successfully');
    });
  } catch (err) {
    console.error('Unexpected error in POST /api/config:', err);
    res.status(500).send('Internal server error');
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Express Error:', err);
  res.status(500).send('Something went wrong!');
});

process.on('uncaughtException', (err) => {
  console.error('CRITICAL: Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('CRITICAL: Unhandled Rejection at:', promise, 'reason:', reason);
});

// Serve frontend in production (MUST BE AFTER ALL OTHER ROUTES)
const DIST_PATH = path.join(__dirname, '../client/dist');
if (fs.existsSync(DIST_PATH)) {
  app.use(express.static(DIST_PATH));
  app.get('*', (req, res) => {
    if (req.url.startsWith('/api')) {
      return res.status(404).send('API endpoint not found');
    }
    res.sendFile(path.join(DIST_PATH, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`SERVER_START: Listening on port ${PORT} at ${new Date().toISOString()}`);
});
