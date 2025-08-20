require('dotenv').config();

// Debug information for Render - ADD THIS AT THE VERY TOP
console.log('🚀 Server starting...');
console.log('📁 __dirname:', __dirname);
console.log('📁 process.cwd():', process.cwd());
console.log('📁 NODE_ENV:', process.env.NODE_ENV);
console.log('📁 Running on Render?', process.env.RENDER === 'true');
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
const { authMiddleware } = require('./middleware/auth');


// Check if directories exist - DEBUGGING
const frontendPath = path.join(__dirname, '../frontend');
console.log('📁 Frontend path:', frontendPath);
console.log('📁 Frontend exists?', fs.existsSync(frontendPath));

if (fs.existsSync(frontendPath)) {
    console.log('📁 Frontend contents:', fs.readdirSync(frontendPath));
    
    // Check subdirectories
    ['css', 'src', 'js', 'public', 'html', 'models'].forEach(dir => {
        const dirPath = path.join(frontendPath, dir);
        if (fs.existsSync(dirPath)) {
            console.log(`✅ ${dir} exists:`, fs.readdirSync(dirPath).slice(0, 5).join(', '), '...');
        } else {
            console.log(`❌ ${dir} does NOT exist`);
        }
    });
}

console.log("🛠️ Loaded API Key:", process.env.MESHY_API_KEY);

const app = express();
const port = process.env.PORT || 3000;

const corsOptions = {
  origin: [
    // HTTP origins for backward compatibility
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
    
    // Add Live Server origins
    'http://127.0.0.1:59063',
    'http://localhost:59063',
    // Add common Live Server ports
    'http://127.0.0.1:5500',
    'http://127.0.0.1:5501',
    'http://127.0.0.1:5502',
    'http://localhost:5500',
    'http://localhost:5501',
    'http://localhost:5502',
    // Add your current ports
    'http://127.0.0.1:63338',
    'http://localhost:63338',
    'http://127.0.0.1:64533',
    'http://localhost:64533',
    
    // PRODUCTION URLS
    'https://image-to-3d.onrender.com',
    'https://image-to-3d.onrender.com/',
    
    // ADD THESE FOR ANDROID EMULATOR - Both HTTP and HTTPS
    'http://10.0.2.2:5173',
    'http://10.0.2.2:3000',
    'http://10.0.2.2:3001',
    'https://10.0.2.2:3000',  // HTTPS for Android emulator
    'https://10.0.2.2',
    'http://10.0.2.2',
    'https://localhost',       // Capacitor HTTPS
    'capacitor://localhost',  // Capacitor protocol
    'http://localhost',        // Capacitor HTTP (without port)
    
    // Allow any localhost/127.0.0.1 with any port for development (both HTTP and HTTPS)
    /^https?:\/\/(localhost|127\.0\.0\.1|10\.0\.2\.2):\d+$/
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  credentials: true, // This is crucial for cookie-based auth
  optionsSuccessStatus: 200 // For legacy browser support
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Cookie parser middleware - Add this BEFORE other middleware
app.use(cookieParser());

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// STATIC FILE SERVING - UPDATED FOR YOUR STRUCTURE
// Serve static files from frontend directory with the /frontend prefix
app.use('/frontend', express.static(path.join(__dirname, '../frontend'), {
    fallthrough: true,
    index: false,
    maxAge: '1d',
    etag: true
}));

// Also serve specific subdirectories explicitly to ensure they work
app.use('/frontend/css', express.static(path.join(__dirname, '../frontend/css')));
app.use('/frontend/src', express.static(path.join(__dirname, '../frontend/src')));
app.use('/frontend/js', express.static(path.join(__dirname, '../frontend/js'))); // In case you have both src and js
app.use('/frontend/public', express.static(path.join(__dirname, '../frontend/public')));
app.use('/frontend/html', express.static(path.join(__dirname, '../frontend/html')));
app.use('/frontend/models', express.static(path.join(__dirname, '../frontend/models')));

// Debug middleware for static file requests
app.use((req, res, next) => {
    if (req.path.startsWith('/frontend')) {
        console.log('📁 Static file requested:', req.path);
        console.log('📁 Full URL:', req.url);
        console.log('📁 Method:', req.method);
    }
    next();
});

// Serve your homepage at the root URL
app.get('/', (req, res) => {
    console.log('🏠 Serving homepage at root');
    res.sendFile(path.join(__dirname, '../frontend/html/homepage.html'));
});

// ALSO serve homepage at /homepage.html to handle direct navigation
app.get('/homepage.html', (req, res) => {
    console.log('🏠 Serving homepage at /homepage.html');
    res.sendFile(path.join(__dirname, '../frontend/html/homepage.html'));
});

// Serve other HTML files
app.get('/:page.html', (req, res, next) => {
    const page = req.params.page;
    const filePath = path.join(__dirname, '../frontend/html/', `${page}.html`);
    
    console.log(`📄 Trying to serve HTML page: ${page}.html`);
    console.log(`📄 Looking for file at: ${filePath}`);
    
    // Skip if it's an API route
    if (page.startsWith('api')) {
        return next();
    }
    
    // Check if file exists before sending
    if (fs.existsSync(filePath)) {
        console.log(`✅ Found and serving: ${page}.html`);
        res.sendFile(filePath);
    } else {
        console.log(`❌ HTML file not found: ${page}.html`);
        next(); // Pass to next handler
    }
});

// MongoDB connection
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

// Connect to database
connectDB();

// Existing multer setup for Meshy
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const YOUR_API_KEY = process.env.MESHY_API_KEY || '';

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Server is healthy',
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
  });
});

