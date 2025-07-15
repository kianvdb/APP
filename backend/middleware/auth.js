const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware to check if user is authenticated
const authMiddleware = async (req, res, next) => {
    try {
        console.log('🔐 Auth middleware - Cookies:', req.cookies);
        console.log('🔐 Auth middleware - Headers:', req.headers);
        
        const token = req.cookies.dalma_auth_token;
        
        if (!token) {
            console.log('❌ No auth token found in cookies');
            return res.status(401).json({ error: 'Authentication required' });
        }

        console.log('🔑 Token found, verifying...');
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dalma-ai-secret-key');
        
        if (!decoded || !decoded.userId) {
            console.log('❌ Invalid token structure');
            return res.status(401).json({ error: 'Invalid token' });
        }

        const user = await User.findById(decoded.userId);
        if (!user || !user.isActive) {
            console.log('❌ User not found or inactive');
            return res.status(401).json({ error: 'User not found' });
        }

        console.log('✅ Auth successful for user:', user.username);

        req.user = {
            userId: user._id,
            username: user.username,
            email: user.email,
            isAdmin: user.isAdmin
        };

        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            console.log('❌ JWT Error:', error.message);
            return res.status(401).json({ error: 'Invalid token' });
        }
        if (error.name === 'TokenExpiredError') {
            console.log('❌ Token expired');
            return res.status(401).json({ error: 'Token expired' });
        }
        
        console.error('❌ Auth middleware error:', error);
        return res.status(500).json({ error: 'Authentication error' });
    }
};

// Middleware to check if user is admin
const adminMiddleware = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (!req.user.isAdmin) {
        return res.status(403).json({ error: 'Admin access required' });
    }
    
    next();
};

// Optional middleware - sets user info if token exists but doesn't require it
const optionalAuthMiddleware = async (req, res, next) => {
    try {
        const token = req.cookies.dalma_auth_token;
        
        if (!token) {
            req.user = null;
            return next();
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dalma-ai-secret-key');
        
        if (!decoded || !decoded.userId) {
            req.user = null;
            return next();
        }

        const user = await User.findById(decoded.userId);
        if (!user || !user.isActive) {
            req.user = null;
            return next();
        }

        req.user = {
            userId: user._id,
            username: user.username,
            email: user.email,
            isAdmin: user.isAdmin
        };

        next();
    } catch (error) {
        // If there's an error with optional auth, just continue without user
        req.user = null;
        next();
    }
};

module.exports = {
    authMiddleware,
    adminMiddleware,
    optionalAuthMiddleware
};