// backend/middleware/auth.js
const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    console.log('🔐 Auth middleware - checking authentication');
    
    // Check for token in multiple places
    let token = null;
    
    // 1. Check cookies (web)
    if (req.cookies && req.cookies.token) {
        token = req.cookies.token;
        console.log('🔐 Token from cookie:', !!token);
    }
    
    // 2. Check Authorization header (mobile/Capacitor)
    if (!token && req.headers.authorization) {
        const authHeader = req.headers.authorization;
        if (authHeader.startsWith('Bearer ')) {
            token = authHeader.substring(7);
            console.log('🔐 Token from Authorization header:', !!token);
        }
    }
    
    // 3. Check x-auth-token header (alternative)
    if (!token && req.headers['x-auth-token']) {
        token = req.headers['x-auth-token'];
        console.log('🔐 Token from x-auth-token header:', !!token);
    }
    
    if (!token) {
        console.log('❌ No auth token found in cookies or headers');
        return res.status(401).json({ 
            error: 'Authentication required',
            isAuthenticated: false 
        });
    }
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dalma-ai-secret-key-change-this-in-production');
        req.user = decoded;
        console.log('✅ User authenticated:', decoded.username);
        next();
    } catch (error) {
        console.log('❌ Invalid token:', error.message);
        return res.status(401).json({ 
            error: 'Invalid or expired token',
            isAuthenticated: false 
        });
    }
};