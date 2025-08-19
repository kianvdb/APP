console.log('📁 Loading routes/assets.js...');

const express = require('express');
const multer = require('multer');
const router = express.Router();
const cloudinary = require('cloudinary').v2;
const axios = require('axios');
const { authMiddleware, optionalAuthMiddleware, adminMiddleware } = require('../middleware/auth');

// Import models and config with better error handling
let Asset, cloudinaryConfig;
let dbAvailable = false;
let cloudinaryAvailable = false;

try {
  Asset = require('../models/Asset');
  dbAvailable = true;
  console.log('✅ Asset model loaded successfully');
} catch (error) {
  console.error('❌ Could not load Asset model:', error.message);
  console.error('📍 Stack trace:', error.stack);
}

try {
  cloudinaryConfig = require('../config/cloudinary');
  cloudinaryAvailable = true;
  console.log('✅ Cloudinary config loaded successfully');
} catch (error) {
  console.error('❌ Could not load cloudinary config:', error.message);
  console.error('📍 Stack trace:', error.stack);
}

console.log('🛤️ Router created successfully');
console.log('📊 Configuration status:', {
  database: dbAvailable ? 'Available' : 'Not Available',
  cloudinary: cloudinaryAvailable ? 'Available' : 'Not Available'
});

// UPDATED: Configure multer for multiple model file formats
const uploadFields = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 200 * 1024 * 1024 }, // 200MB for multiple files
  fileFilter: (req, file, cb) => {
    try {
      console.log(`🔍 Processing file: ${file.originalname}, field: ${file.fieldname}, mimetype: ${file.mimetype}`);
      
      // Handle multiple model file formats
      if (['modelFileGLB', 'modelFileFBX', 'modelFileOBJ', 'modelFileUSDZ'].includes(file.fieldname)) {
        const isGLB = file.mimetype === 'application/octet-stream' && file.originalname.toLowerCase().endsWith('.glb');
        const isFBX = file.originalname.toLowerCase().endsWith('.fbx');
        const isOBJ = file.originalname.toLowerCase().endsWith('.obj');
        const isUSDZ = file.originalname.toLowerCase().endsWith('.usdz');
        
        if (isGLB || isFBX || isOBJ || isUSDZ) {
          console.log('✅ Model file accepted:', file.originalname);
          cb(null, true);
        } else {
          console.log('❌ Model file rejected:', file.originalname, file.mimetype);
          cb(new Error(`Invalid file type for ${file.fieldname}`));
        }
      } else if (file.fieldname === 'previewImage') {
        const allowedImageTypes = [
          'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'
        ];
        
        if (allowedImageTypes.includes(file.mimetype) || file.mimetype.startsWith('image/')) {
          console.log('✅ Preview image file accepted:', file.originalname);
          cb(null, true);
        } else {
          console.log('❌ Preview image file rejected:', file.originalname, file.mimetype);
          cb(new Error('Only image files are allowed for preview images'));
        }
      } else if (file.fieldname === 'originalImage') {
        const allowedImageTypes = [
          'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'
        ];
        
        if (allowedImageTypes.includes(file.mimetype) || file.mimetype.startsWith('image/')) {
          console.log('✅ Original image file accepted:', file.originalname);
          cb(null, true);
        } else {
          console.log('❌ Original image file rejected:', file.originalname, file.mimetype);
          cb(new Error('Only image files are allowed for original images'));
        }
      } else {
        console.log('❌ Unexpected field:', file.fieldname);
        cb(new Error('Unexpected field: ' + file.fieldname));
      }
    } catch (err) {
      console.error('❌ File filter error:', err);
      cb(err);
    }
  }
}).fields([
  { name: 'modelFileGLB', maxCount: 1 },
  { name: 'modelFileFBX', maxCount: 1 },
  { name: 'modelFileOBJ', maxCount: 1 },
  { name: 'modelFileUSDZ', maxCount: 1 },
  { name: 'previewImage', maxCount: 1 },
  { name: 'originalImage', maxCount: 1 }
]);

console.log('📦 Multer configured for multiple format uploads');

// ==========================================
// ADMIN ROUTES - User Models Management
// ==========================================

// UPDATED: GET /api/assets/admin/user-models - Get ONLY user-generated models (enhanced with publish status)
router.get('/admin/user-models', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    console.log('👑 Admin requesting user-generated models ONLY');
    console.log('👤 Admin user:', req.user.username, '(', req.user.userId, ')');
    
    if (!dbAvailable || !Asset) {
      return res.status(503).json({ error: 'Database not available' });
    }
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';
    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
    
    console.log('🔍 Query parameters:', { page, limit, search, sortBy, sortOrder });
    
    // SPECIFIC QUERY: Only user generations, no public assets or duplicates
    const query = {
      isActive: true,
      userId: { $exists: true }, // Must have a user ID
      // SPECIFIC: Only user-generated content
      $or: [
        { 
          isUserGenerated: true,
          meshyTaskId: { $exists: true } // Meshy-generated by users
        },
        { 
          generatedFromImage: true,
          userId: { $exists: true } // Image-to-3D generations by users
        }
      ]
    };
    
    if (search) {
      query.$and = [
        // Keep the existing OR conditions for user generation identification
        {
          $or: [
            { 
              isUserGenerated: true,
              meshyTaskId: { $exists: true }
            },
            { 
              generatedFromImage: true,
              userId: { $exists: true }
            }
          ]
        },
        // Add search conditions
        {
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { breed: { $regex: search, $options: 'i' } }
          ]
        }
      ];
      delete query.$or;
    }
    
    console.log('📋 Database query for user generations only:', JSON.stringify(query, null, 2));
    
    // Get user-generated models with user information
    const userModels = await Asset.find(query)
      .populate('userId', 'username email createdAt')
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit);
    
    const totalModels = await Asset.countDocuments(query);
    const totalPages = Math.ceil(totalModels / limit);
    
    console.log(`📊 Found ${userModels.length} user-generated models (page ${page}/${totalPages})`);
    
    // Check which models have been published
    const publishedCheck = await Promise.all(
      userModels.map(async (model) => {
        const published = await Asset.isUserAssetPublished(model._id);
        return {
          modelId: model._id,
          isPublished: !!published,
          publishedAssetId: published?._id
        };
      })
    );
    
    const publishedMap = {};
    publishedCheck.forEach(check => {
      publishedMap[check.modelId] = check;
    });
    
    // Format the response with detailed information
    const formattedModels = userModels.map(model => {
      // CRITICAL: Log topology for debugging
      console.log(`🔺 Model ${model.name} - Raw topology value:`, model.topology);
      console.log(`🔺 Model ${model.name} - GenerationMetadata topology:`, model.generationMetadata?.topology);
      
      return {
        _id: model._id,
        name: model.name,
        breed: model.breed,
        description: model.description,
        createdAt: model.createdAt,
        updatedAt: model.updatedAt,
        meshyTaskId: model.meshyTaskId,
        availableFormats: model.availableFormats || ['glb'],
        fileSize: model.fileSize,
        polygons: model.polygons,
        downloads: model.downloads || 0,
        views: model.views || 0,
        isPublic: model.isPublic || false,
        
        // CRITICAL: Include topology directly
        topology: model.topology,
        texture: model.texture,
        symmetry: model.symmetry,
        pbr: model.pbr,
        
        // NEW: Publish status
        publishedToHomepage: publishedMap[model._id]?.isPublished || false,
        publishedAssetId: publishedMap[model._id]?.publishedAssetId || null,
        
        // User information
        user: model.userId ? {
          id: model.userId._id,
          username: model.userId.username,
          email: model.userId.email,
          memberSince: model.userId.createdAt
        } : null,
        
        // Original image information (the image user uploaded)
        originalImage: model.originalImage ? {
          url: model.originalImage.url,
          filename: model.originalImage.filename,
          size: model.originalImage.size
        } : null,
        
        // Preview image
        previewImage: model.previewImage ? {
          url: model.previewImage.url,
          filename: model.previewImage.filename,
          size: model.previewImage.size
        } : null,
        
        // Model files information
        modelFiles: model.modelFiles || {},
        
        // Model file (legacy)
        modelFile: model.modelFile || null,
        
        // Generation metadata
        generationMetadata: {
          isMeshyGenerated: !!model.meshyTaskId,
          generatedFromImage: model.generatedFromImage || false,
          originalImageUrl: model.originalImageUrl || null,
          hasCloudinaryStorage: !!(model.modelFiles && Object.keys(model.modelFiles).length > 0),
          topology: model.topology || model.generationMetadata?.topology,
          hasTexture: model.texture !== undefined ? model.texture : model.generationMetadata?.hasTexture,
          symmetry: model.symmetry || model.generationMetadata?.symmetry,
          pbrEnabled: model.pbr !== undefined ? model.pbr : model.generationMetadata?.pbrEnabled,
          targetPolycount: model.polygons || model.generationMetadata?.targetPolycount
        }
      };
    });
    
    console.log('✅ Formatted user-generated models for admin response');
    
    res.json({
      success: true,
      models: formattedModels,
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalModels: totalModels,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        limit: limit
      },
      summary: {
        totalUserModels: totalModels,
        meshyGenerated: formattedModels.filter(m => m.generationMetadata.isMeshyGenerated).length,
        withCloudinaryStorage: formattedModels.filter(m => m.generationMetadata.hasCloudinaryStorage).length,
        totalFormats: formattedModels.reduce((acc, m) => acc + m.availableFormats.length, 0),
        publishedToHomepage: formattedModels.filter(m => m.publishedToHomepage).length
      }
    });
    
  } catch (error) {
    console.error('❌ Error fetching user models for admin:', error);
    console.error('📍 Stack:', error.stack);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch user models',
      details: error.message 
    });
  }
});

