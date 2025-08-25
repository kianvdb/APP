require('dotenv').config();

/**
 * Environment Variable Validation
 * Ensures all required environment variables are present before server startup
 */
const requiredEnvVars = ['JWT_SECRET', 'MONGODB_URI', 'MESHY_API_KEY'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
    console.error('❌ Missing required environment variables:', missingEnvVars);
    console.error('Please create a .env file with these variables');
    process.exit(1);
}

/**
 * Server Startup Logging
 * Provides diagnostic information for deployment environments
 */
console.log('🚀 Server starting...');
console.log('📍 __dirname:', __dirname);
console.log('📍 process.cwd():', process.cwd());
console.log('📍 NODE_ENV:', process.env.NODE_ENV);
console.log('📍 Running on Render?', process.env.RENDER === 'true');

/**
 * Core Dependencies
 */
const https = require('https');
const http = require('http');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const axios = require('axios');
const path = require('path');
const cookieParser = require('cookie-parser');
const fs = require('fs');

const authMiddleware = require('./middleware/auth');

const app = express();

/**
 * Capacitor/Mobile CORS Handler
 * Handles CORS for mobile app requests before other middleware
 */
app.use((req, res, next) => {
    const origin = req.headers.origin;
    
    const capacitorOrigins = [
        'http://localhost',
        'https://localhost', 
        'capacitor://localhost',
        'ionic://localhost'
    ];
    
    if (capacitorOrigins.includes(origin) || origin === 'http://localhost') {
        res.header('Access-Control-Allow-Origin', origin);
        res.header('Access-Control-Allow-Credentials', 'true');
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, HEAD');
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cookie, Cache-Control, Pragma, X-Cache-Control, If-Modified-Since, If-None-Match');
        res.header('Access-Control-Expose-Headers', 'Content-Disposition, Content-Type, Content-Length');
        
        if (req.method === 'OPTIONS') {
            console.log('✅ Handling Capacitor OPTIONS request from:', origin);
            return res.sendStatus(200);
        }
    }
    
    next();
});

/**
 * Middleware Configuration
 */
app.use(cookieParser());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

/**
 * CORS Configuration
 * Comprehensive origin whitelist for development and production
 */
