/**
 * Asset Model
 * Mongoose schema for 3D model assets with multi-format support
 */

const mongoose = require('mongoose');

/**
 * Asset schema definition
 */
const AssetSchema = new mongoose.Schema({
    // Basic information
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
    
    // Generation parameters
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
    
    // Multiple model file format support
    modelFiles: {
        glb: {
            filename: String,
            url: String,
            publicId: String,
            size: Number,
            isProxy: Boolean,
            originalMeshyUrl: String
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
    
    // Track available formats
    availableFormats: [{
        type: String,
        enum: ['glb', 'fbx', 'obj', 'usdz']
    }],
    
    // Legacy modelFile field for backward compatibility
    modelFile: {
        filename: {
            type: String,
            required: false
        },
        url: {
            type: String,
            required: false
        },
        publicId: {
            type: String,
            required: false
        },
        size: {
            type: Number,
            required: false
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
    
    // Statistics
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
    
    // Status and ownership
    isActive: {
        type: Boolean,
        default: true
    },
    createdBy: {
        type: String,
        default: 'admin'
    },
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
    
    // Meshy integration
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
    
    // Publishing tracking
    wasUserGenerated: {
        type: Boolean,
        default: false
    },
    sourceUserAssetId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Asset',
        default: null
    },
    publishedToHomepageAt: {
        type: Date,
        default: null
    },
    
    // Generation metadata
    generationMetadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

/**
 * Indexes for performance optimization
 */
AssetSchema.index({ name: 'text', breed: 'text', description: 'text' });
AssetSchema.index({ breed: 1 });
AssetSchema.index({ popularity: -1 });
AssetSchema.index({ createdAt: -1 });
AssetSchema.index({ userId: 1 });
AssetSchema.index({ isPublic: 1, isUserGenerated: 1 });
AssetSchema.index({ category: 1 });
AssetSchema.index({ wasUserGenerated: 1 });
AssetSchema.index({ topology: 1 });

/**
 * Pre-validation middleware
 * Ensure modelFile is populated from modelFiles.glb if needed
 */
AssetSchema.pre('validate', function(next) {
    // Populate modelFile from modelFiles.glb if not present
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
    
    // Validate that at least one model file exists
    const hasModelFile = this.modelFile && this.modelFile.url;
    const hasGlbInModelFiles = this.modelFiles && this.modelFiles.glb && this.modelFiles.glb.url;
    
    if (!hasModelFile && !hasGlbInModelFiles) {
        this.invalidate('modelFile', 'Asset must have at least one model file (GLB)');
    }
    
    next();
});

/**
 * Pre-save middleware
 * Ensure data consistency before saving
 */
AssetSchema.pre('save', function(next) {
    // Ensure modelFile is populated from modelFiles.glb
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

/**
 * Instance Methods
 */

/**
 * Get model file for specific format
 * @param {string} format - File format (glb, fbx, obj, usdz)
 * @returns {Object|null} Model file data or null if not found
 */
AssetSchema.methods.getModelFile = function(format = 'glb') {
    // Check new modelFiles structure
    if (this.modelFiles && this.modelFiles[format]) {
        return this.modelFiles[format];
    }
    
    // Fall back to legacy modelFile for GLB
    if (format === 'glb' && this.modelFile) {
        return this.modelFile;
    }
    
    return null;
};

/**
 * Check if asset has specific format
 * @param {string} format - File format to check
 * @returns {boolean} True if format is available
 */
AssetSchema.methods.hasFormat = function(format) {
    return this.availableFormats && this.availableFormats.includes(format);
};

/**
 * Add new format to asset
 * @param {string} format - File format
 * @param {Object} fileData - File data object
 */
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

/**
 * Increment download counter
 * @returns {Promise<Asset>} Updated asset
 */
AssetSchema.methods.incrementDownloads = function() {
    this.downloads += 1;
    return this.save();
};

/**
 * Increment view counter
 * @returns {Promise<Asset>} Updated asset
 */
AssetSchema.methods.incrementViews = function() {
    this.views += 1;
    return this.save();
};

/**
 * Update popularity score based on views and downloads
 * @returns {Promise<Asset>} Updated asset
 */
AssetSchema.methods.updatePopularity = function() {
    const downloadWeight = 10;
    const viewWeight = 1;
    const totalScore = (this.downloads * downloadWeight) + (this.views * viewWeight);
    this.popularity = Math.min(100, Math.floor(totalScore / 10));
    return this.save();
};

/**
 * Check if asset is owned by user
 * @param {ObjectId} userId - User ID to check
 * @returns {boolean} True if user owns the asset
 */
AssetSchema.methods.isOwnedBy = function(userId) {
    return this.userId && this.userId.toString() === userId.toString();
};

/**
 * Check if asset can be viewed by user (with admin override)
 * @param {Object} user - User object with userId and isAdmin
 * @returns {boolean} True if user can view the asset
 */
AssetSchema.methods.canBeViewedByUser = function(user) {
    // Non-authenticated users can only view public assets
    if (!user) {
        return this.isPublic;
    }
    
    // Admins can view all assets
    if (user.isAdmin) {
        return true;
    }
    
    // Public assets are viewable by everyone
    if (this.isPublic) {
        return true;
    }
    
    // Private assets only viewable by owner
    if (this.userId && user.userId) {
        return this.userId.toString() === user.userId.toString();
    }
    
    return false;
};

/**
 * Legacy permission check (backward compatibility)
 * @param {ObjectId} userId - User ID to check
 * @returns {boolean} True if user can view the asset
 */
AssetSchema.methods.canBeViewedBy = function(userId) {
    if (this.isPublic) return true;
    if (this.userId && userId) {
        return this.userId.toString() === userId.toString();
    }
    return false;
};

/**
 * Mark asset as published to public gallery
 * @param {ObjectId} sourceAssetId - Original user asset ID
 * @returns {Promise<Asset>} Updated asset
 */
AssetSchema.methods.markAsPublished = function(sourceAssetId) {
    this.wasUserGenerated = true;
    this.sourceUserAssetId = sourceAssetId;
    this.publishedToHomepageAt = new Date();
    this.isPublic = true;
    this.category = 'public';
    this.isUserGenerated = false;
    return this.save();
};

/**
 * Static Methods
 */

/**
 * Find assets by breed
 * @param {string} breed - Breed name to search
 * @returns {Promise<Asset[]>} Matching assets
 */
AssetSchema.statics.findByBreed = function(breed) {
    return this.find({ breed: new RegExp(breed, 'i'), isActive: true });
};

/**
 * Find most popular assets
 * @param {number} limit - Maximum number of assets to return
 * @returns {Promise<Asset[]>} Popular assets sorted by popularity
 */
AssetSchema.statics.findPopular = function(limit = 10) {
    return this.find({ isActive: true })
        .sort({ popularity: -1 })
        .limit(limit);
};

/**
 * Find asset by Meshy task ID
 * @param {string} taskId - Meshy task ID
 * @returns {Promise<Asset>} Asset document
 */
AssetSchema.statics.findByMeshyTask = function(taskId) {
    return this.findOne({ meshyTaskId: taskId });
};

/**
 * Find public assets for homepage
 * @param {Object} options - Query options
 * @returns {Promise<Asset[]>} Public assets
 */
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

/**
 * Find user's generated assets
 * @param {ObjectId} userId - User ID
 * @param {Object} options - Query options
 * @returns {Promise<Asset[]>} User's assets
 */
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

/**
 * Create new user asset
 * @param {Object} assetData - Asset data
 * @param {ObjectId} userId - User ID
 * @returns {Promise<Asset>} Created asset
 */
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

/**
 * Find assets published from user models
 * @param {Object} options - Query options
 * @returns {Promise<Asset[]>} Published user assets
 */
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

/**
 * Check if user asset has been published
 * @param {ObjectId} userAssetId - User asset ID
 * @returns {Promise<Asset>} Published asset if exists
 */
AssetSchema.statics.isUserAssetPublished = function(userAssetId) {
    return this.findOne({
        sourceUserAssetId: userAssetId,
        wasUserGenerated: true
    });
};

// Create and export the model
module.exports = mongoose.model('Asset', AssetSchema);