// GET /api/assets/admin/user-models/:id - Get single user model details (admin only)
router.get('/admin/user-models/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    console.log('👑 Admin requesting single user model:', req.params.id);
    
    if (!dbAvailable || !Asset) {
      return res.status(503).json({ error: 'Database not available' });
    }
    
    const model = await Asset.findById(req.params.id)
      .populate('userId', 'username email createdAt isAdmin');
    
    if (!model) {
      return res.status(404).json({ error: 'Model not found' });
    }
    
    // Check if it's a user-generated model
    if (!model.userId || (!model.isUserGenerated && !model.meshyTaskId)) {
      return res.status(400).json({ error: 'This is not a user-generated model' });
    }
    
    // Check if published
    const publishedAsset = await Asset.isUserAssetPublished(model._id);
    
    console.log('✅ Found user model:', model.name, 'by', model.userId?.username);
    console.log('🔺 Model topology:', model.topology);
    
    // Detailed model information
    const detailedModel = {
      _id: model._id,
      name: model.name,
      breed: model.breed,
      description: model.description,
      icon: model.icon,
      fileSize: model.fileSize,
      polygons: model.polygons,
      popularity: model.popularity,
      tags: model.tags,
      downloads: model.downloads,
      views: model.views,
      isPublic: model.isPublic,
      isActive: model.isActive,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
      
      // CRITICAL: Include generation parameters
      topology: model.topology,
      texture: model.texture,
      symmetry: model.symmetry,
      pbr: model.pbr,
      
      // Publish status
      publishedToHomepage: !!publishedAsset,
      publishedAssetId: publishedAsset?._id || null,
      
      // User information
      user: model.userId ? {
        id: model.userId._id,
        username: model.userId.username,
        email: model.userId.email,
        isAdmin: model.userId.isAdmin,
        memberSince: model.userId.createdAt
      } : null,
      
      // All image information
      originalImage: model.originalImage,
      previewImage: model.previewImage,
      
      // All model file information
      modelFiles: model.modelFiles,
      modelFile: model.modelFile,
      availableFormats: model.availableFormats,
      
      // Generation metadata
      meshyTaskId: model.meshyTaskId,
      generatedFromImage: model.generatedFromImage,
      originalImageUrl: model.originalImageUrl,
      generationMetadata: model.generationMetadata,
      
      // Storage analysis
      storageAnalysis: {
        isMeshyGenerated: !!model.meshyTaskId,
        hasCloudinaryStorage: !!(model.modelFiles && Object.keys(model.modelFiles).length > 0),
        savedFormats: model.modelFiles ? Object.keys(model.modelFiles) : [],
        totalStorageSize: model.modelFiles ? 
          Object.values(model.modelFiles).reduce((acc, file) => acc + (file.size || 0), 0) : 0
      }
    };
    
    res.json({
      success: true,
      model: detailedModel
    });
    
  } catch (error) {
    console.error('❌ Error fetching single user model for admin:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch model details',
      details: error.message 
    });
  }
});

// DELETE /api/assets/admin/user-models/:id - Delete user model (admin only)
router.delete('/admin/user-models/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    console.log('👑 Admin attempting to delete user model:', req.params.id);
    console.log('👤 Admin user:', req.user.username);
    
    if (!dbAvailable || !Asset) {
      return res.status(503).json({ error: 'Database not available' });
    }
    
    const model = await Asset.findById(req.params.id).populate('userId', 'username email');
    
    if (!model) {
      return res.status(404).json({ error: 'Model not found' });
    }
    
    if (!model.userId || (!model.isUserGenerated && !model.meshyTaskId)) {
      return res.status(400).json({ error: 'Cannot delete non-user-generated models through this endpoint' });
    }
    
    console.log('🗑️ Deleting user model:', model.name, 'by', model.userId?.username);
    
    // Delete files from Cloudinary
    if (cloudinaryAvailable && cloudinaryConfig) {
      try {
        console.log('☁️ Deleting files from Cloudinary...');
        
        // Delete model files for all formats
        if (model.modelFiles) {
          for (const format of ['glb', 'fbx', 'obj', 'usdz']) {
            const modelFile = model.modelFiles[format];
            if (modelFile && modelFile.publicId) {
              console.log(`🗑️ Deleting ${format.toUpperCase()} file:`, modelFile.publicId);
              try {
                await cloudinaryConfig.deleteFile(modelFile.publicId, 'raw');
                console.log(`✅ ${format.toUpperCase()} file deleted from Cloudinary`);
              } catch (deleteError) {
                console.error(`⚠️ Error deleting ${format.toUpperCase()} file:`, deleteError.message);
              }
            }
          }
        }
        
        // Delete legacy model file if exists
        if (model.modelFile?.publicId && !model.modelFile.publicId.startsWith('meshy-')) {
          console.log('🗑️ Deleting legacy model file:', model.modelFile.publicId);
          try {
            await cloudinaryConfig.deleteFile(model.modelFile.publicId, 'raw');
            console.log('✅ Legacy model file deleted from Cloudinary');
          } catch (deleteError) {
            console.error('⚠️ Error deleting legacy model file:', deleteError.message);
          }
        }
        
        // Delete original image (the image user uploaded)
        if (model.originalImage?.publicId) {
          console.log('🗑️ Deleting original image:', model.originalImage.publicId);
          try {
            await cloudinaryConfig.deleteFile(model.originalImage.publicId, 'image');
            console.log('✅ Original image deleted from Cloudinary');
          } catch (deleteError) {
            console.error('⚠️ Error deleting original image:', deleteError.message);
          }
        }
        
        // Delete preview image if exists
        if (model.previewImage?.publicId) {
          console.log('🗑️ Deleting preview image:', model.previewImage.publicId);
          try {
            await cloudinaryConfig.deleteFile(model.previewImage.publicId, 'image');
            console.log('✅ Preview image deleted from Cloudinary');
          } catch (deleteError) {
            console.error('⚠️ Error deleting preview image:', deleteError.message);
          }
        }
        
        console.log('✅ Cloudinary cleanup completed');
      } catch (cloudinaryError) {
        console.error('⚠️ General Cloudinary error:', cloudinaryError.message);
      }
    } else {
      console.log('⏭️ Cloudinary not available - skipping file cleanup');
    }
    
    // Delete from database
    console.log('🗑️ Deleting model from database...');
    await Asset.findByIdAndDelete(req.params.id);
    console.log('✅ Model deleted from database successfully');
    
    res.json({ 
      success: true,
      message: 'User model deleted successfully',
      deletedModel: {
        id: model._id,
        name: model.name,
        user: model.userId ? {
          username: model.userId.username,
          email: model.userId.email
        } : null
      }
    });
    
  } catch (error) {
    console.error('❌ CRITICAL ERROR deleting user model:', error.message);
    console.error('📍 Stack:', error.stack);
    res.status(500).json({ 
      success: false,
      error: 'Failed to delete user model', 
      details: error.message 
    });
  }
});

// POST /api/assets/admin/user-models/:id/toggle-public - Toggle public status (admin only)
router.post('/admin/user-models/:id/toggle-public', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    console.log('👑 Admin toggling public status for model:', req.params.id);
    
    if (!dbAvailable || !Asset) {
      return res.status(503).json({ error: 'Database not available' });
    }
    
    const model = await Asset.findById(req.params.id).populate('userId', 'username');
    
    if (!model) {
      return res.status(404).json({ error: 'Model not found' });
    }
    
    if (!model.userId || (!model.isUserGenerated && !model.meshyTaskId)) {
      return res.status(400).json({ error: 'Cannot modify non-user-generated models' });
    }
    
    const wasPublic = model.isPublic;
    model.isPublic = !model.isPublic;
    await model.save();
    
    console.log(`✅ Model "${model.name}" by ${model.userId?.username} is now ${model.isPublic ? 'PUBLIC' : 'PRIVATE'}`);
    
    res.json({
      success: true,
      message: `Model is now ${model.isPublic ? 'public' : 'private'}`,
      model: {
        id: model._id,
        name: model.name,
        isPublic: model.isPublic,
        wasPublic: wasPublic,
        user: model.userId?.username
      }
    });
    
  } catch (error) {
    console.error('❌ Error toggling public status:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to toggle public status',
      details: error.message 
    });
  }
});

// ==========================================
// PUBLIC AND USER ROUTES
// ==========================================

// GET /api/assets - PUBLIC ASSETS ONLY (for homepage)
router.get('/', optionalAuthMiddleware, async (req, res) => {
  try {
    console.log('📥 GET /api/assets called - fetching PUBLIC assets only');
    console.log('👤 User context:', req.user ? `${req.user.username} (${req.user.userId})` : 'Anonymous');
    
    if (!dbAvailable || !Asset) {
      console.log('⚠️ Database not available, returning empty result');
      return res.json({
        message: 'Database not available',
        assets: [],
        pagination: {
          currentPage: 1,
          totalPages: 0,
          totalAssets: 0,
          hasNextPage: false,
          hasPrevPage: false
        }
      });
    }

    console.log('🔍 Calling Asset.findPublicAssets...');
    const assets = await Asset.findPublicAssets({ limit: 20 });
    console.log(`📊 Found ${assets.length} PUBLIC assets (excluding user private models)`);
    
    // Log first few assets for debugging
    if (assets.length > 0) {
      console.log('📋 Sample assets:');
      assets.slice(0, 3).forEach((asset, index) => {
        console.log(`  ${index + 1}. ${asset.name} - Formats: ${asset.availableFormats || 'None'} - ModelFile: ${!!asset.modelFile} - Topology: ${asset.topology}`);
      });
    }

    res.json({
      message: 'Public assets loaded successfully',
      assets,
      pagination: {
        currentPage: 1,
        totalPages: 1,
        totalAssets: assets.length,
        hasNextPage: false,
        hasPrevPage: false
      }
    });

  } catch (error) {
    console.error('❌ Error in GET /api/assets:', error.message);
    console.error('📍 Stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to fetch assets', 
      details: error.message 
    });
  }
});

