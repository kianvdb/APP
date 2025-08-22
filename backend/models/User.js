// backend/models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: [true, 'Username is required'],
        unique: true,
        trim: true,
        minlength: [3, 'Username must be at least 3 characters long'],
        maxlength: [20, 'Username cannot exceed 20 characters'],
        match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores']
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        trim: true,
        lowercase: true,
        match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email address']
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [6, 'Password must be at least 6 characters long']
    },
    isAdmin: {
        type: Boolean,
        default: false
    },
    likedAssets: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Asset'
    }],
    generatedModels: [{
        taskId: String,
        name: String,
        createdAt: { type: Date, default: Date.now }
    }],
    isActive: {
        type: Boolean,
        default: true
    }, // <-- Added comma here
    
    // NEW TOKEN SYSTEM FIELDS
    tokens: {
        type: Number,
        default: 1, // New users get 1 free token
        min: 0
    },
    role: {
        type: String,
        enum: ['user', 'premium', 'admin'],
        default: 'user'
    },
    transactions: [{
        id: String,
        date: Date,
        type: String, // 'purchase', 'admin_grant', 'refund', 'bonus'
        tierId: String,
        tokens: Number,
        amount: Number,
        status: String,
        stripePaymentIntentId: String,
        paymentMethod: String,
        profit: Number,
        reason: String, // For admin grants
        grantedBy: String // Admin email who granted tokens
    }],
    totalSpent: {
        type: Number,
        default: 0
    },
    lastTokenPurchase: Date,
    tokenUsage: [{
        date: Date,
        action: String,
        taskId: String
    }]
}, {
    timestamps: true,
    toJSON: {
        virtuals: true,
        transform: function(doc, ret) {
            delete ret.password;
            return ret;
        }
    },
    toObject: { virtuals: true }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        
        // Check if user should be admin based on email
        const adminEmails = ['threely.service@gmail.com', 'admin@threely.com'];
        if (adminEmails.includes(this.email)) {
            this.role = 'admin';
            this.isAdmin = true;
            this.tokens = 999999; // Unlimited tokens for admin
        }
        
        next();
    } catch (error) {
        next(error);
    }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function(candidatePassword) {
    try {
        return await bcrypt.compare(candidatePassword, this.password);
    } catch (error) {
        throw error;
    }
};

// Method to check if user has enough tokens
userSchema.methods.hasEnoughTokens = function(required = 1) {
    return this.role === 'admin' || this.tokens >= required;
};

// Method to consume tokens
userSchema.methods.consumeTokens = async function(amount = 1) {
    if (this.role === 'admin') {
        return true; // Admins have unlimited tokens
    }
    
    if (this.tokens < amount) {
        throw new Error('Insufficient tokens');
    }
    
    this.tokens -= amount;
    this.tokenUsage.push({
        date: new Date(),
        action: 'generation',
        taskId: `gen_${Date.now()}`
    });
    
    await this.save();
    return true;
};

// Method to add tokens (from purchase)
userSchema.methods.addTokens = async function(amount, transactionDetails) {
    this.tokens += amount;
    
    if (transactionDetails) {
        this.transactions.push(transactionDetails);
        if (transactionDetails.amount) {
            this.totalSpent = (this.totalSpent || 0) + transactionDetails.amount;
        }
        this.lastTokenPurchase = new Date();
    }
    
    await this.save();
    return this.tokens;
};

const User = mongoose.model('User', userSchema);

module.exports = User;

// Hash password before saving
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    
    try {
        const salt = await bcrypt.genSalt(12);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Instance methods
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toggleLikedAsset = function(assetId) {
    const index = this.likedAssets.indexOf(assetId);
    if (index > -1) {
        this.likedAssets.splice(index, 1);
        return false; // Asset was unliked
    } else {
        this.likedAssets.push(assetId);
        return true; // Asset was liked
    }
};

userSchema.methods.addGeneratedModel = function(taskId, name) {
    this.generatedModels.push({
        taskId,
        name: name || `Generated Model ${this.generatedModels.length + 1}`
    });
    return this.save();
};

// Static methods
userSchema.statics.findByUsername = function(username) {
    return this.findOne({ username: new RegExp(`^${username}$`, 'i'), isActive: true });
};

userSchema.statics.findByEmail = function(email) {
    return this.findOne({ email: email.toLowerCase(), isActive: true });
};

module.exports = mongoose.model('User', userSchema);