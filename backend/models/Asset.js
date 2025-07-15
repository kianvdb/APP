const mongoose = require('mongoose');

const AssetSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Asset name is required'],
    trim: true,
    maxlength: [100, 'Asset name cannot exceed 100 characters']
  },
  breed: {
    type: String,
    required: [true, 'Dog breed is required'],
    trim: true,
    maxlength: [50, 'Breed name cannot exceed 50 characters']
  },
  icon: {
    type: String,
    required: [true, 'Icon is required'],
    maxlength: [10, 'Icon cannot exceed 10 characters']
  },
  fileSize: {
    type: String,
    required: [true, 'File size is required'],
    trim: true
  },
  polygons: {
    type: Number,
    required: [true, 'Polygon count is required'],
    min: [100, 'Polygon count must be at least 100'],
    max: [1000000, 'Polygon count cannot exceed 1,000,000']
  },
  popularity: {
    type: Number,
    required: [true, 'Popularity rating is required'], 
    min: [0, 'Popularity must be between 0 and 100'],
    max: [100, 'Popularity must be between 0 and 100'],
    default: 0
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  
  // NEW: Generation parameters as first-class fields
  topology: {
    type: String,
    enum: ['triangle', 'quad', 'triangles', 'quads'],
    default: 'triangle'
  },
  texture: {
    type: Boolean,
    default: true
  },
  symmetry: {
    type: String,
    enum: ['auto', 'on', 'off'],
    default: 'auto'
  },
  pbr: {
    type: Boolean,
    default: false
  },
  
  // NEW: Multiple model file format support
  modelFiles: {
    glb: {
      filename: String,
      url: String,
      publicId: String,
      size: Number,
      isProxy: Boolean, // NEW: Flag for proxy URLs
      originalMeshyUrl: String // NEW: Store original URL for reference
    },
    fbx: {
      filename: String,
      url: String,
      publicId: String,
      size: Number,
      isProxy: Boolean,
      originalMeshyUrl: String
    },
    obj: {
      filename: String,
      url: String,
      publicId: String,
      size: Number,
      isProxy: Boolean,
      originalMeshyUrl: String
    },
    usdz: {
      filename: String,
      url: String,
      publicId: String,
      size: Number,
      isProxy: Boolean,
      originalMeshyUrl: String
    }
  },
  
  // Track which formats are available for this asset
  availableFormats: [{
    type: String,
    enum: ['glb', 'fbx', 'obj', 'usdz']
  }],
  
  // Keep old modelFile field for backward compatibility
  // FIXED: Made optional since we're using modelFiles now
  modelFile: {
    filename: {
      type: String,
      required: false  // Changed from required
    },
    url: {
      type: String,
      required: false  // Changed from required
    },
    publicId: {
      type: String,
      required: false  // Changed from required
    },
    size: {
      type: Number,
      required: false  // Changed from required
    },
    isProxy: {
      type: Boolean,
      default: false
    },
    originalMeshyUrl: {
      type: String,
      required: false
    }
  },
  
  // Image fields
  previewImage: {
    filename: String,
    url: String,
    publicId: String,
    size: Number
  },
  originalImage: {
    filename: String,
    url: String,
    publicId: String,
    size: Number
  },
  
  downloads: {
    type: Number,
    default: 0,
    min: 0
  },
  views: {
    type: Number,
    default: 0,
    min: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: String,
    default: 'admin'
  },
  
  // User ownership and privacy fields
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  isUserGenerated: {
    type: Boolean,
    default: false
  },
  category: {
    type: String,
    enum: ['public', 'featured', 'user_generated'],
    default: 'public'
  },
  
  // Integration with Meshy workflow
  meshyTaskId: {
    type: String,
    sparse: true,
    unique: true
  },
  generatedFromImage: {
    type: Boolean,
    default: false
  },
  originalImageUrl: {
    type: String,
    sparse: true
  },
  
  // NEW: Track if this asset was originally user-generated
  wasUserGenerated: {
    type: Boolean,
    default: false
  },
  
  // NEW: Reference to the original user asset if this was published from user model
  sourceUserAssetId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Asset',
    default: null
  },
  
  // NEW: Track when it was published to homepage
  publishedToHomepageAt: {
    type: Date,
    default: null
  },
  
  // Enhanced generation metadata (FIXED: using mongoose.Schema.Types.Mixed)
  generationMetadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