// FIXED: POST /api/assets - Create asset with publish workflow support and error handling
// FIXED: POST /api/assets - Create asset with publish workflow that COPIES files
router.post('/', authMiddleware, adminMiddleware, uploadFields, async (req, res) => {
  try {
    console.log('📥 POST /api/assets called');
    console.log('👤 Admin user:', req.user.username);
    
    if (!dbAvailable || !Asset) {
      return res.status(503).json({ error: 'Database not available' });
    }
    
    // Check if this is a publish workflow
    const isPublishWorkflow = req.body.sourceAssetId && req.body.wasUserGenerated === 'true';
    
    if (isPublishWorkflow) {
      console.log('🚀 PUBLISH WORKFLOW DETECTED');
      console.log('📋 Source asset ID:', req.body.sourceAssetId);
      console.log('📋 Existing model files:', req.body.existingModelFiles);
      console.log('📋 Existing original image:', req.body.existingOriginalImage);
      console.log('📋 Existing preview image:', req.body.existingPreviewImage);
    }
    
    const {
      name, breed, icon, fileSize, polygons, popularity,
      tags, description, sourceAssetId, wasUserGenerated,
      existingModelFiles, existingOriginalImage, existingPreviewImage,
      topology, texture, symmetry, pbr, meshyTaskId: bodyMeshyTaskId
    } = req.body;
    
    // Initialize meshyTaskId variable
    let meshyTaskId = bodyMeshyTaskId || null;
    if (meshyTaskId) {
      console.log('📋 Using meshyTaskId from request body:', meshyTaskId);
    }
    
    console.log('🔺 CRITICAL: Topology received in POST /api/assets:', topology);
    
    const tagsArray = tags ? tags.split(',').map(tag => tag.trim()) : [];
    
    const assetData = {
      name, breed, icon, fileSize,
      polygons: parseInt(polygons),
      popularity: parseInt(popularity) || 0,
      tags: tagsArray,
      description,
      isActive: true,
      isPublic: true,
      category: 'public',
      isUserGenerated: false,
      createdBy: 'admin',
      
      // CRITICAL: Include generation parameters
      topology: topology || 'triangle',
      texture: texture !== undefined ? texture === 'true' || texture === true : true,
      symmetry: symmetry || 'auto',
      pbr: pbr !== undefined ? pbr === 'true' || pbr === true : false
    };
    
    console.log('🔺 Asset data topology value:', assetData.topology);
    
    // Handle publish workflow metadata
    if (isPublishWorkflow) {
      assetData.wasUserGenerated = true;
      assetData.sourceUserAssetId = sourceAssetId;
      assetData.publishedToHomepageAt = new Date();
    }
    
    // Handle file uploads and existing files
    const modelFiles = {};
    const availableFormats = [];
    const uploadWarnings = []; // Track which files failed to upload
    
    // Parse existing model files if publishing
    let existingFiles = {};
    
    if (existingModelFiles) {
      try {
        existingFiles = JSON.parse(existingModelFiles);
        console.log('📋 Parsed existing model files:', Object.keys(existingFiles));
        
        // Extract meshyTaskId from existing files if available and not already set
        if (!meshyTaskId) {
          Object.values(existingFiles).forEach(file => {
            if (file && file.url && file.url.includes('meshy.ai')) {
              const match = file.url.match(/\/([a-f0-9-]+)\.(glb|fbx|obj|usdz)$/i);
              if (match) {
                meshyTaskId = match[1];
                console.log('📋 Extracted meshyTaskId from file URL:', meshyTaskId);
              }
            }
          });
        }
        
        // CRITICAL FIX: Handle different model file structures
        if (existingFiles.modelFile && (!existingFiles.glb || Object.keys(existingFiles).length === 1)) {
          console.log('📋 Found legacy modelFile structure, converting to GLB');
          existingFiles.glb = existingFiles.modelFile;
        }
        
        // Also check if the glb property exists but is just a URL string
        if (typeof existingFiles.glb === 'string') {
          console.log('📋 GLB is just a URL string, converting to object');
          existingFiles.glb = {
            url: existingFiles.glb,
            filename: 'model.glb',
            publicId: 'model',
            size: 0
          };
        }
      } catch (e) {
        console.error('❌ Error parsing existing model files:', e);
      }
    }
    
    // Process each format with error handling
    for (const format of ['glb', 'fbx', 'obj', 'usdz']) {
      const fieldName = `modelFile${format.toUpperCase()}`;
      
      // Check for new upload
      if (req.files[fieldName] && req.files[fieldName][0]) {
        const file = req.files[fieldName][0];
        console.log(`📁 Processing new ${format.toUpperCase()} upload:`, file.originalname);
        console.log(`📏 File size: ${(file.size / 1024 / 1024).toFixed(2)} MB`);
        
        try {
          const uploadResult = await cloudinaryConfig.uploadModelFromBuffer(
            file.buffer,
            `${name.replace(/\s+/g, '-')}-${format}-${Date.now()}.${format}`
          );
          
          modelFiles[format] = {
            filename: uploadResult.filename,
            url: uploadResult.url,
            publicId: uploadResult.publicId,
            size: uploadResult.size
          };
          
          availableFormats.push(format);
          console.log(`✅ ${format.toUpperCase()} uploaded successfully`);
          
        } catch (uploadError) {
          console.error(`❌ Failed to upload ${format.toUpperCase()} to Cloudinary:`, uploadError.message);
          
          // Check if it's a size error (Cloudinary returns specific error codes)
          const isSizeError = uploadError.message.includes('File size too large') || 
                            uploadError.message.includes('exceeds maximum allowed') ||
                            uploadError.http_code === 400;
          
          if (isSizeError) {
            uploadWarnings.push({
              format: format.toUpperCase(),
              reason: 'File too large for Cloudinary (>10MB)',
              size: `${(file.size / 1024 / 1024).toFixed(2)} MB`
            });
          } else {
            uploadWarnings.push({
              format: format.toUpperCase(),
              reason: uploadError.message,
              size: `${(file.size / 1024 / 1024).toFixed(2)} MB`
            });
          }
          
          // For manual uploads, we don't have a fallback URL, so skip this format
          console.log(`⚠️ Skipping ${format.toUpperCase()} due to upload failure`);
        }
      }
      // CRITICAL FIX: Copy existing files to new Cloudinary locations when publishing
      else if (isPublishWorkflow && existingFiles[format]) {
        console.log(`📋 COPYING existing ${format.toUpperCase()} from user model for publishing`);
        console.log(`🔍 Existing ${format} data:`, existingFiles[format]);
        
        const existingFile = existingFiles[format];
        
        // Ensure proper structure
        if (typeof existingFile === 'string') {
          existingFile.url = existingFile;
          existingFile.filename = `model.${format}`;
        }
        
        // Skip if no URL
        if (!existingFile.url) {
          console.log(`⚠️ No URL for ${format}, skipping`);
          continue;
        }
        
        try {
          // Check if it's a proxy URL (for large Meshy files)
          if (existingFile.url.startsWith('/api/proxyModel/')) {
            console.log(`📋 ${format.toUpperCase()} uses proxy URL, keeping as-is`);
            modelFiles[format] = existingFile;
            availableFormats.push(format);
            continue;
          }
          
          // For Cloudinary URLs, we need to copy the file
          if (existingFile.url.includes('cloudinary.com')) {
            console.log(`☁️ Copying ${format.toUpperCase()} from Cloudinary to new location...`);
            
            // Download the file from Cloudinary
            const response = await axios.get(existingFile.url, {
              responseType: 'arraybuffer',
              timeout: 60000, // 60 second timeout
              maxContentLength: 100 * 1024 * 1024, // 100MB max
              maxBodyLength: 100 * 1024 * 1024
            });
            
            const buffer = Buffer.from(response.data);
            console.log(`📦 Downloaded ${format.toUpperCase()}: ${(buffer.length / 1024 / 1024).toFixed(2)} MB`);
            
            // Check size before uploading
            if (buffer.length > 10 * 1024 * 1024) { // 10MB limit
              console.log(`⚠️ ${format.toUpperCase()} is too large for Cloudinary, using proxy`);
              
              // If we have meshyTaskId, use proxy URL
              if (meshyTaskId) {
                modelFiles[format] = {
                  filename: existingFile.filename || `${meshyTaskId}.${format}`,
                  url: `/api/proxyModel/${meshyTaskId}?format=${format}`, // PROXY URL
                  publicId: `meshy-proxy-${meshyTaskId}-${format}`,
                  size: buffer.length,
                  isProxy: true,
                  originalMeshyUrl: existingFile.url
                };
                
                console.log(`✅ ${format.toUpperCase()} will use proxy URL:`, modelFiles[format].url);
              } else {
                // No meshyTaskId, keep original (risky!)
                console.warn(`⚠️ WARNING: Large file but no meshyTaskId for proxy, using original URL`);
                modelFiles[format] = existingFile;
              }
              
              uploadWarnings.push({
                format: format.toUpperCase(),
                reason: 'File too large for Cloudinary copy (>10MB)',
                size: `${(buffer.length / 1024 / 1024).toFixed(2)} MB`
              });
            } else {
              // Upload to new Cloudinary location
              const uploadResult = await cloudinaryConfig.uploadModelFromBuffer(
                buffer,
                `${name.replace(/\s+/g, '-')}-${format}-published-${Date.now()}.${format}`,
                'dalma-ai/published-models' // Different folder for published models
              );
              
              modelFiles[format] = {
                filename: uploadResult.filename,
                url: uploadResult.url,
                publicId: uploadResult.publicId,
                size: uploadResult.size
              };
              
              console.log(`✅ ${format.toUpperCase()} copied to new Cloudinary location:`, uploadResult.url);
            }
            
            availableFormats.push(format);
            
          } else if (existingFile.url.includes('meshy.ai') || existingFile.url.includes('assets.meshy.ai')) {
            // For Meshy URLs, download and upload to Cloudinary
            console.log(`🤖 ${format.toUpperCase()} is from Meshy, downloading and saving to Cloudinary...`);
            
            try {
              const response = await axios.get(existingFile.url, {
                responseType: 'arraybuffer',
                timeout: 60000
              });
              
              const buffer = Buffer.from(response.data);
              const fileSize = buffer.length;
              
              console.log(`📦 Downloaded ${format.toUpperCase()} from Meshy: ${(fileSize / 1024 / 1024).toFixed(2)} MB`);
              
              // Check if file is too large
              if (fileSize > 10 * 1024 * 1024) { // 10MB limit
                console.log(`⚠️ ${format.toUpperCase()} is too large for Cloudinary, using proxy`);
                
                modelFiles[format] = {
                  filename: `${meshyTaskId || 'model'}.${format}`,
                  url: `/api/proxyModel/${meshyTaskId}?format=${format}`, // PROXY URL
                  publicId: `meshy-proxy-${meshyTaskId}-${format}`,
                  size: fileSize,
                  isProxy: true,
                  originalMeshyUrl: existingFile.url
                };
                
                uploadWarnings.push({
                  format: format.toUpperCase(),
                  reason: 'Meshy file too large for Cloudinary (>10MB)',
                  size: `${(fileSize / 1024 / 1024).toFixed(2)} MB`,
                  meshyUrl: existingFile.url
                });
              } else {
                // Upload to Cloudinary
                const uploadResult = await cloudinaryConfig.uploadModelFromBuffer(
                  buffer,
                  `${name.replace(/\s+/g, '-')}-${format}-published-${Date.now()}.${format}`,
                  'dalma-ai/published-models'
                );
                
                modelFiles[format] = {
                  filename: uploadResult.filename,
                  url: uploadResult.url,
                  publicId: uploadResult.publicId,
                  size: uploadResult.size
                };
                
                console.log(`✅ ${format.toUpperCase()} saved to Cloudinary from Meshy:`, uploadResult.url);
              }
              
              availableFormats.push(format);
              
            } catch (meshyError) {
              console.error(`❌ Failed to download/save ${format} from Meshy:`, meshyError.message);
              
              // Use proxy as fallback
              if (meshyTaskId) {
                modelFiles[format] = {
                  filename: `${meshyTaskId}.${format}`,
                  url: `/api/proxyModel/${meshyTaskId}?format=${format}`,
                  publicId: `meshy-proxy-${meshyTaskId}-${format}`,
                  size: 0,
                  isProxy: true,
                  originalMeshyUrl: existingFile.url
                };
                
                availableFormats.push(format);
                console.log(`✅ ${format.toUpperCase()} fallback to proxy URL`);
              }
            }
          } else {
            // For non-Cloudinary URLs (unknown source), keep as-is
            console.log(`📋 ${format.toUpperCase()} has non-Cloudinary URL, keeping as-is`);
            modelFiles[format] = existingFile;
            availableFormats.push(format);
          }
          
        } catch (copyError) {
          console.error(`❌ Failed to copy ${format.toUpperCase()}:`, copyError.message);
          
          // IMPORTANT: Don't fail the entire publish operation
          console.warn(`⚠️ WARNING: Failed to copy ${format}, using original URL - DO NOT DELETE SOURCE!`);
          modelFiles[format] = existingFile;
          availableFormats.push(format);
          
          uploadWarnings.push({
            format: format.toUpperCase(),
            reason: 'Failed to copy file, using original URL',
            warning: 'DO NOT DELETE THE ORIGINAL USER GENERATION!',
            error: copyError.message
          });
        }
      }
    }
    
    // Debug log the final modelFiles structure
    console.log('📋 Final modelFiles structure:', JSON.stringify(modelFiles, null, 2));
    console.log('⚠️ Upload warnings:', uploadWarnings);
    
    // CRITICAL FIX: Also check legacy modelFile for GLB if no modelFiles.glb
    if (!modelFiles.glb && isPublishWorkflow && existingFiles.modelFile) {
      console.log('📋 Using legacy modelFile as GLB');
      
      const existingFile = existingFiles.modelFile;
      
      try {
        if (existingFile.url && existingFile.url.includes('cloudinary.com')) {
          console.log('☁️ Copying legacy modelFile GLB to new location...');
          
          const response = await axios.get(existingFile.url, {
            responseType: 'arraybuffer',
            timeout: 60000
          });
          
          const buffer = Buffer.from(response.data);
          
          if (buffer.length > 10 * 1024 * 1024) {
            // Too large, use proxy if possible
            if (meshyTaskId) {
              modelFiles.glb = {
                filename: `${meshyTaskId}.glb`,
                url: `/api/proxyModel/${meshyTaskId}?format=glb`,
                publicId: `meshy-proxy-${meshyTaskId}-glb`,
                size: buffer.length,
                isProxy: true
              };
            } else {
              modelFiles.glb = existingFile;
            }
          } else {
            const uploadResult = await cloudinaryConfig.uploadModelFromBuffer(
              buffer,
              `${name.replace(/\s+/g, '-')}-glb-published-${Date.now()}.glb`,
              'dalma-ai/published-models'
            );
            
            modelFiles.glb = {
              filename: uploadResult.filename,
              url: uploadResult.url,
              publicId: uploadResult.publicId,
              size: uploadResult.size
            };
          }
          
          availableFormats.push('glb');
        }
      } catch (err) {
        console.error('⚠️ Failed to copy legacy modelFile:', err);
        modelFiles.glb = existingFile;
        availableFormats.push('glb');
      }
    }
    
    // Ensure we have at least GLB
    if (!modelFiles.glb || !modelFiles.glb.url) {
      console.log('❌ No GLB file found in uploads or existing files');
      return res.status(400).json({ error: 'GLB file is required' });
    }
    
    // CRITICAL: Set both modelFiles and modelFile
    assetData.modelFiles = modelFiles;
    assetData.availableFormats = availableFormats;
    
    // CRITICAL: Ensure modelFile is properly set for backward compatibility
    assetData.modelFile = {
      filename: modelFiles.glb.filename || 'model.glb',
      url: modelFiles.glb.url,
      publicId: modelFiles.glb.publicId || 'model-glb',
      size: modelFiles.glb.size || 0
    };
    
    console.log('✅ Set modelFile from modelFiles.glb:', assetData.modelFile);
    console.log('📋 modelFile URL:', assetData.modelFile.url);
    
    // Handle images with error handling
    // Parse existing images if publishing
    let existingOriginalImg = null;
    let existingPreviewImg = null;
    
    if (existingOriginalImage) {
      try {
        existingOriginalImg = JSON.parse(existingOriginalImage);
        console.log('📋 Using existing original image:', existingOriginalImg.url);
      } catch (e) {
        console.error('❌ Error parsing existing original image:', e);
      }
    }
    
    if (existingPreviewImage) {
      try {
        existingPreviewImg = JSON.parse(existingPreviewImage);
        console.log('📋 Using existing preview image:', existingPreviewImg.url);
      } catch (e) {
        console.error('❌ Error parsing existing preview image:', e);
      }
    }
    
    // Handle preview image
    if (req.files.previewImage && req.files.previewImage[0]) {
      const previewFile = req.files.previewImage[0];
      console.log('📷 Processing new preview image upload');
      
      try {
        const previewUpload = await cloudinaryConfig.uploadImageFromBuffer(
          previewFile.buffer,
          `preview-${name.replace(/\s+/g, '-')}-${Date.now()}`
        );
        
        assetData.previewImage = {
          filename: previewUpload.filename,
          url: previewUpload.url,
          publicId: previewUpload.publicId,
          size: previewUpload.size
        };
      } catch (imageError) {
        console.error('⚠️ Failed to upload preview image:', imageError.message);
      }
    } else if (isPublishWorkflow && existingPreviewImg && existingPreviewImg.url) {
      // Copy preview image for publish workflow
      try {
        console.log('🖼️ Copying preview image to new location...');
        
        if (existingPreviewImg.url.includes('cloudinary.com')) {
          const response = await axios.get(existingPreviewImg.url, {
            responseType: 'arraybuffer',
            timeout: 30000
          });
          
          const buffer = Buffer.from(response.data);
          
          const uploadResult = await cloudinaryConfig.uploadImageFromBuffer(
            buffer,
            `preview-${name.replace(/\s+/g, '-')}-published-${Date.now()}`,
            'dalma-ai/published-previews'
          );
          
          assetData.previewImage = {
            filename: uploadResult.filename,
            url: uploadResult.url,
            publicId: uploadResult.publicId,
            size: uploadResult.size
          };
          
          console.log('✅ Preview image copied to new location');
        } else {
          assetData.previewImage = existingPreviewImg;
        }
      } catch (imgError) {
        console.error('⚠️ Failed to copy preview image:', imgError.message);
        assetData.previewImage = existingPreviewImg; // Fallback to original
      }
    }
    
    // Handle original image
    if (req.files.originalImage && req.files.originalImage[0]) {
      const originalFile = req.files.originalImage[0];
      console.log('📷 Processing new original image upload');
      
      try {
        const originalUpload = await cloudinaryConfig.uploadImageFromBuffer(
          originalFile.buffer,
          `original-${name.replace(/\s+/g, '-')}-${Date.now()}`,
          'dalma-ai/originals'
        );
        
        assetData.originalImage = {
          filename: originalUpload.filename,
          url: originalUpload.url,
          publicId: originalUpload.publicId,
          size: originalUpload.size
        };
      } catch (imageError) {
        console.error('⚠️ Failed to upload original image:', imageError.message);
      }
    } else if (isPublishWorkflow && existingOriginalImg && existingOriginalImg.url) {
      // Copy original image for publish workflow
      try {
        console.log('🖼️ Copying original image to new location...');
        
        if (existingOriginalImg.url.includes('cloudinary.com')) {
          const response = await axios.get(existingOriginalImg.url, {
            responseType: 'arraybuffer',
            timeout: 30000
          });
          
          const buffer = Buffer.from(response.data);
          
          const uploadResult = await cloudinaryConfig.uploadImageFromBuffer(
            buffer,
            `original-${name.replace(/\s+/g, '-')}-published-${Date.now()}`,
            'dalma-ai/published-originals'
          );
          
          assetData.originalImage = {
            filename: uploadResult.filename,
            url: uploadResult.url,
            publicId: uploadResult.publicId,
            size: uploadResult.size
          };
          
          console.log('✅ Original image copied to new location');
        } else {
          assetData.originalImage = existingOriginalImg;
        }
      } catch (imgError) {
        console.error('⚠️ Failed to copy original image:', imgError.message);
        assetData.originalImage = existingOriginalImg; // Fallback to original
      }
    }
    
    // Store upload warnings in metadata if any occurred
    if (uploadWarnings.length > 0) {
      assetData.generationMetadata = {
        ...assetData.generationMetadata,
        uploadWarnings: uploadWarnings,
        hasCloudinaryIssues: true,
        publishedWithWarnings: isPublishWorkflow
      };
    }
    
    // Create the asset
    console.log('💾 Creating asset with data:', {
      name: assetData.name,
      availableFormats: assetData.availableFormats,
      wasUserGenerated: assetData.wasUserGenerated,
      sourceUserAssetId: assetData.sourceUserAssetId,
      hasModelFile: !!(assetData.modelFile && assetData.modelFile.url),
      hasModelFiles: !!(assetData.modelFiles && Object.keys(assetData.modelFiles).length > 0),
      topology: assetData.topology,
      uploadWarnings: uploadWarnings.length
    });
    
    console.log('🔺 FINAL TOPOLOGY VALUE BEING SAVED:', assetData.topology);
    
    // FINAL VALIDATION: Ensure we have valid model file data
    if (!assetData.modelFile || !assetData.modelFile.url) {
      console.error('❌ CRITICAL: modelFile is missing or has no URL!');
      console.error('📋 Full assetData:', JSON.stringify(assetData, null, 2));
      return res.status(400).json({ error: 'Model file URL is required' });
    }
    
    const asset = await Asset.create(assetData);
    
    console.log('✅ Asset created successfully:', asset._id);
    console.log('🔺 Created asset topology:', asset.topology);
    
    // Prepare response message
    let responseMessage = isPublishWorkflow ? 'Asset published to homepage successfully!' : 'Asset created successfully';
    
    if (uploadWarnings.length > 0) {
      const warningFormats = uploadWarnings.map(w => w.format).join(', ');
      const criticalWarnings = uploadWarnings.filter(w => w.warning && w.warning.includes('DO NOT DELETE'));
      
      if (criticalWarnings.length > 0) {
        responseMessage += ` (WARNING: Some files could not be copied. DO NOT DELETE the original user generation!)`;
      } else {
        responseMessage += ` (Warning: ${warningFormats} files had issues)`;
      }
    }
    
    res.status(201).json({
      message: responseMessage,
      asset: asset,
      uploadWarnings: uploadWarnings,
      publishSuccess: isPublishWorkflow
    });
    
  } catch (error) {
    console.error('❌ Error creating asset:', error);
    console.error('📍 Stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to create asset', 
      details: error.message 
    });
  }
});

