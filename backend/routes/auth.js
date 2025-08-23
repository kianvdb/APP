const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

// Validation helpers
const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length >= 7;
};

const validateUsername = (username) => {
    return /^[a-zA-Z0-9_]{3,20}$/.test(username);
};

const validatePassword = (password) => {
    return password && password.length >= 6;
};


const generateToken = (userId, username, isAdmin) => {
    return jwt.sign(
        { 
            userId, 
            username,
            isAdmin 
        },
        process.env.JWT_SECRET,  
        { expiresIn: '7d' }      
    );
};

// Auth middleware that accepts both cookie and header token
const authMiddleware = async (req, res, next) => {
    try {
        // Try to get token from cookie first
      let token = req.cookies.token;
        
        // If no cookie, try Authorization header
        if (!token && req.headers.authorization) {
            const authHeader = req.headers.authorization;
            if (authHeader.startsWith('Bearer ')) {
                token = authHeader.substring(7);
            }
        }
        
        console.log('🔐 Auth middleware - Token found:', !!token);
        console.log('🔐 Auth middleware - From cookie:', !!req.cookies.dalma_auth_token);
        console.log('🔐 Auth middleware - From header:', !!req.headers.authorization);

        if (!token) {
            console.log('❌ No auth token found in cookies or headers');
            return res.status(401).json({ error: 'Authentication required' });
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Get user from database
        const user = await User.findById(decoded.userId);
        
        if (!user) {
            console.log('❌ User not found for token');
            return res.status(401).json({ error: 'User not found' });
        }

        // Attach user info to request
        req.user = {
            userId: user._id,
            username: user.username,
            isAdmin: user.isAdmin
        };
        
        console.log('✅ User authenticated via token:', user.username);
        
        next();
    } catch (error) {
        console.error('❌ Auth middleware error:', error.message);
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: 'Invalid token' });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expired' });
        }
        
        res.status(500).json({ error: 'Authentication error' });
    }
};

// POST /api/auth/register
router.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        console.log('📝 Registration attempt:', { username, email });

        // Validation
        if (!username || !email || !password) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        if (!validateUsername(username)) {
            return res.status(400).json({ 
                error: 'Username must be 3-20 characters long and contain only letters, numbers, and underscores' 
            });
        }

        if (!validateEmail(email)) {
            return res.status(400).json({ error: 'Please enter a valid email address' });
        }

        if (!validatePassword(password)) {
            return res.status(400).json({ 
                error: 'Password must be at least 6 characters long' 
            });
        }

        // Check for existing user
        const existingUsername = await User.findByUsername(username);
        if (existingUsername) {
            return res.status(400).json({ error: 'Username already exists' });
        }

        const existingEmail = await User.findByEmail(email);
        if (existingEmail) {
            return res.status(400).json({ error: 'Email already exists' });
        }

       const user = new User({
    username,
    email,
    password,
    tokens: 1, // Use 'tokens' not 'credits', and give 1 free token as per model default
    isAdmin: (await User.countDocuments()) === 0 
});

await user.save();

// Generate token
const token = generateToken(user._id, user.username, user.isAdmin);

// IMPORTANT: Clear any existing cookies first to prevent session conflicts
res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    path: '/'
});

// Set new cookie
const isProduction = process.env.NODE_ENV === 'production';
const cookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/'
};

res.cookie('token', token, cookieOptions);
console.log('🍪 Cookie set with token');

console.log('✅ User registered successfully:', user.username);

// Return response with CONSISTENT field names
res.status(201).json({
    success: true,
    message: 'User registered successfully',
    user: {
        id: user._id,
        username: user.username,
        email: user.email,
        isAdmin: user.isAdmin,
        tokens: user.tokens || 1  // Use 'tokens' consistently
    },
    token: token
});

    } catch (error) {
        console.error('❌ Registration error:', error);
        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern)[0];
            return res.status(400).json({ error: `${field} already exists` });
        }
        res.status(500).json({ error: 'Registration failed. Please try again.' });
    }
});

// POST /api/auth/login - CORRECTED VERSION
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        console.log('🔐 Login attempt:', { username });

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        // Find user by username
        const user = await User.findByUsername(username);
        if (!user) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        // Check password
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        // NOW clear any existing cookies (after validating user)
        res.clearCookie('token', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
            path: '/'
        });

        // Generate token
        const token = generateToken(user._id, user.username, user.isAdmin);

        // Set new cookie
        const isProduction = process.env.NODE_ENV === 'production';
        const cookieOptions = {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? 'strict' : 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000,
            path: '/'
        };
        
        res.cookie('token', token, cookieOptions);
        console.log('🍪 Cookie set with token');

        console.log('✅ User logged in successfully:', user.username);

        // Return token in response body for mobile - USE TOKENS not credits!
        res.json({
            success: true,
            message: 'Login successful',
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                isAdmin: user.isAdmin,
                tokens: user.tokens || 1  // FIXED: Use 'tokens' consistently, not 'credits'
            },
            token: token // Include token in response
        });

    } catch (error) {
        console.error('❌ Login error:', error);
        res.status(500).json({ error: 'Login failed. Please try again.' });
    }
});