const corsOptions = {
    origin: function (origin, callback) {
        if (!origin) {
            return callback(null, true);
        }
        
        const allowedOrigins = [
            // Capacitor origins
            'http://localhost',
            'https://localhost',
            'capacitor://localhost',
            'ionic://localhost',
            
            // Development origins
            'http://localhost:5173', 
            'http://localhost:3001', 
            'http://127.0.0.1:5500',
            'http://localhost:3000',
            'http://127.0.0.1:3000',
            
            // HTTPS origins for development
            'https://localhost:5173',
            'https://localhost:3001',
            'https://localhost:3000',
            'https://127.0.0.1:3000',
            
            // Network access
            'http://192.168.1.41:3000',
            'http://192.168.1.41:3001',
            
            // Live Server origins
            'http://127.0.0.1:59063',
            'http://localhost:59063',
            'http://127.0.0.1:5500',
            'http://127.0.0.1:5501',
            'http://127.0.0.1:5502',
            'http://localhost:5500',
            'http://localhost:5501',
            'http://localhost:5502',
            'http://127.0.0.1:63338',
            'http://localhost:63338',
            'http://127.0.0.1:64533',
            'http://localhost:64533',
            
            // Production URLs
            'https://threely-ai.onrender.com',
            
            // Android emulator
            'http://10.0.2.2:5173',
            'http://10.0.2.2:3000',
            'http://10.0.2.2:3001',
            'https://10.0.2.2:3000',
            'https://10.0.2.2',
            'http://10.0.2.2'
        ];
        
        const localhostPattern = /^https?:\/\/(localhost|127\.0\.0\.1|10\.0\.2\.2)(:\d+)?$/;
        
        if (allowedOrigins.includes(origin) || localhostPattern.test(origin)) {
            callback(null, true);
        } else {
            console.log('⚠️ CORS: Origin not explicitly allowed:', origin, '- allowing anyway for mobile compatibility');
            callback(null, true);
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-Requested-With', 'Accept', 'Origin'],
    credentials: true,
    optionsSuccessStatus: 200,
    maxAge: 86400
};

app.use(cors(corsOptions));

/**
 * Global OPTIONS Handler
 * Ensures preflight requests are handled properly
 */
app.options('*', (req, res) => {
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, HEAD');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie, X-Requested-With, Accept, Origin');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.sendStatus(200);
});

/**
 * Route Imports
 */
const authRoutes = require('./routes/auth');
const paymentRoutes = require('./routes/payment');
const assetRoutes = require('./routes/assets');

/**
 * Route Mounting
 */
app.use('/api/auth', authRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/assets', assetRoutes);

/**
 * Frontend Directory Validation
 * Logs frontend structure for deployment debugging
 */
const frontendPath = path.join(__dirname, '../frontend');
console.log('📁 Frontend path:', frontendPath);
console.log('📁 Frontend exists?', fs.existsSync(frontendPath));

if (fs.existsSync(frontendPath)) {
    console.log('📁 Frontend contents:', fs.readdirSync(frontendPath));
    
    ['css', 'src', 'js', 'public', 'html', 'models'].forEach(dir => {
        const dirPath = path.join(frontendPath, dir);
        if (fs.existsSync(dirPath)) {
            console.log(`✅ ${dir} exists:`, fs.readdirSync(dirPath).slice(0, 5).join(', '), '...');
        } else {
            console.log(`❌ ${dir} does NOT exist`);
        }
    });
}

console.log("🛠️ Meshy API Key:", process.env.MESHY_API_KEY ? "✅ Loaded" : "❌ Missing");

const port = process.env.PORT || 3000;

/**
 * Static File Serving
 * Serves frontend assets with proper caching
 */
app.use('/frontend', express.static(path.join(__dirname, '../frontend'), {
    fallthrough: true,
    index: false,
    maxAge: '1d',
    etag: true
}));

app.use('/frontend/css', express.static(path.join(__dirname, '../frontend/css')));
app.use('/frontend/src', express.static(path.join(__dirname, '../frontend/src')));
app.use('/frontend/js', express.static(path.join(__dirname, '../frontend/js')));
app.use('/frontend/public', express.static(path.join(__dirname, '../frontend/public')));
app.use('/frontend/html', express.static(path.join(__dirname, '../frontend/html')));
app.use('/frontend/models', express.static(path.join(__dirname, '../frontend/models')));

/**
 * Static File Request Logger
 * Debug middleware for tracking static file requests
 */
app.use((req, res, next) => {
    if (req.path.startsWith('/frontend')) {
        console.log('📁 Static file requested:', req.path);
        console.log('📁 Full URL:', req.url);
        console.log('📁 Method:', req.method);
    }
    next();
});

/**
 * HTML Route Handlers
 */
app.get('/', (req, res) => {
    console.log('🏠 Serving homepage at root');
    res.sendFile(path.join(__dirname, '../frontend/html/homepage.html'));
});

app.get('/homepage.html', (req, res) => {
    console.log('🏠 Serving homepage at /homepage.html');
    res.sendFile(path.join(__dirname, '../frontend/html/homepage.html'));
});

app.get('/:page.html', (req, res, next) => {
    const page = req.params.page;
    const filePath = path.join(__dirname, '../frontend/html/', `${page}.html`);
    
    console.log(`📄 Trying to serve HTML page: ${page}.html`);
    console.log(`📄 Looking for file at: ${filePath}`);
    
    if (page.startsWith('api')) {
        return next();
    }
    
    if (fs.existsSync(filePath)) {
        console.log(`✅ Found and serving: ${page}.html`);
        res.sendFile(filePath);
    } else {
        console.log(`❌ HTML file not found: ${page}.html`);
        next();
    }
});

/**
 * MongoDB Connection
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/dalma-ai');
    console.log(`🗄️ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    console.log('💡 Make sure your MongoDB URI and credentials are correct in .env');
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
};

connectDB();

/**
 * Multer Configuration for File Uploads
 */
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const YOUR_API_KEY = process.env.MESHY_API_KEY || '';

/**
 * Health Check Endpoint
 */
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Server is healthy',
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
  });
});

/**
 * Download Route CORS Handler
 * Special CORS handling for file download endpoints
 */