// GET /api/assets/:id - Get single asset (with admin override)
router.get('/:id', optionalAuthMiddleware, async (req, res) => {
  try {
    console.log('📥 GET /api/assets/' + req.params.id + ' called');
    console.log('👤 User context:', req.user ? `${req.user.username} (${req.user.userId})` : 'Anonymous');
    
    if (!dbAvailable || !Asset) {
      console.log('❌ Database not available');
      return res.status(404).json({ error: 'Database not available' });
    }
    
    console.log('🔍 Searching for asset by ID:', req.params.id);
    const asset = await Asset.findById(req.params.id);
    
    if (!asset) {
      console.log('❌ Asset not found:', req.params.id);
      return res.status(404).json({ error: 'Asset not found' });
    }

    console.log('✅ Asset found:', asset.name);
    console.log('🔍 Asset details:', {
      name: asset.name,
      isActive: asset.isActive,
      isPublic: asset.isPublic,
      userId: asset.userId,
      isUserGenerated: asset.isUserGenerated,
      canBeViewedBy: typeof asset.canBeViewedBy,
      topology: asset.topology
    });
    console.log('🔺 Asset topology value:', asset.topology);

    // CRITICAL FIX: Check if user is admin FIRST
    const isAdmin = req.user && req.user.isAdmin;
    console.log('👑 Is user admin?', isAdmin);
    
    if (!isAdmin && !asset.canBeViewedBy(req.user?.userId)) {
      console.log('❌ User cannot view this private asset - Access denied');
      console.log('🔍 Permission details:', {
        isAdmin: isAdmin,
        assetIsPublic: asset.isPublic,
        assetUserId: asset.userId,
        requestUserId: req.user?.userId,
        assetIsUserGenerated: asset.isUserGenerated
      });
      return res.status(403).json({ error: 'Access denied' });
    }
    
    if (isAdmin) {
      console.log('✅ Admin override - allowing access to any asset');
    }

    // Increment views
    const oldViews = asset.views || 0;
    asset.views = oldViews + 1;
    await asset.save();
    console.log(`📊 Views incremented: ${oldViews} → ${asset.views}`);

    console.log('✅ Returning asset successfully');
    console.log('🎯 Available formats:', asset.availableFormats);
    
    res.json({
      message: 'Asset loaded successfully',
      asset
    });
    
  } catch (error) {
    console.error('❌ Error fetching asset:', error.message);
    console.error('📍 Stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to fetch asset', 
      details: error.message 
    });
  }
});