AssetSchema.index({ name: 'text', breed: 'text', description: 'text' });
AssetSchema.index({ breed: 1 });
AssetSchema.index({ popularity: -1 });
AssetSchema.index({ createdAt: -1 });
AssetSchema.index({ userId: 1 });
AssetSchema.index({ isPublic: 1, isUserGenerated: 1 });
AssetSchema.index({ category: 1 });
AssetSchema.index({ wasUserGenerated: 1 }); // NEW index for published models
AssetSchema.index({ topology: 1 }); // NEW index for topology

// FIXED: Pre-save hook runs BEFORE validation, so we need to fix modelFile before validation
AssetSchema.pre('validate', function(next) {
  // If we have modelFiles.glb but no modelFile, populate it BEFORE validation
  if (this.modelFiles && this.modelFiles.glb && this.modelFiles.glb.url && (!this.modelFile || !this.modelFile.url)) {
    this.modelFile = {
      filename: this.modelFiles.glb.filename || 'model.glb',
      url: this.modelFiles.glb.url,
      publicId: this.modelFiles.glb.publicId || 'model',
      size: this.modelFiles.glb.size || 0,
      isProxy: this.modelFiles.glb.isProxy || false,
      originalMeshyUrl: this.modelFiles.glb.originalMeshyUrl || null
    };
    console.log('✅ Pre-validate: Set modelFile from modelFiles.glb');
  }
  
  // Check if we have at least one model file
  const hasModelFile = this.modelFile && this.modelFile.url;
  const hasGlbInModelFiles = this.modelFiles && this.modelFiles.glb && this.modelFiles.glb.url;
  
  if (!hasModelFile && !hasGlbInModelFiles) {
    this.invalidate('modelFile', 'Asset must have at least one model file (GLB)');
  }
  
  next();
});

// Pre-save hook to ensure consistency
AssetSchema.pre('save', function(next) {
  // Double-check: If we have modelFiles.glb but no modelFile, populate it
  if (this.modelFiles && this.modelFiles.glb && this.modelFiles.glb.url && (!this.modelFile || !this.modelFile.url)) {
    this.modelFile = {
      filename: this.modelFiles.glb.filename || 'model.glb',
      url: this.modelFiles.glb.url,
      publicId: this.modelFiles.glb.publicId || 'model',
      size: this.modelFiles.glb.size || 0,
      isProxy: this.modelFiles.glb.isProxy || false,
      originalMeshyUrl: this.modelFiles.glb.originalMeshyUrl || null
    };
    console.log('✅ Pre-save: Ensured modelFile is set from modelFiles.glb');
  }
  next();
});

// NEW: Methods for multiple format support
AssetSchema.methods.getModelFile = function(format = 'glb') {
  // Check new modelFiles structure first
  if (this.modelFiles && this.modelFiles[format]) {
    return this.modelFiles[format];
  }
  
  // Fall back to old modelFile structure for GLB
  if (format === 'glb' && this.modelFile) {
    return this.modelFile;
  }
  
  return null;
};

AssetSchema.methods.hasFormat = function(format) {
  return this.availableFormats && this.availableFormats.includes(format);
};

AssetSchema.methods.addFormat = function(format, fileData) {
  if (!this.modelFiles) {
    this.modelFiles = {};
  }
  this.modelFiles[format] = fileData;
  
  if (!this.availableFormats) {
    this.availableFormats = [];
  }
  if (!this.availableFormats.includes(format)) {
    this.availableFormats.push(format);
  }
};

