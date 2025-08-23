// backend/models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Define the transaction subdocument schema
const transactionSchema = new mongoose.Schema({
    id: String,
    date: Date,
    type: String,
    tierId: String,
    tokens: Number,
    amount: Number,
    status: String,
    stripePaymentIntentId: String,
    paymentMethod: String,
    profit: Number,
    reason: String,
    grantedBy: String
}, { _id: false });

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
    },
    tokens: {
        type: Number,
        default: 1,
        min: 0
    },
    role: {
        type: String,
        enum: ['user', 'premium', 'admin'],
        default: 'user'
    },
    transactions: [transactionSchema], // Using the subdocument schema
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

// Hash password before saving (ONLY ONCE)
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    
    try {
        const salt = await bcrypt.genSalt(12);
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

// INSTANCE METHODS
userSchema.methods.comparePassword = async function(candidatePassword) {
    try {
        return await bcrypt.compare(candidatePassword, this.password);
    } catch (error) {
        throw error;
    }
};

userSchema.methods.hasEnoughTokens = function(required = 1) {
    return this.role === 'admin' || this.tokens >= required;
};

userSchema.methods.consumeTokens = async function(amount = 1) {
    if (this.role === 'admin') {
        return true;
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

userSchema.methods.toggleLikedAsset = function(assetId) {
    const index = this.likedAssets.indexOf(assetId);
    if (index > -1) {
        this.likedAssets.splice(index, 1);
        return false;
    } else {
        this.likedAssets.push(assetId);
        return true;
    }
};

userSchema.methods.addGeneratedModel = function(taskId, name) {
    this.generatedModels.push({
        taskId,
        name: name || `Generated Model ${this.generatedModels.length + 1}`
    });
    return this.save();
};

// STATIC METHODS
userSchema.statics.findByUsername = async function(username) {
    const isEmail = username.includes('@');
    
    if (isEmail) {
        return await this.findOne({ 
            email: username.toLowerCase(), 
            isActive: true 
        });
    } else {
        return await this.findOne({
            $or: [
                { username: new RegExp(`^${username}$`, 'i') },
                { email: username.toLowerCase() }
            ],
            isActive: true
        });
    }
};

userSchema.statics.findByEmail = function(email) {
    return this.findOne({ 
        email: email.toLowerCase(), 
        isActive: true 
    });
};

// Create the model
const User = mongoose.model('User', userSchema);

// Export the model
module.exports = User;