// GET /api/assets/:id/formats - Get available formats for an asset (with admin override)
router.get('/:id/formats', optionalAuthMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    console.log('📋 GET /api/assets/' + id + '/formats called');
    console.log('👤 User context:', req.user ? `${req.user.username} (${req.user.userId})` : 'Anonymous');
    
    if (!dbAvailable || !Asset) {
      console.log('❌ Database not available for formats request');
      return res.status(503).json({ error: 'Database not available' });
    }
    
    console.log('🔍 Searching for asset to get formats...');
    const asset = await Asset.findById(id);
    
    if (!asset) {
      console.log('❌ Asset not found for formats request:', id);
      return res.status(404).json({ error: 'Asset not found' });
    }
    
    console.log('✅ Asset found for formats:', asset.name);
    
    // Check if user is admin FIRST
    const isAdmin = req.user && req.user.isAdmin;
    console.log('👑 Is user admin?', isAdmin);
    
    if (!isAdmin && !asset.canBeViewedBy(req.user?.userId)) {
      console.log('❌ User cannot view formats for this private asset');
      return res.status(403).json({ error: 'Access denied' });
    }
    
    if (isAdmin) {
      console.log('✅ Admin override - allowing format check for any asset');
    }
    
    const availableFormats = asset.availableFormats || ['glb'];
    const isMeshyGenerated = !!asset.meshyTaskId;
    
    console.log('✅ Available formats for', asset.name + ':', availableFormats);
    console.log('🤖 Is Meshy generated:', isMeshyGenerated);
    
    res.json({
      assetId: id,
      assetName: asset.name,
      availableFormats: availableFormats,
      isMeshyGenerated: isMeshyGenerated
    });
    
  } catch (error) {
    console.error('❌ Error getting formats:', error);
    console.error('📍 Stack:', error.stack);
    res.status(500).json({ error: 'Failed to get available formats' });
  }
});
// FIXED: GET /api/assets/:id/download - Download asset file with admin permissions and proxy support
// FIXED: GET /api/assets/:id/download - Download asset file with admin permissions and working Cloudinary downloads
router.get('/:id/download', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const format = req.query.format || 'glb';
    
    console.log('🚨 DOWNLOAD REQUEST RECEIVED 🚨');
    console.log('📥 Download request for asset:', id, 'format:', format);
    console.log('👤 User context:', req.user ? `${req.user.username} (${req.user.userId})` : 'NO USER');
    console.log('🔍 Request details:', {
      method: req.method,
      url: req.url,
      params: req.params,
      query: req.query,
      headers: req.headers['user-agent']
    });
    
    if (!dbAvailable || !Asset) {
      console.log('❌ Database not available for download');
      return res.status(503).json({ error: 'Database not available' });
    }
    
    console.log('🔍 Searching for asset in database...');
    const asset = await Asset.findById(id);
    
    if (!asset || !asset.isActive) {
      console.log('❌ Asset not found or inactive:', id);
      console.log('🔍 Asset status:', {
        found: !!asset,
        isActive: asset?.isActive,
        name: asset?.name
      });
      return res.status(404).json({ error: 'Asset not found' });
    }
    
    console.log('✅ Asset found for download:', asset.name);
    console.log('🔍 Asset structure analysis:');
    console.log('  - Has modelFile:', !!asset.modelFile);
    console.log('  - ModelFile URL:', asset.modelFile?.url || 'None');
    console.log('  - Has modelFiles:', !!asset.modelFiles);
    console.log('  - ModelFiles keys:', asset.modelFiles ? Object.keys(asset.modelFiles) : 'None');
    console.log('  - Available formats:', asset.availableFormats || 'None');
    console.log('  - Is Meshy:', !!asset.meshyTaskId);
    console.log('  - Meshy Task ID:', asset.meshyTaskId || 'None');
    console.log('  - Is Active:', asset.isActive);
    console.log('  - Is Public:', asset.isPublic);
    console.log('  - User ID:', asset.userId || 'None');
    
    // CRITICAL FIX: Check if user is admin FIRST
    const isAdmin = req.user && req.user.isAdmin;
    console.log('👑 Is user admin?', isAdmin);
    
    if (!isAdmin && !asset.canBeViewedBy(req.user?.userId)) {
      console.log('❌ User cannot download this private asset');
      console.log('🔍 Permission check:', {
        isAdmin: isAdmin,
        assetUserId: asset.userId,
        requestUserId: req.user?.userId,
        isPublic: asset.isPublic,
        canView: asset.canBeViewedBy(req.user?.userId)
      });
      return res.status(403).json({ error: 'Access denied' });
    }
    
    if (isAdmin) {
      console.log('✅ Admin override - allowing download of any asset');
    }
    
    console.log('✅ Permission check passed');
    console.log('🎯 Requested format:', format);
    console.log('📋 Available formats:', asset.availableFormats);
    
    // Get the model file for the requested format
    let modelFile = null;
    let downloadMethod = null;
    
    console.log('🔍 Determining download method...');
    
    // Method 1: Check new modelFiles structure
    if (asset.modelFiles && asset.modelFiles[format]) {
      modelFile = asset.modelFiles[format];
      downloadMethod = `modelFiles.${format}`;
      console.log(`✅ Method 1: Found ${format} in modelFiles:`, {
        hasUrl: !!modelFile.url,
        url: modelFile.url,
        fullObject: modelFile
      });
      
      // CRITICAL FIX: Validate URL exists
      if (!modelFile.url) {
        console.log('❌ Model file found but URL is missing, trying fallback...');
        modelFile = null; // Reset to try other methods
      }
    }
    
    // Method 2: Check legacy modelFile for GLB (if Method 1 failed)
    if (!modelFile && format === 'glb' && asset.modelFile && asset.modelFile.url) {
      modelFile = asset.modelFile;
      downloadMethod = 'legacy modelFile';
      console.log('✅ Method 2: Found GLB in legacy modelFile:', modelFile.url);
      
      // CRITICAL FIX: If modelFiles.glb exists but has no URL, fix it
      if (asset.modelFiles && asset.modelFiles.glb && !asset.modelFiles.glb.url) {
        console.log('🔧 Fixing modelFiles.glb URL from legacy modelFile...');
        asset.modelFiles.glb.url = modelFile.url;
        asset.modelFiles.glb.publicId = modelFile.publicId || asset.modelFiles.glb.publicId;
        asset.modelFiles.glb.size = modelFile.size || asset.modelFiles.glb.size;
        
        // Save the fix
        try {
          await asset.save();
          console.log('✅ Fixed and saved modelFiles.glb URL');
        } catch (saveError) {
          console.error('⚠️ Could not save URL fix:', saveError);
        }
      }
    }
    
    // NEW: Check if the found URL is a proxy URL (already set up for CORS bypass)
    if (modelFile && modelFile.url && modelFile.url.startsWith('/api/proxyModel/')) {
      console.log('✅ Found proxy URL, no additional redirect needed');
      console.log('🔗 Proxy URL:', modelFile.url);
      // Proxy URLs are relative, so just redirect to them
      return res.redirect(modelFile.url);
    }
    
    // NEW: Check if the found URL is a Meshy URL that needs proxying
    if (modelFile && modelFile.url && 
        (modelFile.url.includes('meshy.ai') || modelFile.url.includes('assets.meshy.ai')) && 
        asset.meshyTaskId) {
      console.log('⚠️ Found Meshy URL in saved asset, needs proxy');
      console.log('🔄 Redirecting to proxy endpoint for CORS bypass');
      const proxyUrl = `/api/proxyModel/${asset.meshyTaskId}?format=${format}`;
      console.log('🔄 Proxy URL:', proxyUrl);
      return res.redirect(proxyUrl);
    }
    
    // Method 3: Check if we need proxy (only for completely unsaved Meshy assets)
    if (!modelFile && asset.meshyTaskId && ['glb', 'fbx', 'obj', 'usdz'].includes(format)) {
      // Double-check: if it's a saved asset, it should have modelFiles
      if (!asset.modelFiles || Object.keys(asset.modelFiles).length === 0) {
        // This is an unsaved Meshy asset, use proxy
        downloadMethod = 'meshy proxy (unsaved)';
        console.log('✅ Method 3: Unsaved Meshy asset detected, redirecting to proxy endpoint');
        const proxyUrl = `/api/proxyModel/${asset.meshyTaskId}?format=${format}`;
        console.log('🔄 Redirecting to:', proxyUrl);
        return res.redirect(proxyUrl);
      } else {
        console.log('❌ Method 3: Meshy asset has saved files, continuing to find them...');
      }
    }
    
    console.log('📋 Download method determined:', downloadMethod);
    
    if (!modelFile || !modelFile.url) {
      console.log('❌ Model file not found or URL missing for format:', format);
      console.log('🔍 Detailed asset structure:');
      console.log('  - Asset name:', asset.name);
      console.log('  - Asset ID:', asset._id);
      console.log('  - Has modelFile:', !!asset.modelFile);
      console.log('  - ModelFile structure:', JSON.stringify(asset.modelFile, null, 2));
      console.log('  - Has modelFiles:', !!asset.modelFiles);
      console.log('  - ModelFiles structure:', JSON.stringify(asset.modelFiles, null, 2));
      console.log('  - Available formats:', asset.availableFormats);
      console.log('  - Is Meshy:', !!asset.meshyTaskId);
      console.log('  - Requested format:', format);
      
      // Check if format is available
      const availableFormats = asset.availableFormats || ['glb'];
      if (!availableFormats.includes(format)) {
        console.log('❌ Format not available:', format, 'Available:', availableFormats);
        return res.status(404).json({ 
          error: `Format '${format}' is not available for this asset`,
          availableFormats: availableFormats,
          debug: {
            assetName: asset.name,
            requestedFormat: format,
            availableFormats: availableFormats,
            hasModelFile: !!asset.modelFile,
            hasModelFiles: !!asset.modelFiles,
            isMeshy: !!asset.meshyTaskId
          }
        });
      }
      
      return res.status(404).json({ 
        error: 'Model file URL not found',
        debug: {
          assetName: asset.name,
          requestedFormat: format,
          downloadMethod: downloadMethod,
          modelFileExists: !!modelFile,
          modelFileUrl: modelFile?.url,
          modelFileStructure: modelFile
        }
      });
    }
    
    console.log('✅ Model file found with valid URL:', modelFile.url);
    
    // Increment download count
    const oldDownloads = asset.downloads || 0;
    asset.downloads = oldDownloads + 1;
    await asset.save();
    console.log('📊 Download count incremented:', oldDownloads, '→', asset.downloads);
    
    console.log('🔗 Processing model URL for', format.toUpperCase() + ':', modelFile.url);
    
    // Set appropriate content type based on format
    const contentTypes = {
      glb: 'model/gltf-binary',
      fbx: 'application/octet-stream',
      obj: 'application/octet-stream',
      usdz: 'model/vnd.usdz+zip'
    };
    
    const contentType = contentTypes[format] || 'application/octet-stream';
    console.log('📄 Content type for', format + ':', contentType);
    
    // Handle different URL types
    if (modelFile.url.includes('cloudinary.com')) {
      console.log('☁️ Handling Cloudinary URL...');
      
      try {
        // First, try the direct URL without modifications to check if file exists
        const directUrl = modelFile.url;
        console.log('🔍 Checking if file exists at:', directUrl);
        
        try {
          const checkResponse = await axios.head(directUrl, {
            timeout: 5000,
            validateStatus: null
          });
          
          console.log('📋 File check response:', {
            status: checkResponse.status,
            headers: checkResponse.headers
          });
          
          if (checkResponse.status === 404) {
            console.error('❌ File does not exist on Cloudinary');
            return res.status(404).json({ 
              error: 'File not found',
              message: 'The 3D model file no longer exists on the storage server.',
              assetName: asset.name,
              format: format.toUpperCase()
            });
          }
        } catch (checkError) {
          console.warn('⚠️ Could not check file existence:', checkError.message);
        }
        
        // Try different download methods in order
        let downloadSuccess = false;
        
        // Method 1: Try with fl_attachment flag (standard Cloudinary method)
        if (!downloadSuccess) {
          try {
            let downloadUrl = modelFile.url;
            
            // Add attachment flag to Cloudinary URL
            if (downloadUrl.includes('/upload/')) {
              const parts = downloadUrl.split('/upload/');
              downloadUrl = parts[0] + '/upload/fl_attachment/' + parts[1];
            } else {
              downloadUrl = downloadUrl.includes('?') 
                ? downloadUrl + '&fl=attachment' 
                : downloadUrl + '?fl=attachment';
            }
            
            console.log('📥 Method 1: Trying download with fl_attachment:', downloadUrl);
            
            const response = await axios({
              method: 'GET',
              url: downloadUrl,
              responseType: 'stream',
              timeout: 30000,
              headers: {
                'User-Agent': 'DALMA-AI-Server/1.0'
              },
              validateStatus: (status) => status < 500
            });
            
            if (response.status === 200) {
              console.log('✅ Method 1 successful: Streaming with fl_attachment');
              
              res.setHeader('Content-Type', contentType);
              res.setHeader('Content-Disposition', `attachment; filename="${asset.name.replace(/[^a-zA-Z0-9-_]/g, '_')}.${format}"`);
              res.setHeader('Cache-Control', 'no-cache');
              
              if (response.headers['content-length']) {
                res.setHeader('Content-Length', response.headers['content-length']);
              }
              
              response.data.pipe(res);
              downloadSuccess = true;
              console.log('✅ Streaming file to client with fl_attachment');
            } else {
              console.log('❌ Method 1 failed with status:', response.status);
            }
          } catch (method1Error) {
            console.log('❌ Method 1 failed:', method1Error.message);
          }
        }
        
        // Method 2: Try direct URL without fl_attachment
        if (!downloadSuccess) {
          try {
            console.log('📥 Method 2: Trying direct URL without fl_attachment');
            
            const response = await axios({
              method: 'GET',
              url: modelFile.url, // Use original URL without modifications
              responseType: 'stream',
              timeout: 30000,
              headers: {
                'User-Agent': 'DALMA-AI-Server/1.0'
              }
            });
            
            console.log('✅ Method 2 successful: Got file from direct URL');
            
            // Set headers to force download
            res.setHeader('Content-Type', contentType);
            res.setHeader('Content-Disposition', `attachment; filename="${asset.name.replace(/[^a-zA-Z0-9-_]/g, '_')}.${format}"`);
            res.setHeader('Cache-Control', 'no-cache');
            
            if (response.headers['content-length']) {
              res.setHeader('Content-Length', response.headers['content-length']);
            }
            
            response.data.pipe(res);
            downloadSuccess = true;
            console.log('✅ Streaming file to client from direct URL');
            
          } catch (method2Error) {
            console.log('❌ Method 2 failed:', method2Error.message);
          }
        }
        
        // Method 3: If streaming fails, try to download and send as buffer
        if (!downloadSuccess) {
          try {
            console.log('📥 Method 3: Downloading file as buffer');
            
            const response = await axios({
              method: 'GET',
              url: modelFile.url,
              responseType: 'arraybuffer',
              timeout: 60000,
              headers: {
                'User-Agent': 'DALMA-AI-Server/1.0'
              },
              maxContentLength: 100 * 1024 * 1024, // 100MB max
              maxBodyLength: 100 * 1024 * 1024
            });
            
            console.log('✅ Method 3 successful: Got file as buffer, size:', response.data.length);
            
            // Send as download
            res.setHeader('Content-Type', contentType);
            res.setHeader('Content-Disposition', `attachment; filename="${asset.name.replace(/[^a-zA-Z0-9-_]/g, '_')}.${format}"`);
            res.setHeader('Content-Length', response.data.length);
            res.setHeader('Cache-Control', 'no-cache');
            
            res.send(Buffer.from(response.data));
            downloadSuccess = true;
            console.log('✅ Sent file as buffer');
            
          } catch (method3Error) {
            console.log('❌ Method 3 failed:', method3Error.message);
          }
        }
        
        // Method 4: Last resort - redirect directly to Cloudinary URL
        if (!downloadSuccess && !res.headersSent) {
          console.log('📥 Method 4: Redirecting directly to Cloudinary URL');
          console.log('🔗 Redirect URL:', modelFile.url);
          
          // Add a download parameter to the URL
          const redirectUrl = modelFile.url.includes('?') 
            ? modelFile.url + '&download=1' 
            : modelFile.url + '?download=1';
          
          return res.redirect(redirectUrl);
        }
        
        if (!downloadSuccess && !res.headersSent) {
          console.error('❌ All download methods failed');
          return res.status(500).json({ 
            error: 'Failed to download file',
            message: 'Unable to download the file. The file exists but cannot be retrieved for download.',
            assetName: asset.name,
            format: format.toUpperCase(),
            suggestion: 'Try refreshing the page and downloading again, or contact support if the issue persists.'
          });
        }
        
      } catch (error) {
        console.error('❌ Unexpected error in Cloudinary handler:', error.message);
        console.error('📍 Stack:', error.stack);
        
        if (!res.headersSent) {
          return res.status(500).json({ 
            error: 'Download failed',
            message: 'An unexpected error occurred while downloading the file.',
            details: error.message
          });
        }
      }
      
    } else if (modelFile.url.includes('meshy.ai') || modelFile.url.includes('assets.meshy.ai')) {
      // This case should have been caught earlier, but as a safety net
      console.log('⚠️ Meshy URL detected late in process');
      if (asset.meshyTaskId) {
        console.log('🔄 Redirecting to proxy for Meshy URL');
        return res.redirect(`/api/proxyModel/${asset.meshyTaskId}?format=${format}`);
      } else {
        console.log('❌ Meshy URL found but no task ID available');
        return res.status(500).json({ 
          error: 'Meshy URL requires proxy but task ID not found' 
        });
      }
    } else if (modelFile.url.startsWith('/api/')) {
      // Relative API URL (like proxy URLs)
      console.log('🔗 Handling relative API URL...');
      console.log('🔄 Redirecting to:', modelFile.url);
      return res.redirect(modelFile.url);
    } else if (modelFile.url.startsWith('http')) {
      // Direct URL from other services
      console.log('🔗 Handling direct HTTP URL...');
      console.log('🔄 Redirecting to:', modelFile.url);
      return res.redirect(modelFile.url);
    } else if (modelFile.url.includes('memory://')) {
      console.log('❌ Memory URL not downloadable:', modelFile.url);
      return res.status(404).json({ 
        error: 'File not available for download (stored in memory only)',
        debug: {
          assetName: asset.name,
          modelFileUrl: modelFile.url
        }
      });
    } else {
      // Unknown URL format
      console.log('⚠️ Unknown URL format, attempting direct redirect...');
      console.log('🔄 Redirecting to:', modelFile.url);
      return res.redirect(modelFile.url);
    }
    
  } catch (error) {
    console.error('❌ CRITICAL DOWNLOAD ERROR:', error.message);
    console.error('📍 Stack trace:', error.stack);
    console.error('🔍 Error details:', {
      name: error.name,
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    res.status(500).json({ 
      error: 'Failed to download asset', 
      details: error.message,
      debug: {
        errorName: error.name,
        errorCode: error.code
      }
    });
  }
});
// PUT /api/assets/:id - Update asset (admin can update any asset)
router.put('/:id', authMiddleware, adminMiddleware, uploadFields, async (req, res) => {
  try {
    console.log('📝 PUT /api/assets/' + req.params.id + ' called');
    console.log('👤 Admin user:', req.user.username);
    
    if (!dbAvailable || !Asset) {
      return res.status(503).json({ error: 'Database not available' });
    }
    
    const asset = await Asset.findById(req.params.id);
    
    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }
    
    // ADMIN NOTE: Since this route requires adminMiddleware, 
    // the user is already confirmed to be admin, so they can update any asset
    console.log('👑 Admin updating asset:', asset.name);
    
    // Update basic fields
    const {
      name, breed, icon, fileSize, polygons, popularity,
      tags, description, topology, texture, symmetry, pbr  // CRITICAL: Accept generation parameters
    } = req.body;
    
    if (name) asset.name = name;
    if (breed) asset.breed = breed;
    if (icon) asset.icon = icon;
    if (fileSize) asset.fileSize = fileSize;
    if (polygons) asset.polygons = parseInt(polygons);
    if (popularity !== undefined) asset.popularity = parseInt(popularity) || 0;
    if (tags) asset.tags = tags.split(',').map(tag => tag.trim());
    if (description) asset.description = description;
    
    // CRITICAL: Update generation parameters
    if (topology) asset.topology = topology;
    if (texture !== undefined) asset.texture = texture === 'true' || texture === true;
    if (symmetry) asset.symmetry = symmetry;
    if (pbr !== undefined) asset.pbr = pbr === 'true' || pbr === true;
    
    console.log('🔺 Updating asset topology to:', asset.topology);
    
    // Handle file updates
    for (const format of ['glb', 'fbx', 'obj', 'usdz']) {
      const fieldName = `modelFile${format.toUpperCase()}`;
      
      if (req.files[fieldName] && req.files[fieldName][0]) {
        const file = req.files[fieldName][0];
        console.log(`📁 Updating ${format.toUpperCase()} file:`, file.originalname);
        
        // Delete old file if exists
        if (asset.modelFiles && asset.modelFiles[format] && asset.modelFiles[format].publicId) {
          await cloudinaryConfig.deleteFile(asset.modelFiles[format].publicId, 'raw');
        }
        
        // Upload new file
        const uploadResult = await cloudinaryConfig.uploadModelFromBuffer(
          file.buffer,
          `${name.replace(/\s+/g, '-')}-${format}-${Date.now()}.${format}`
        );
        
        asset.addFormat(format, {
          filename: uploadResult.filename,
          url: uploadResult.url,
          publicId: uploadResult.publicId,
          size: uploadResult.size
        });
        
        console.log(`✅ ${format.toUpperCase()} updated successfully`);
      }
    }
    
    // Update legacy modelFile if GLB was updated
    if (asset.modelFiles && asset.modelFiles.glb) {
      asset.modelFile = asset.modelFiles.glb;
    }
    
    // Handle preview image update
    if (req.files.previewImage && req.files.previewImage[0]) {
      const previewFile = req.files.previewImage[0];
      console.log('📷 Updating preview image');
      
      // Delete old preview if exists
      if (asset.previewImage && asset.previewImage.publicId) {
        await cloudinaryConfig.deleteFile(asset.previewImage.publicId, 'image');
      }
      
      const previewUpload = await cloudinaryConfig.uploadImageFromBuffer(
        previewFile.buffer,
        `preview-${name.replace(/\s+/g, '-')}-${Date.now()}`
      );
      
      asset.previewImage = {
        filename: previewUpload.filename,
        url: previewUpload.url,
        publicId: previewUpload.publicId,
        size: previewUpload.size
      };
    }
    
    await asset.save();
    
    console.log('✅ Asset updated successfully:', asset._id);
    console.log('🔺 Updated asset topology:', asset.topology);
    
    res.json({
      message: 'Asset updated successfully',
      asset: asset
    });
    
  } catch (error) {
    console.error('❌ Error updating asset:', error);
    console.error('📍 Stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to update asset', 
      details: error.message 
    });
  }
});

