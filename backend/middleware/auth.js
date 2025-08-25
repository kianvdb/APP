/**
 * Authentication Middleware
 * Verifies JWT tokens from multiple sources (cookies, headers)
 */

const jwt = require('jsonwebtoken');

/**
 * Extract JWT token from request
 * @param {Object} req - Express request object
 * @returns {string|null} JWT token or null if not found
 */
const extractToken = (req) => {
    // Check cookies (web browser)
    if (req.cookies && req.cookies.token) {
        console.log('🔐 Token found in cookie');
        return req.cookies.token;
    }
    
    // Check Authorization header (mobile/API)
    if (req.headers.authorization) {
        const authHeader = req.headers.authorization;
        if (authHeader.startsWith('Bearer ')) {
            console.log('🔐 Token found in Authorization header');
            return authHeader.substring(7);
        }
    }
    
    // Check x-auth-token header (alternative)
    if (req.headers['x-auth-token']) {
        console.log('🔐 Token found in x-auth-token header');
        return req.headers['x-auth-token'];
    }
    
    return null;
};

/**
 * Authentication middleware
 * Validates JWT tokens and attaches user data to request
 */
module.exports = (req, res, next) => {
    console.log('🔍 Auth middleware - checking authentication');
    
    // Extract token from request
    const token = extractToken(req);
    
    if (!token) {
        console.log('❌ No auth token found in request');
        return res.status(401).json({ 
            error: 'Authentication required',
            isAuthenticated: false 
        });
    }
    
    try {
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Attach user data to request
        req.user = decoded;
        console.log('✅ User authenticated:', decoded.username);
        
        next();
    } catch (error) {
        console.log('❌ Invalid token:', error.message);
        
        // Determine specific error type
        let errorMessage = 'Invalid or expired token';
        if (error.name === 'TokenExpiredError') {
            errorMessage = 'Token has expired';
        } else if (error.name === 'JsonWebTokenError') {
            errorMessage = 'Invalid token';
        }
        
        return res.status(401).json({ 
            error: errorMessage,
            isAuthenticated: false 
        });
    }
};