// **IMPORTANT: Import and mount AUTH routes**
console.log('🔧 Loading authentication routes...');
try {
  const authRoutes = require('./routes/auth');
  console.log('✅ Auth routes file loaded successfully');
  app.use('/api/auth', authRoutes);
  console.log('✅ Auth routes mounted at /api/auth');
} catch (error) {
  console.error('❌ Error loading auth routes:', error.message);
  console.error('Stack:', error.stack);
}

// Enhanced CORS handling specifically for download routes
app.use('/api/assets/*/download', (req, res, next) => {
  console.log(`📥 CORS middleware for download route: ${req.method} ${req.url}`);
  console.log(`📥 Origin: ${req.headers.origin}`);
  console.log(`📥 Request headers:`, Object.keys(req.headers));
  
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
    'http://127.0.0.1:64533',  // Your current port
    'http://localhost:64533',
    // ADD PRODUCTION URLS HERE TOO
    'https://image-to-3d.onrender.com',
    'https://image-to-3d.onrender.com/'
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
  
  // FIXED: Add Cache-Control and other headers that might be sent by fetch
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

// Updated OPTIONS handler for all asset routes
app.options('/api/assets/*', (req, res) => {
  console.log(`🔍 OPTIONS request for ${req.url} from origin: ${req.headers.origin}`);
  
  const origin = req.headers.origin;
  const allowedOrigins = [
    'http://localhost:5173', 'http://localhost:3001', 'http://127.0.0.1:5500',
    'http://localhost:3000', 'http://127.0.0.1:3000', 'http://127.0.0.1:59063',
    'http://localhost:59063', 'http://127.0.0.1:5500', 'http://127.0.0.1:5501',
    'http://127.0.0.1:5502', 'http://localhost:5500', 'http://localhost:5501',
    'http://localhost:5502', 'http://127.0.0.1:63338', 'http://localhost:63338',
    'http://127.0.0.1:64533', 'http://localhost:64533',  // Your current port
    // ADD PRODUCTION URLS HERE TOO
    'https://image-to-3d.onrender.com',
    'https://image-to-3d.onrender.com/'
  ];
  
  const isAllowed = allowedOrigins.includes(origin) || 
                   /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);
  
  if (isAllowed) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, HEAD');
  
  // FIXED: Add Cache-Control and other headers
  res.header('Access-Control-Allow-Headers', 
    'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cookie, Cache-Control, Pragma, X-Cache-Control, If-Modified-Since, If-None-Match');
  
  res.status(200).end();
});

// Import and use asset routes
console.log('🔧 Testing asset routes loading...');
try {
  const assetRoutes = require('./routes/assets');
  console.log('✅ Asset routes file loaded successfully');
  app.use('/api/assets', assetRoutes);
  console.log('✅ Asset routes mounted at /api/assets');
} catch (error) {
  console.error('❌ Error loading asset routes:', error.message);
  console.error('Stack:', error.stack);
}

// Your existing Meshy functions (keeping them exactly the same)
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
    console.log("🔺 Topology being sent to Meshy:", topology);
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

// Enhanced generateModel endpoint that also saves to database
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
    console.log("🔺 CRITICAL: Topology value being sent to Meshy:", selectedTopology);

    const previewTaskId = await createPreviewTask(
      imageBase64,
      selectedTopology,
      shouldTexture,
      selectedSymmetryMode,
      enablePBR,
      targetPolycount
    );

    console.log(`✅ Preview task started with taskId: ${previewTaskId}`);
    
    // Store metadata for potential asset creation INCLUDING TOPOLOGY
    req.app.locals.pendingAssets = req.app.locals.pendingAssets || {};
    req.app.locals.pendingAssets[previewTaskId] = {
      originalImage: imageBase64,
      parameters: {
        topology: selectedTopology,  // CRITICAL: Store topology
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

// All your other existing endpoints...
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

    // Fetch the model file
    const fileResponse = await axios.get(modelUrl, { responseType: 'arraybuffer' });

    // Force download with proper headers
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

// UPDATED: Save asset with permanent storage for all formats AND TOPOLOGY using PROXY URLs
app.post('/api/saveAsset/:taskId', authMiddleware, async (req, res) => {
  const { taskId } = req.params;
  const { name, breed, description, isPublic, isUserGenerated, category, topology, texture, symmetry, pbr, polygons } = req.body;
  
  try {
    console.log('💾 Saving USER asset for taskId:', taskId, 'user:', req.user.username);
    console.log('🔺 CRITICAL: Topology received in save request:', topology);
    
    // Get model status and URLs from Meshy
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

    // Import required modules
    const cloudinaryConfig = require('./config/cloudinary');
    const Asset = require('./models/Asset');

    // Get the original image from pending assets metadata
    const pendingAsset = req.app.locals.pendingAssets?.[taskId];
    let cloudinaryOriginalImage = null;
    
    // Get generation parameters from pending asset OR from request body
    const generationParams = {
      topology: topology || pendingAsset?.parameters?.topology || 'triangle',
      texture: texture !== undefined ? texture : (pendingAsset?.parameters?.shouldTexture || false),
      symmetry: symmetry || pendingAsset?.parameters?.symmetryMode || 'auto',
      pbr: pbr !== undefined ? pbr : (pendingAsset?.parameters?.enablePBR || false),
      polycount: polygons || pendingAsset?.parameters?.targetPolycount || 30000
    };
    
    console.log('🔺 CRITICAL: Generation parameters being saved:', generationParams);
    console.log('🔺 CRITICAL: Topology from pending asset:', pendingAsset?.parameters?.topology);
    console.log('🔺 CRITICAL: Final topology to save:', generationParams.topology);
    
    // Upload original image to Cloudinary if available
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

    // CRITICAL: Download and save all model formats permanently with proxy URL fallback
    console.log('🚀 Starting permanent storage of all model formats...');
    const modelFiles = {};
    const availableFormats = [];
    const proxyFormats = []; // Track which formats use proxy
    let totalSize = 0;

    // Process each available format
    for (const [format, url] of Object.entries(modelUrls)) {
      try {
        console.log(`📥 Downloading ${format.toUpperCase()} from Meshy...`);
        
        // Download the file from Meshy
        const response = await axios.get(url, {
          responseType: 'arraybuffer',
          timeout: 60000 // 60 second timeout
        });
        
        const buffer = Buffer.from(response.data);
        const fileSize = buffer.length;
        totalSize += fileSize;
        
        console.log(`📦 Downloaded ${format.toUpperCase()}: ${(fileSize / 1024 / 1024).toFixed(2)} MB`);
        
        // Check if file is too large BEFORE attempting Cloudinary upload
        if (fileSize > 10 * 1024 * 1024) { // 10MB limit
          console.log(`⚠️ ${format.toUpperCase()} is ${(fileSize / 1024 / 1024).toFixed(2)} MB - too large for Cloudinary`);
          
          // CRITICAL: Store PROXY URL instead of direct Meshy URL
          modelFiles[format] = {
            filename: `${taskId}.${format}`,
            url: `/api/proxyModel/${taskId}?format=${format}`, // PROXY URL
            publicId: `meshy-proxy-${taskId}-${format}`,
            size: fileSize,
            isProxy: true, // Flag to identify proxy URLs
            originalMeshyUrl: url // Keep original for reference
          };
          
          availableFormats.push(format);
          proxyFormats.push(format);
          console.log(`✅ ${format.toUpperCase()} will use proxy URL:`, modelFiles[format].url);
          continue;
        }
        
        // Upload to Cloudinary
        console.log(`☁️ Uploading ${format.toUpperCase()} to Cloudinary...`);
        
        const cloudinaryResult = await cloudinaryConfig.uploadModelFromBuffer(
          buffer,
          `${name.replace(/\s+/g, '-')}-${format}-${Date.now()}.${format}`
        );
        
        console.log(`✅ ${format.toUpperCase()} uploaded to Cloudinary:`, cloudinaryResult.url);
        
        // Store the Cloudinary result
        modelFiles[format] = {
          filename: cloudinaryResult.filename,
          url: cloudinaryResult.url,
          publicId: cloudinaryResult.publicId,
          size: cloudinaryResult.size || fileSize
        };
        
        availableFormats.push(format);
        
      } catch (formatError) {
        console.error(`❌ Error processing ${format}:`, formatError.message);
        
        // CRITICAL: Use PROXY URL as fallback for any failure
        modelFiles[format] = {
          filename: `${taskId}.${format}`,
          url: `/api/proxyModel/${taskId}?format=${format}`, // PROXY URL
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

    // Ensure we have at least GLB
    if (!modelFiles.glb || !modelFiles.glb.url) {
      throw new Error('Failed to save GLB format, which is required');
    }

    // Create asset with permanently stored files AND TOPOLOGY
    const assetData = {
      name: name || `Generated Dog Model`,
      breed: breed || 'Mixed Breed',
      icon: '🐕',
      fileSize: `${(totalSize / 1024 / 1024).toFixed(1)} MB`,
      polygons: generationParams.polycount,
      tags: ['generated', 'meshy', 'ai'],
      description: description || 'AI-generated 3D dog model from uploaded image',
      
      // CRITICAL: Save topology as first-class field
      topology: generationParams.topology,
      texture: generationParams.texture,
      symmetry: generationParams.symmetry,
      pbr: generationParams.pbr,
      
      // Store all model formats
      modelFiles: modelFiles,
      availableFormats: availableFormats,
      
      // Keep legacy modelFile for backward compatibility (GLB)
      modelFile: modelFiles.glb,
      
      // Include original image data
      originalImage: cloudinaryOriginalImage ? {
        filename: cloudinaryOriginalImage.filename,
        url: cloudinaryOriginalImage.url,
        publicId: cloudinaryOriginalImage.publicId,
        size: cloudinaryOriginalImage.size
      } : null,
      
      // Still store Meshy task ID for reference
      meshyTaskId: taskId,
      generatedFromImage: true,
      
      // USER OWNERSHIP
      userId: req.user.userId,
      isPublic: isPublic !== undefined ? isPublic : false,
      isUserGenerated: isUserGenerated !== undefined ? isUserGenerated : true,
      category: category || 'user_generated',
      createdBy: 'user',
      
      // Enhanced generation metadata
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
        proxyFormats: proxyFormats // Track which formats use proxy
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
    console.log('🔺 FINAL TOPOLOGY VALUE BEING SAVED:', assetData.topology);

    const asset = await Asset.create(assetData);
    
    // Cleanup pending assets
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
    console.error('📍 Stack trace:', error.stack);
    res.status(500).json({ error: 'Failed to save asset to your collection: ' + error.message });
  }
});

// Static files
app.use(express.static(path.join(__dirname, '../frontend')));

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🛑 Shutting down gracefully...');
  await mongoose.connection.close();
  process.exit(0);
});

// Server startup logic
const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';

if (isProduction) {
  // Production: Use regular HTTP (Render handles HTTPS via their proxy)
  app.listen(port, '0.0.0.0', () => {
    console.log(`✅ Production server running on port ${port}`);
    console.log(`🌐 Server URL: https://image-to-3d.onrender.com`);
    console.log(`🥗 Health Check: https://image-to-3d.onrender.com/api/health`);
    console.log(`📦 Assets API: https://image-to-3d.onrender.com/api/assets`);
    console.log(`🔐 Auth API: https://image-to-3d.onrender.com/api/auth`);
  });
} else {
  // Development: Try to use HTTPS, fallback to HTTP if certificates don't exist
  const certsPath = path.join(__dirname, 'certs');
  const keyPath = path.join(certsPath, 'key.pem');
  const certPath = path.join(certsPath, 'cert.pem');
  
  if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
    // HTTPS Configuration
    const httpsOptions = {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath)
    };
    
    // Start HTTPS server on port 3000
    https.createServer(httpsOptions, app).listen(port, () => {
      console.log(`🔒 HTTPS Server running on https://localhost:${port}`);
      console.log(`🔒 Android Emulator: https://10.0.2.2:${port}`);
      console.log(`📱 Mobile access: https://192.168.1.41:${port}`);
      console.log(`🥗 Health Check: https://localhost:${port}/api/health`);
      console.log(`📦 Assets API: https://localhost:${port}/api/assets`);
      console.log(`🔐 Auth API: https://localhost:${port}/api/auth`);
    });
    
    // Also start HTTP server on port 3001 for backward compatibility
    http.createServer(app).listen(3001, () => {
      console.log(`🌐 HTTP Server also running on http://localhost:3001 (fallback)`);
    });
  } else {
    // No certificates found, run HTTP only
    console.log('⚠️  No SSL certificates found in /certs directory');
    console.log('📝 To enable HTTPS, run: node cert.js');
    
    app.listen(port, '0.0.0.0', () => {
      console.log(`🚀 Server listening at http://0.0.0.0:${port}`);
      console.log(`⚠️  WARNING: Running without HTTPS - Android app may not work properly`);
      console.log(`📱 Mobile access: http://192.168.1.41:${port}`);
      console.log(`🥗 Health Check: http://localhost:${port}/api/health`);
      console.log(`📦 Assets API: http://localhost:${port}/api/assets`);
      console.log(`🔐 Auth API: http://localhost:${port}/api/auth`);
    });
  }
}