// DELETE /api/assets/:id - Delete asset (admin can delete any asset)
router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    console.log('🗑️ DELETE /api/assets/' + req.params.id + ' called');
    console.log('👤 Admin user:', req.user.username);
    
    if (!dbAvailable || !Asset) {
      return res.status(503).json({ error: 'Database not available' });
    }
    
    const asset = await Asset.findById(req.params.id);
    
    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }
    
    // ADMIN NOTE: Since this route requires adminMiddleware, 
    // the user is already confirmed to be admin, so they can delete any asset
    console.log('👑 Admin deleting asset:', asset.name);
    
    // Delete files from Cloudinary
    if (cloudinaryAvailable && cloudinaryConfig) {
      // Delete model files
      if (asset.modelFiles) {
        for (const format of Object.keys(asset.modelFiles)) {
          const file = asset.modelFiles[format];
          if (file && file.publicId) {
            await cloudinaryConfig.deleteFile(file.publicId, 'raw');
            console.log(`✅ ${format.toUpperCase()} file deleted`);
          }
        }
      }
      
      // Delete legacy model file
      if (asset.modelFile && asset.modelFile.publicId) {
        await cloudinaryConfig.deleteFile(asset.modelFile.publicId, 'raw');
      }
      
      // Delete images
      if (asset.previewImage && asset.previewImage.publicId) {
        await cloudinaryConfig.deleteFile(asset.previewImage.publicId, 'image');
      }
      
      if (asset.originalImage && asset.originalImage.publicId) {
        await cloudinaryConfig.deleteFile(asset.originalImage.publicId, 'image');
      }
    }
    
    // Delete from database
    await Asset.findByIdAndDelete(req.params.id);
    
    console.log('✅ Asset deleted successfully');
    
    res.json({
      message: 'Asset deleted successfully',
      deletedAsset: {
        id: asset._id,
        name: asset.name
      }
    });
    
  } catch (error) {
    console.error('❌ Error deleting asset:', error);
    console.error('📍 Stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to delete asset', 
      details: error.message 
    });
  }
});