app.use('/api/assets/*/download', (req, res, next) => {
  console.log(`🔥 CORS middleware for download route: ${req.method} ${req.url}`);
  console.log(`🔥 Origin: ${req.headers.origin}`);
  console.log(`🔥 Request headers:`, Object.keys(req.headers));
  
  const origin = req.headers.origin;
  const allowedOrigins = [
    'http://localhost:5173', 
    'http://localhost:3001', 
    'http://127.0.0.1:5500',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:59063',
    'http://localhost:59063',
    'http://127.0.0.1:5500',
    'http://127.0.0.1:5501',
    'http://127.0.0.1:5502',
    'http://localhost:5500',
    'http://localhost:5501',
    'http://localhost:5502',
    'http://127.0.0.1:63338',
    'http://localhost:63338',
    'http://127.0.0.1:64533',
    'http://localhost:64533',
    'https://threely-ai.onrender.com',
  ];
  
  const isAllowed = allowedOrigins.includes(origin) || 
                   /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);
  
  if (isAllowed) {
    res.header('Access-Control-Allow-Origin', origin);
    console.log(`✅ CORS origin allowed: ${origin}`);
  } else {
    console.log(`⚠️ CORS origin not in allowed list: ${origin}`);
    res.header('Access-Control-Allow-Origin', origin);
  }
  
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, HEAD');
  res.header('Access-Control-Allow-Headers', 
    'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cookie, Cache-Control, Pragma, X-Cache-Control, If-Modified-Since, If-None-Match');
  res.header('Access-Control-Expose-Headers', 'Content-Disposition, Content-Type, Content-Length');
  res.header('Access-Control-Max-Age', '86400');
  
  if (req.method === 'OPTIONS') {
    console.log('🔍 OPTIONS preflight request for download route');
    res.status(200).end();
    return;
  }
  
  console.log('✅ CORS headers set for download route, proceeding...');
  next();
});

/**
 * Asset Routes OPTIONS Handler
 */
app.options('/api/assets/*', (req, res) => {
  console.log(`🔍 OPTIONS request for ${req.url} from origin: ${req.headers.origin}`);
  
  const origin = req.headers.origin;
  const allowedOrigins = [
    'http://localhost:5173', 'http://localhost:3001', 'http://127.0.0.1:5500',
    'http://localhost:3000', 'http://127.0.0.1:3000', 'http://127.0.0.1:59063',
    'http://localhost:59063', 'http://127.0.0.1:5500', 'http://127.0.0.1:5501',
    'http://127.0.0.1:5502', 'http://localhost:5500', 'http://localhost:5501',
    'http://localhost:5502', 'http://127.0.0.1:63338', 'http://localhost:63338',
    'http://127.0.0.1:64533', 'http://localhost:64533',
    'https://threely-ai.onrender.com',
  ];
  
  const isAllowed = allowedOrigins.includes(origin) || 
                   /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);
  
  if (isAllowed) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, HEAD');
  res.header('Access-Control-Allow-Headers', 
    'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cookie, Cache-Control, Pragma, X-Cache-Control, If-Modified-Since, If-None-Match');
  
  res.status(200).end();
});

/**
 * Meshy AI Integration Functions
 */

/**
 * Creates a 3D preview task using Meshy AI API
 * @param {string} imageBase64 - Base64 encoded image
 * @param {string} topology - Model topology type
 * @param {boolean} shouldTexture - Whether to apply texture
 * @param {string} symmetryMode - Symmetry mode for generation
 * @param {boolean} enablePBR - Enable PBR materials
 * @param {number} targetPolycount - Target polygon count
 * @returns {string} Task ID for tracking generation progress
 */