// Existing methods
AssetSchema.methods.incrementDownloads = function() {
  this.downloads += 1;
  return this.save();
};

AssetSchema.methods.incrementViews = function() {
  this.views += 1;
  return this.save();
};

AssetSchema.methods.updatePopularity = function() {
  const downloadWeight = 10;
  const viewWeight = 1;
  const totalScore = (this.downloads * downloadWeight) + (this.views * viewWeight);
  this.popularity = Math.min(100, Math.floor(totalScore / 10));
  return this.save();
};

AssetSchema.methods.isOwnedBy = function(userId) {
  return this.userId && this.userId.toString() === userId.toString();
};

// ENHANCED: Permission check that includes admin override
AssetSchema.methods.canBeViewedByUser = function(user) {
  // If no user, only public assets can be viewed
  if (!user) {
    return this.isPublic;
  }
  
  // Admins can view everything
  if (user.isAdmin) {
    return true;
  }
  
  // Public assets can be viewed by everyone
  if (this.isPublic) {
    return true;
  }
  
  // Private assets can only be viewed by owner
  if (this.userId && user.userId) {
    return this.userId.toString() === user.userId.toString();
  }
  
  return false;
};

// Keep the old method for backward compatibility
AssetSchema.methods.canBeViewedBy = function(userId) {
  if (this.isPublic) return true;
  if (this.userId && userId) {
    return this.userId.toString() === userId.toString();
  }
  return false;
};

// NEW: Method to mark as published
AssetSchema.methods.markAsPublished = function(sourceAssetId) {
  this.wasUserGenerated = true;
  this.sourceUserAssetId = sourceAssetId;
  this.publishedToHomepageAt = new Date();
  this.isPublic = true;
  this.category = 'public';
  this.isUserGenerated = false; // It's now a public asset
  return this.save();
};

// Static methods
AssetSchema.statics.findByBreed = function(breed) {
  return this.find({ breed: new RegExp(breed, 'i'), isActive: true });
};

AssetSchema.statics.findPopular = function(limit = 10) {
  return this.find({ isActive: true })
    .sort({ popularity: -1 })
    .limit(limit);
};

AssetSchema.statics.findByMeshyTask = function(taskId) {
  return this.findOne({ meshyTaskId: taskId });
};

AssetSchema.statics.findPublicAssets = function(options = {}) {
  const query = {
    isActive: true,
    $or: [
      { isPublic: true },
      { category: 'featured' },
      { category: 'public' }
    ],
    isUserGenerated: { $ne: true }
  };
  
  return this.find(query)
    .sort(options.sort || { createdAt: -1 })
    .limit(options.limit || 20);
};

AssetSchema.statics.findUserAssets = function(userId, options = {}) {
  const query = {
    isActive: true,
    userId: userId,
    isUserGenerated: true
  };
  
  return this.find(query)
    .sort(options.sort || { createdAt: -1 })
    .limit(options.limit || 100);
};

AssetSchema.statics.createUserAsset = function(assetData, userId) {
  return this.create({
    ...assetData,
    userId: userId,
    isPublic: false,
    isUserGenerated: true,
    category: 'user_generated',
    createdBy: 'user'
  });
};

// NEW: Find assets that were published from user models
AssetSchema.statics.findPublishedUserAssets = function(options = {}) {
  const query = {
    isActive: true,
    wasUserGenerated: true,
    category: 'public'
  };
  
  return this.find(query)
    .populate('sourceUserAssetId', 'name userId')
    .sort(options.sort || { publishedToHomepageAt: -1 })
    .limit(options.limit || 20);
};

// NEW: Check if a user asset has been published
AssetSchema.statics.isUserAssetPublished = function(userAssetId) {
  return this.findOne({
    sourceUserAssetId: userAssetId,
    wasUserGenerated: true
  });
};

module.exports = mongoose.model('Asset', AssetSchema);