// UPDATED: POST /api/assets/from-meshy - Create USER asset from Meshy generation (WITH PROXY URLs)
router.post('/from-meshy', authMiddleware, async (req, res) => {
  try {
    console.log('🎨 Creating USER asset from Meshy generation (WITH CLOUDINARY SAVE)');
    console.log('👤 User:', req.user.username, '(', req.user.userId, ')');
    
    const { 
      taskId, 
      name, 
      breed, 
      icon, 
      modelUrl, 
      polygons, 
      description, 
      tags, 
      originalImageBase64,
      originalImageUrl,
      previewImageUrl,
      isPublic = false,
      topology = 'triangle',
      texture = true,
      symmetry = 'auto',
      pbr = false
    } = req.body;
    
    console.log('📋 Meshy asset data:', {
      taskId, name, breed, modelUrl: !!modelUrl, hasOriginalImage: !!originalImageBase64,
      topology, texture, symmetry, pbr
    });
    console.log('🔺 CRITICAL: Topology received in from-meshy:', topology);
    
    if (!taskId || !modelUrl) {
      console.log('❌ Missing required fields for Meshy asset');
      return res.status(400).json({ error: 'Task ID and model URL are required' });
    }
    
    // CRITICAL: Get all model URLs from Meshy first
    console.log('🔍 Getting all model URLs from Meshy...');
    let modelUrls = {};
    
    // Get full model status from Meshy to get all format URLs
    if (cloudinaryAvailable && cloudinaryConfig) {
      try {
        const headers = { Authorization: `Bearer ${process.env.MESHY_API_KEY || 'msy_dgO5o6R6IKwwBbWYWrerMkUC4iMJSZPHPMYI'}` };
        const statusRes = await axios.get(
          `https://api.meshy.ai/openapi/v1/image-to-3d/${taskId}`,
          { headers }
        );
        
        if (statusRes.data?.status === 'SUCCEEDED') {
          modelUrls = statusRes.data?.result?.model_urls || statusRes.data?.model_urls || {};
          console.log('📋 Available formats from Meshy:', Object.keys(modelUrls));
        }
      } catch (err) {
        console.error('⚠️ Could not fetch all model URLs from Meshy:', err.message);
        // Fallback to just GLB URL
        modelUrls = { glb: modelUrl };
      }
    } else {
      // Fallback if no Cloudinary
      modelUrls = { glb: modelUrl };
    }
    
    // Download and save ALL formats to Cloudinary
    const modelFiles = {};
    const availableFormats = [];
    let totalSize = 0;
    
    if (cloudinaryAvailable && cloudinaryConfig) {
      console.log('📥 Downloading all model formats from Meshy to save to Cloudinary...');
      
      for (const [format, url] of Object.entries(modelUrls)) {
        if (!url) continue;
        
        try {
          console.log(`📥 Downloading ${format.toUpperCase()} from Meshy...`);
          
          // Download from Meshy
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
            console.log(`✅ ${format.toUpperCase()} will use proxy URL:`, modelFiles[format].url);
            continue;
          }
          
          // Upload to Cloudinary
          const uploadResult = await cloudinaryConfig.uploadModelFromBuffer(
            buffer,
            `${name.replace(/\s+/g, '-')}-${format}-${Date.now()}.${format}`
          );
          
          modelFiles[format] = {
            filename: uploadResult.filename,
            url: uploadResult.url,
            publicId: uploadResult.publicId,
            size: uploadResult.size
          };
          
          availableFormats.push(format);
          console.log(`✅ ${format.toUpperCase()} saved to Cloudinary:`, uploadResult.url);
          
        } catch (saveError) {
          console.error(`⚠️ Failed to save ${format} to Cloudinary:`, saveError.message);
          
          // CRITICAL: Use PROXY URL as fallback for any failure
          modelFiles[format] = {
            filename: `${taskId}.${format}`,
            url: `/api/proxyModel/${taskId}?format=${format}`, // PROXY URL
            publicId: `meshy-proxy-${taskId}-${format}`,
            size: 0,
            isProxy: true,
            originalMeshyUrl: url
          };
          availableFormats.push(format);
          console.log(`✅ ${format.toUpperCase()} fallback to proxy URL:`, modelFiles[format].url);
        }
      }
    } else {
      // No Cloudinary available, use proxy URLs for all
      for (const [format, url] of Object.entries(modelUrls)) {
        if (url) {
          modelFiles[format] = {
            filename: `${taskId}.${format}`,
            url: `/api/proxyModel/${taskId}?format=${format}`, // PROXY URL
            publicId: `meshy-proxy-${taskId}-${format}`,
            size: 0,
            isProxy: true,
            originalMeshyUrl: url
          };
          availableFormats.push(format);
        }
      }
    }
    
    console.log('✅ Model files processed:', {
      formats: availableFormats,
      totalSize: `${(totalSize / 1024 / 1024).toFixed(2)} MB`
    });
    
    // Ensure we have at least GLB
    if (!modelFiles.glb) {
      console.error('❌ GLB format is required but not available');
      return res.status(500).json({ error: 'GLB format not available from Meshy' });
    }
    
    // ALWAYS create the asset immediately when generated
    const assetData = {
      name: name || `Generated Model ${Date.now()}`,
      breed: breed || 'Mixed Breed',
      icon: icon || '🐕',
      fileSize: totalSize > 0 ? `${(totalSize / 1024 / 1024).toFixed(1)} MB` : 'Unknown',
      polygons: polygons || 30000,
      tags: tags ? tags.split(',').map(t => t.trim()) : ['generated', 'meshy'],
      description: description || 'AI-generated 3D dog model',
      
      // NEW: Save generation parameters as first-class fields
      topology: topology,
      texture: texture,
      symmetry: symmetry,
      pbr: pbr,
      
      generatedFromImage: true,
      meshyTaskId: taskId,
      modelFile: modelFiles.glb, // Legacy support
      modelFiles: modelFiles, // All formats
      availableFormats: availableFormats, // All available formats
      userId: req.user.userId, // CRITICAL: Always set the user ID
      isPublic: isPublic, // Default to private
      isUserGenerated: true, // CRITICAL: Always mark as user generated
      isActive: true, // CRITICAL: Always set as active
      category: 'user_generated',
      views: 0,
      downloads: 0,
      popularity: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      
      // Enhanced generation metadata
      generationMetadata: {
        topology: topology,
        hasTexture: texture,
        symmetry: symmetry,
        pbrEnabled: pbr,
        targetPolycount: polygons,
        generatedAt: new Date().toISOString(),
        isMeshyGenerated: true,
        // Track which formats use proxy
        proxyFormats: Object.entries(modelFiles)
          .filter(([_, file]) => file.isProxy)
          .map(([format, _]) => format)
      }
    };
    
    // Handle original image if provided
    if (originalImageBase64 && cloudinaryAvailable && cloudinaryConfig) {
      try {
        console.log('🖼️ Uploading original image to Cloudinary...');
        const originalImageUpload = await cloudinaryConfig.uploadOriginalImageFromBase64(
          originalImageBase64, 
          `meshy-${taskId}-original`
        );
        
        assetData.originalImage = {
          filename: originalImageUpload.filename,
          url: originalImageUpload.url,
          publicId: originalImageUpload.publicId,
          size: originalImageUpload.size
        };
        
        console.log('✅ Original image uploaded:', originalImageUpload.url);
      } catch (imageError) {
        console.error('⚠️ Failed to upload original image:', imageError);
        // Continue without original image
      }
    } else if (originalImageUrl) {
      // Use provided URL directly
      assetData.originalImage = {
        filename: `meshy-${taskId}-original.jpg`,
        url: originalImageUrl,
        publicId: `meshy-${taskId}-original`,
        size: 0
      };
    }
    
    // Handle preview image if provided
    if (previewImageUrl) {
      assetData.previewImage = {
        filename: `meshy-${taskId}-preview.jpg`,
        url: previewImageUrl,
        publicId: `meshy-${taskId}-preview`,
        size: 0
      };
    }
    
    console.log('💾 Creating Meshy asset with data:', {
      name: assetData.name,
      userId: assetData.userId,
      isUserGenerated: assetData.isUserGenerated,
      availableFormats: assetData.availableFormats,
      proxyFormats: assetData.generationMetadata.proxyFormats,
      isPublic: assetData.isPublic,
      hasOriginalImage: !!assetData.originalImage,
      topology: assetData.topology
    });
    console.log('🔺 FINAL TOPOLOGY VALUE BEING SAVED:', assetData.topology);
    
    // Check if asset already exists for this taskId and user
    const existingAsset = await Asset.findOne({ 
      meshyTaskId: taskId, 
      userId: req.user.userId 
    });
    
    let asset;
    if (existingAsset) {
      console.log('📝 Updating existing asset for taskId:', taskId);
      // Update existing asset
      Object.assign(existingAsset, assetData);
      asset = await existingAsset.save();
    } else {
      console.log('🆕 Creating new asset for taskId:', taskId);
      // Create new asset
      asset = await Asset.create(assetData);
    }
    
    console.log('✅ User Meshy asset created/updated successfully:', asset._id, 'for user:', req.user.username);
    console.log('🔺 Saved topology:', asset.topology);
    
    res.status(201).json({
      message: 'User asset created from Meshy successfully',
      asset: {
        _id: asset._id,
        name: asset.name,
        breed: asset.breed,
        icon: asset.icon,
        userId: asset.userId,
        meshyTaskId: asset.meshyTaskId,
        isUserGenerated: asset.isUserGenerated,
        isPublic: asset.isPublic,
        availableFormats: asset.availableFormats,
        proxyFormats: asset.generationMetadata?.proxyFormats || [],
        originalImage: asset.originalImage,
        previewImage: asset.previewImage,
        createdAt: asset.createdAt,
        topology: asset.topology,
        texture: asset.texture,
        symmetry: asset.symmetry,
        pbr: asset.pbr
      }
    });
    
  } catch (error) {
    console.error('❌ Error creating User Meshy asset:', error);
    console.error('📍 Stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to create user asset from Meshy',
      details: error.message 
    });
  }
});


