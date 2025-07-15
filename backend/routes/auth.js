const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { authMiddleware } = require('../middleware/auth');

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

// Generate JWT token
const generateToken = (userId) => {
    return jwt.sign({ userId }, process.env.JWT_SECRET || 'dalma-ai-secret-key', {
        expiresIn: '7d'
    });
};

// Set JWT cookie - Fixed for development
const setTokenCookie = (res, token) => {
    // Different settings for development vs production
    const isProduction = process.env.NODE_ENV === 'production';
    
    const cookieOptions = {
        httpOnly: true,
        secure: isProduction, // Only secure in production
        sameSite: isProduction ? 'strict' : 'lax', // More lenient in development
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/' // Ensure cookie is available for all paths
    };
    
    // Don't set domain in development - let browser handle it
    if (isProduction && process.env.COOKIE_DOMAIN) {
        cookieOptions.domain = process.env.COOKIE_DOMAIN;
    }
    
    res.cookie('dalma_auth_token', token, cookieOptions);
    
    console.log('🍪 Cookie set with options:', cookieOptions);
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

        // Create user
        const user = new User({
            username,
            email,
            password,
            // Make first user admin (or check for specific admin username)
            isAdmin: username.toLowerCase() === 'admin' || (await User.countDocuments()) === 0
        });

        await user.save();

        // Generate token and set cookie
        const token = generateToken(user._id);
        setTokenCookie(res, token);

        console.log('✅ User registered successfully:', user.username);

        res.status(201).json({
            message: 'User registered successfully',
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                isAdmin: user.isAdmin
            }
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

// POST /api/auth/login
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

        // Generate token and set cookie
        const token = generateToken(user._id);
        setTokenCookie(res, token);

        console.log('✅ User logged in successfully:', user.username);

        res.json({
            message: 'Login successful',
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                isAdmin: user.isAdmin
            }
        });

    } catch (error) {
        console.error('❌ Login error:', error);
        res.status(500).json({ error: 'Login failed. Please try again.' });
    }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
    // Clear the cookie with the same options used to set it
    const isProduction = process.env.NODE_ENV === 'production';
    
    const cookieOptions = {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'strict' : 'lax',
        path: '/'
    };
    
    res.clearCookie('dalma_auth_token', cookieOptions);
    
    res.json({ message: 'Logged out successfully' });
});

// GET /api/auth/me - Get current user - FIXED VERSION
router.get('/me', authMiddleware, async (req, res) => {
    try {
        console.log('👤 /auth/me called for userId:', req.user?.userId);
        
        // Find user without populate first to avoid reference errors
        const user = await User.findById(req.user.userId);
        
        if (!user) {
            console.log('❌ User not found for ID:', req.user.userId);
            return res.status(404).json({ error: 'User not found' });
        }

        // Try to populate likedAssets if they exist, but don't fail if there's an error
        let populatedUser = user;
        try {
            // Only populate if likedAssets field exists and has items
            if (user.likedAssets && user.likedAssets.length > 0) {
                populatedUser = await User.findById(req.user.userId).populate({
                    path: 'likedAssets',
                    match: { isActive: true },
                    options: { sort: { createdAt: -1 } }
                });
            }
        } catch (populateError) {
            console.warn('⚠️ Could not populate likedAssets:', populateError.message);
            // Continue with unpopulated user
        }

        res.json({
            user: {
                id: populatedUser._id,
                username: populatedUser.username,
                email: populatedUser.email,
                isAdmin: populatedUser.isAdmin,
                likedAssets: populatedUser.likedAssets || [],
                generatedModels: populatedUser.generatedModels || []
            }
        });
        
    } catch (error) {
        console.error('❌ Get user error:', error);
        console.error('📍 Stack trace:', error.stack);
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

// GET /api/auth/liked-assets - Get user's liked assets - FIXED VERSION
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

module.exports = router;