router.post('/logout', (req, res) => {
    // Clear ALL possible cookie variations to ensure clean logout
    const isProduction = process.env.NODE_ENV === 'production';
    
    const cookieOptions = {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'strict' : 'lax',
        path: '/'
    };
    
    // Clear both possible cookie names
    res.clearCookie('token', cookieOptions);
    res.clearCookie('dalma_auth_token', cookieOptions); // Legacy cookie name
    
    // Clear session if exists
    if (req.session) {
        req.session.destroy();
    }
    
    res.json({ 
        success: true,
        message: 'Logged out successfully' 
    });
    
    console.log('✅ User logged out and all cookies cleared');
});

// GET /api/auth/me - Get current user
router.get('/me', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                isAdmin: user.isAdmin,
                tokens: user.tokens || 1,  // ALWAYS return tokens, default to 1
                likedAssets: user.likedAssets || [],
                generatedModels: user.generatedModels || []
            }
        });
        
    } catch (error) {
        console.error('❌ Get user error:', error);
        res.status(500).json({ error: 'Failed to get user data' });
    }
});

// POST /api/auth/like-asset - Toggle liked asset
router.post('/like-asset', authMiddleware, async (req, res) => {
    try {
        const { assetId } = req.body;
        if (!assetId) {
            return res.status(400).json({ error: 'Asset ID is required' });
        }

        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Initialize likedAssets if it doesn't exist
        if (!user.likedAssets) {
            user.likedAssets = [];
        }

        // Check if the method exists, if not, do it manually
        let isLiked;
        if (typeof user.toggleLikedAsset === 'function') {
            isLiked = user.toggleLikedAsset(assetId);
        } else {
            // Manual toggle
            const likedIndex = user.likedAssets.indexOf(assetId);
            if (likedIndex > -1) {
                user.likedAssets.splice(likedIndex, 1);
                isLiked = false;
            } else {
                user.likedAssets.push(assetId);
                isLiked = true;
            }
        }
        
        await user.save();

        res.json({
            message: isLiked ? 'Asset liked' : 'Asset unliked',
            isLiked,
            likedAssets: user.likedAssets
        });

    } catch (error) {
        console.error('❌ Like asset error:', error);
        res.status(500).json({ error: 'Failed to toggle asset like' });
    }
});

// GET /api/auth/liked-assets - Get user's liked assets
router.get('/liked-assets', authMiddleware, async (req, res) => {
    try {
        // First get the user
        const user = await User.findById(req.user.userId);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Try to populate liked assets if they exist
        let likedAssets = [];
        if (user.likedAssets && user.likedAssets.length > 0) {
            try {
                const populatedUser = await User.findById(req.user.userId).populate({
                    path: 'likedAssets',
                    match: { isActive: true },
                    options: { sort: { createdAt: -1 } }
                });
                likedAssets = populatedUser.likedAssets || [];
            } catch (populateError) {
                console.warn('⚠️ Could not populate liked assets:', populateError.message);
                // Return empty array instead of failing
            }
        }

        res.json({
            message: 'Liked assets retrieved successfully',
            assets: likedAssets
        });

    } catch (error) {
        console.error('❌ Get liked assets error:', error);
        res.status(500).json({ error: 'Failed to get liked assets' });
    }
});

// POST /api/auth/save-generated-model - Save generated model to user profile
router.post('/save-generated-model', authMiddleware, async (req, res) => {
    try {
        const { taskId, name } = req.body;
        
        if (!taskId) {
            return res.status(400).json({ error: 'Task ID is required' });
        }

        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Initialize generatedModels if it doesn't exist
        if (!user.generatedModels) {
            user.generatedModels = [];
        }

        // Check if method exists, if not, add manually
        if (typeof user.addGeneratedModel === 'function') {
            await user.addGeneratedModel(taskId, name);
        } else {
            // Manual add
            user.generatedModels.push({
                taskId,
                name: name || `Model ${Date.now()}`,
                createdAt: new Date()
            });
            await user.save();
        }

        res.json({
            message: 'Generated model saved to profile',
            generatedModels: user.generatedModels
        });

    } catch (error) {
        console.error('❌ Save generated model error:', error);
        res.status(500).json({ error: 'Failed to save generated model' });
    }
});

// Export both router and middleware
module.exports = router;
module.exports.authMiddleware = authMiddleware;