// Other routes remain the same...

// Error handling middleware
router.use((error, req, res, next) => {
  console.error('❌ ROUTER ERROR:', error.message);
  console.error('📍 Stack:', error.stack);
  console.error('🔍 Request details:', {
    method: req.method,
    url: req.url,
    params: req.params,
    query: req.query
  });
  
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      console.log('📁 File too large error');
      return res.status(400).json({ error: 'File too large' });
    }
    console.log('📁 Multer error:', error.code);
    return res.status(400).json({ error: 'File upload error: ' + error.message });
  }
  
  res.status(500).json({ error: 'Internal server error: ' + error.message });
});

console.log('✅ Asset routes configuration complete');
console.log('📋 Routes configured:');
console.log('  ');
console.log('  🔐 ADMIN ROUTES:');
console.log('  - GET    /api/assets/admin/user-models ← GET ALL USER GENERATIONS WITH PUBLISH STATUS');
console.log('  - GET    /api/assets/admin/user-models/:id ← GET SINGLE USER MODEL');
console.log('  - DELETE /api/assets/admin/user-models/:id ← DELETE USER MODEL');
console.log('  - POST   /api/assets/admin/user-models/:id/toggle-public ← TOGGLE PUBLIC');
console.log('  ');
console.log('  🌐 PUBLIC & USER ROUTES:');
console.log('  - GET    /api/assets');
console.log('  - POST   /api/assets ← CREATE/PUBLISH ASSET WITH WORKFLOW SUPPORT');
console.log('  - GET    /api/assets/:id ← VIEW ASSET (WITH ADMIN OVERRIDE)');
console.log('  - PUT    /api/assets/:id');
console.log('  - DELETE /api/assets/:id');
console.log('  - GET    /api/assets/:id/formats ← CHECK FORMATS (WITH ADMIN OVERRIDE)');
console.log('  - GET    /api/assets/:id/download ← DOWNLOAD (WITH ADMIN OVERRIDE)');
console.log('  - POST   /api/assets/from-meshy ← IMMEDIATE USER GENERATION CAPTURE WITH PROXY URLs');

module.exports = router;