const createPreviewTask = async (imageBase64, topology = 'triangle', shouldTexture = true, symmetryMode = 'auto', enablePBR = false, targetPolycount = 30000) => {
  const headers = { Authorization: `Bearer ${YOUR_API_KEY}` };

  const payload = {
    image_url: imageBase64,
    ai_model: 'meshy-4',
    topology,
    target_polycount: targetPolycount,
    should_remesh: true,
    enable_pbr: enablePBR,
    should_texture: shouldTexture,
    symmetry_mode: symmetryMode,
    prompt: "dog"
  };

  try {
    console.log("🚀 Sending request to Meshy API...");
    console.log("📺 Topology being sent to Meshy:", topology);
    const response = await axios.post(
      'https://api.meshy.ai/openapi/v1/image-to-3d',
      payload,
      { headers }
    );
    console.log('✅ Meshy API Response:', response.data);
    return response.data.result?.task_id || response.data.result;
  } catch (error) {
    console.error('❌ Error creating preview task:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Generate 3D Model Endpoint
 * Initiates 3D model generation from uploaded image
 */
app.post('/api/generateModel', upload.single('image'), async (req, res) => {
  console.log('📥 Received a request to generate model...');
  try {
    if (!req.file) {
      console.error('❌ No file uploaded.');
      return res.status(400).send('No file uploaded.');
    }

    const imageBase64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    console.log('🖼️ Image received, converting to base64...');

    const selectedTopology = req.body.topology || 'triangle';
    const shouldTexture = req.body.shouldTexture === 'true';
    const enablePBR = req.body.enablePBR === 'true';
    const validSymmetryModes = ['off', 'auto', 'on'];
    const rawSymmetry = req.body.symmetryMode;
    const selectedSymmetryMode = validSymmetryModes.includes(rawSymmetry) ? rawSymmetry : 'auto';

    let targetPolycount = parseInt(req.body.targetPolycount);
    if (isNaN(targetPolycount) || targetPolycount < 100 || targetPolycount > 300000) {
      console.warn(`⚠️ Invalid polycount received: ${req.body.targetPolycount}, defaulting to 30000.`);
      targetPolycount = 30000;
    }

    console.log(`🔧 Parameters:
      Topology: ${selectedTopology}
      Texture: ${shouldTexture}
      Symmetry Mode: ${selectedSymmetryMode}
      PBR: ${enablePBR}
      Polycount: ${targetPolycount}
    `);

    const previewTaskId = await createPreviewTask(
      imageBase64,
      selectedTopology,
      shouldTexture,
      selectedSymmetryMode,
      enablePBR,
      targetPolycount
    );

    console.log(`✅ Preview task started with taskId: ${previewTaskId}`);
    
    /**
     * Store generation metadata for later asset creation
     */
    req.app.locals.pendingAssets = req.app.locals.pendingAssets || {};
    req.app.locals.pendingAssets[previewTaskId] = {
      originalImage: imageBase64,
      parameters: {
        topology: selectedTopology,
        shouldTexture,
        symmetryMode: selectedSymmetryMode,
        enablePBR,
        targetPolycount
      },
      createdAt: new Date()
    };

    res.json({ taskId: previewTaskId, modelUrls: null });

  } catch (error) {
    console.error('❌ Error during model generation:', error);
    res.status(500).send('Error generating model.');
  }
});

/**
 * Get Model Status Endpoint
 * Retrieves the current status of a model generation task
 */
app.get('/api/getModel/:taskId', async (req, res) => {
  const { taskId } = req.params;
  console.log(`🔍 Received status request for taskId: ${taskId}`);
  try {
    const headers = { Authorization: `Bearer ${YOUR_API_KEY}` };
    const response = await axios.get(
      `https://api.meshy.ai/openapi/v1/image-to-3d/${taskId}`,
      { headers }
    );
    console.log('📦 Model status response:', response.data);
    res.json(response.data);
  } catch (error) {
    console.error('❌ Error retrieving model status:', error.response?.data || error.message);
    res.status(500).send('Error retrieving model status.');
  }
});

/**
 * Model Status Endpoint (Alias)
 * Alternative endpoint for checking model generation status
 */
app.get('/api/status/:taskId', async (req, res) => {
  const { taskId } = req.params;
  console.log(`🔍 Received status request (alias /status) for taskId: ${taskId}`);
  try {
    const headers = { Authorization: `Bearer ${YOUR_API_KEY}` };
    const response = await axios.get(
      `https://api.meshy.ai/openapi/v1/image-to-3d/${taskId}`,
      { headers }
    );
    console.log('📦 Model status response (via /status):', response.data);
    res.json(response.data);
  } catch (error) {
    console.error('❌ Error retrieving model status (/status route):', error.response?.data || error.message);
    res.status(500).send('Error retrieving model status.');
  }
});

/**
 * Proxy Model Download Endpoint
 * Fetches and serves model files from Meshy API
 */
app.get('/api/proxyModel/:taskId', async (req, res) => {
  const { taskId } = req.params;
  const format = req.query.format || 'glb';

  console.log(`📥 Fetching model for taskId: ${taskId} in format: ${format}`);
  try {
    const headers = { Authorization: `Bearer ${YOUR_API_KEY}` };

    const statusRes = await axios.get(
      `https://api.meshy.ai/openapi/v1/image-to-3d/${taskId}`,
      { headers }
    );

    const modelStatus = statusRes.data?.status;
    if (modelStatus !== 'SUCCEEDED') {
      console.warn(`⚠️ Model not ready (status: ${modelStatus})`);
      return res.status(400).send(`Model not ready, status: ${modelStatus}`);
    }

    const result = statusRes.data?.result || statusRes.data;
    const urls = result?.model_urls;

    if (!urls || typeof urls !== 'object') {
      console.error("❌ model_urls missing or invalid in API response.");
      return res.status(500).send("No model_urls found in API response.");
    }

    const modelUrl = urls[format];
    if (!modelUrl) {
      console.warn(`⚠️ Format '${format}' not available. Available formats: ${Object.keys(urls).join(', ')}`);
      return res.status(404).send(`Format '${format}' not available for this model.`);
    }

    const fileResponse = await axios.get(modelUrl, { responseType: 'arraybuffer' });

    const contentTypes = {
      glb: 'model/gltf-binary',
      gltf: 'model/gltf+json',
      usdz: 'model/vnd.usdz+zip', 
      obj: 'application/octet-stream',
      fbx: 'application/octet-stream'
    };

    const contentType = contentTypes[format] || 'application/octet-stream';
    
    res.set({
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="dalma-model.${format}"`,
      'Content-Length': fileResponse.data.length,
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    });
    
    res.send(fileResponse.data);
    
  } catch (error) {
    console.error('❌ Error fetching model:', error.response?.data || error.message);
    res.status(500).send('Error fetching model');
  }
});

/**
 * Save Asset Endpoint
 * Saves generated model as a user asset with permanent storage
 */
app.post('/api/saveAsset/:taskId', authMiddleware, async (req, res) => {
  const { taskId } = req.params;
  const { name, breed, description, isPublic, isUserGenerated, category, topology, texture, symmetry, pbr, polygons } = req.body;
  
  try {
    console.log('💾 Saving USER asset for taskId:', taskId, 'user:', req.user.username);
    console.log('📺 Topology received in save request:', topology);
    
    /**
     * Fetch model status and URLs from Meshy API
     */
    const headers = { Authorization: `Bearer ${YOUR_API_KEY}` };
    const statusRes = await axios.get(
      `https://api.meshy.ai/openapi/v1/image-to-3d/${taskId}`,
      { headers }
    );

    if (statusRes.data?.status !== 'SUCCEEDED') {
      return res.status(400).json({ error: 'Model not ready for saving' });
    }

    const modelUrls = statusRes.data?.result?.model_urls || statusRes.data?.model_urls;
    const glbUrl = modelUrls?.glb;
    
    if (!glbUrl) {
      return res.status(400).json({ error: 'GLB model URL not available' });
    }

    console.log('📥 Model URLs available:', Object.keys(modelUrls));

    const cloudinaryConfig = require('./config/cloudinary');
    const Asset = require('./models/Asset');

    /**
     * Retrieve original image and generation parameters
     */
    const pendingAsset = req.app.locals.pendingAssets?.[taskId];
    let cloudinaryOriginalImage = null;
    
    const generationParams = {
      topology: topology || pendingAsset?.parameters?.topology || 'triangle',
      texture: texture !== undefined ? texture : (pendingAsset?.parameters?.shouldTexture || false),
      symmetry: symmetry || pendingAsset?.parameters?.symmetryMode || 'auto',
      pbr: pbr !== undefined ? pbr : (pendingAsset?.parameters?.enablePBR || false),
      polycount: polygons || pendingAsset?.parameters?.targetPolycount || 30000
    };
    
    console.log('📺 Generation parameters being saved:', generationParams);
    
    /**
     * Upload original image to Cloudinary if available
     */
    if (pendingAsset && pendingAsset.originalImage) {
      try {
        console.log('🖼️ Uploading original image to Cloudinary...');
        
        cloudinaryOriginalImage = await cloudinaryConfig.uploadOriginalImageFromBase64(
          pendingAsset.originalImage,
          `original-${name.replace(/\s+/g, '-')}-${Date.now()}`
        );
        
        console.log('✅ Original image uploaded to Cloudinary:', cloudinaryOriginalImage.url);
      } catch (originalImageError) {
        console.error('❌ Original image upload failed:', originalImageError);
        console.log('⚠️ Continuing without original image...');
      }
    }

    /**
     * Download and store all available model formats
     */
    console.log('🚀 Starting permanent storage of all model formats...');
    const modelFiles = {};
    const availableFormats = [];
    const proxyFormats = [];
    let totalSize = 0;

    for (const [format, url] of Object.entries(modelUrls)) {
      try {
        console.log(`📥 Downloading ${format.toUpperCase()} from Meshy...`);
        
        const response = await axios.get(url, {
          responseType: 'arraybuffer',
          timeout: 60000
        });
        
        const buffer = Buffer.from(response.data);
        const fileSize = buffer.length;
        totalSize += fileSize;
        
        console.log(`📦 Downloaded ${format.toUpperCase()}: ${(fileSize / 1024 / 1024).toFixed(2)} MB`);
        
        /**
         * Use proxy URL for files exceeding Cloudinary size limit
         */
        if (fileSize > 10 * 1024 * 1024) {
          console.log(`⚠️ ${format.toUpperCase()} is ${(fileSize / 1024 / 1024).toFixed(2)} MB - too large for Cloudinary`);
          
          modelFiles[format] = {
            filename: `${taskId}.${format}`,
            url: `/api/proxyModel/${taskId}?format=${format}`,
            publicId: `meshy-proxy-${taskId}-${format}`,
            size: fileSize,
            isProxy: true,
            originalMeshyUrl: url
          };
          
          availableFormats.push(format);
          proxyFormats.push(format);
          console.log(`✅ ${format.toUpperCase()} will use proxy URL:`, modelFiles[format].url);
          continue;
        }
        
        /**
         * Upload to Cloudinary for permanent storage
         */
        console.log(`☁️ Uploading ${format.toUpperCase()} to Cloudinary...`);
        
        const cloudinaryResult = await cloudinaryConfig.uploadModelFromBuffer(
          buffer,
          `${name.replace(/\s+/g, '-')}-${format}-${Date.now()}.${format}`
        );
        
        console.log(`✅ ${format.toUpperCase()} uploaded to Cloudinary:`, cloudinaryResult.url);
        
        modelFiles[format] = {
          filename: cloudinaryResult.filename,
          url: cloudinaryResult.url,
          publicId: cloudinaryResult.publicId,
          size: cloudinaryResult.size || fileSize
        };
        
        availableFormats.push(format);
        
      } catch (formatError) {
        console.error(`❌ Error processing ${format}:`, formatError.message);
        
        /**
         * Fallback to proxy URL on any error
         */
        modelFiles[format] = {
          filename: `${taskId}.${format}`,
          url: `/api/proxyModel/${taskId}?format=${format}`,
          publicId: `meshy-proxy-${taskId}-${format}`,
          size: 0,
          isProxy: true,
          originalMeshyUrl: modelUrls[format]
        };
        
        availableFormats.push(format);
        proxyFormats.push(format);
        console.log(`✅ ${format.toUpperCase()} fallback to proxy URL:`, modelFiles[format].url);
      }
    }

    console.log('✅ All formats processed:', {
      successful: availableFormats,
      proxyFormats: proxyFormats,
      totalFormats: Object.keys(modelUrls).length,
      totalSize: `${(totalSize / 1024 / 1024).toFixed(2)} MB`
    });

    if (!modelFiles.glb || !modelFiles.glb.url) {
      throw new Error('Failed to save GLB format, which is required');
    }

    /**
     * Create asset document with all metadata
     */
    const assetData = {
      name: name || `Generated Dog Model`,
      breed: breed || 'Mixed Breed',
      icon: '🐕',
      fileSize: `${(totalSize / 1024 / 1024).toFixed(1)} MB`,
      polygons: generationParams.polycount,
      tags: ['generated', 'meshy', 'ai'],
      description: description || 'AI-generated 3D dog model from uploaded image',
      
      topology: generationParams.topology,
      texture: generationParams.texture,
      symmetry: generationParams.symmetry,
      pbr: generationParams.pbr,
      
      modelFiles: modelFiles,
      availableFormats: availableFormats,
      
      modelFile: modelFiles.glb,
      
      originalImage: cloudinaryOriginalImage ? {
        filename: cloudinaryOriginalImage.filename,
        url: cloudinaryOriginalImage.url,
        publicId: cloudinaryOriginalImage.publicId,
        size: cloudinaryOriginalImage.size
      } : null,
      
      meshyTaskId: taskId,
      generatedFromImage: true,
      
      userId: req.user.userId,
      isPublic: isPublic !== undefined ? isPublic : false,
      isUserGenerated: isUserGenerated !== undefined ? isUserGenerated : true,
      category: category || 'user_generated',
      createdBy: 'user',
      
      generationMetadata: {
        topology: generationParams.topology,
        hasTexture: generationParams.texture,
        symmetry: generationParams.symmetry,
        pbrEnabled: generationParams.pbr,
        targetPolycount: generationParams.polycount,
        generatedAt: new Date().toISOString(),
        isMeshyGenerated: true,
        autoSaved: req.body.autoSaved || false,
        originalGenerationParams: generationParams,
        proxyFormats: proxyFormats
      }
    };

    console.log('🔧 Creating user asset with permanently stored files:', {
      name: assetData.name,
      userId: assetData.userId,
      availableFormats: assetData.availableFormats,
      proxyFormats: proxyFormats,
      totalSize: assetData.fileSize,
      hasOriginalImage: !!assetData.originalImage,
      topology: assetData.topology
    });

    const asset = await Asset.create(assetData);
    
    /**
     * Cleanup temporary pending asset data
     */
    if (req.app.locals.pendingAssets && req.app.locals.pendingAssets[taskId]) {
      delete req.app.locals.pendingAssets[taskId];
      console.log('🧹 Cleaned up pending asset data for taskId:', taskId);
    }
    
    console.log('✅ User asset created successfully with permanent storage:', asset._id);
    console.log('📊 Asset details:', {
      id: asset._id,
      name: asset.name,
      formats: asset.availableFormats,
      proxyFormats: proxyFormats,
      fileSize: asset.fileSize,
      topology: asset.topology
    });
    
    res.json({
      message: `Asset saved permanently with ${availableFormats.length} formats!`,
      asset: asset,
      isPrivate: !asset.isPublic,
      owner: req.user.username,
      availableFormats: asset.availableFormats,
      proxyFormats: proxyFormats,
      hasOriginalImage: !!cloudinaryOriginalImage,
      permanentStorage: true
    });
    
  } catch (error) {
    console.error('❌ Error saving user asset:', error);
    console.error('🔍 Stack trace:', error.stack);
    res.status(500).json({ error: 'Failed to save asset to your collection: ' + error.message });
  }
});

/**
 * Static Files Fallback
 */
app.use(express.static(path.join(__dirname, '../frontend')));

/**
 * Graceful Shutdown Handler
 */
process.on('SIGINT', async () => {
  console.log('🛑 Shutting down gracefully...');
  await mongoose.connection.close();
  process.exit(0);
});

/**
 * Server Initialization
 * Configures server for production or development environment
 */
const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';
const PORT = process.env.PORT || 3000;

if (isProduction) {
  /**
   * Production Server
   * Render handles HTTPS via their proxy
   */
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Production server running on port ${PORT}`);
    console.log(`🌐 Server URL: https://threely-ai.onrender.com`);
  });
} else {
  /**
   * Development Server
   * HTTP only for local development
   */
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Development server: http://localhost:${PORT}`);
    console.log(`📱 Android: http://10.0.2.2:${PORT}`);
    console.log(`🥗 Health Check: http://localhost:${PORT}/api/health`);
    console.log(`📦 Assets API: http://localhost:${PORT}/api/assets`);
    console.log(`🔐 Auth API: http://localhost:${PORT}/api/auth`);
  });
}