const jwt = require('jsonwebtoken');
const Database = require('../utils/database');

const db = new Database();

// Middleware to authenticate JWT tokens
const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (!token) {
            return res.status(401).json({
                error: 'Access token required',
            });
        }

        // Verify JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Get user from database
        const user = await db.getUserById(decoded.userId);
        if (!user || !user.is_active) {
            return res.status(401).json({
                error: 'Invalid or inactive user',
            });
        }

        // Check if email is verified (if verification is enabled)
        if (process.env.ENABLE_EMAIL_VERIFICATION === 'true' && !user.email_verified) {
            return res.status(401).json({
                error: 'Email verification required',
                requiresVerification: true,
            });
        }

        // Attach user to request object
        req.user = {
            id: user.id,
            email: user.email,
            fullName: user.full_name,
            institution: user.institution,
            emailVerified: user.email_verified,
            createdAt: user.created_at,
        };

        next();

    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                error: 'Invalid access token',
            });
        } else if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                error: 'Access token expired',
                expired: true,
            });
        } else {
            console.error('Authentication error:', error);
            return res.status(500).json({
                error: 'Authentication failed',
            });
        }
    }
};

// Optional authentication - doesn't fail if no token provided
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return next(); // Continue without authentication
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await db.getUserById(decoded.userId);

        if (user && user.is_active) {
            req.user = {
                id: user.id,
                email: user.email,
                fullName: user.full_name,
                institution: user.institution,
                emailVerified: user.email_verified,
                createdAt: user.created_at,
            };
        }

        next();

    } catch (error) {
        // Continue without authentication on any error
        next();
    }
};

// Admin role check middleware
const requireAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            error: 'Authentication required',
        });
    }

    // For now, check if user email contains 'admin' or is in admin list
    // In production, you'd have a proper role system
    const adminEmails = (process.env.ADMIN_EMAILS || '').split(',');
    const isAdmin = adminEmails.includes(req.user.email) || req.user.email.includes('admin');

    if (!isAdmin) {
        return res.status(403).json({
            error: 'Admin access required',
        });
    }

    next();
};

// Rate limiting for authentication endpoints
const authRateLimit = (maxAttempts = 5, windowMs = 15 * 60 * 1000) => {
    const attempts = new Map();

    return (req, res, next) => {
        const key = req.ip;
        const now = Date.now();
        const windowStart = now - windowMs;

        // Clean old attempts
        const userAttempts = attempts.get(key) || [];
        const recentAttempts = userAttempts.filter(time => time > windowStart);

        if (recentAttempts.length >= maxAttempts) {
            const oldestAttempt = Math.min(...recentAttempts);
            const timeUntilReset = Math.ceil((oldestAttempt + windowMs - now) / 1000);

            return res.status(429).json({
                error: 'Too many authentication attempts',
                retryAfter: timeUntilReset,
            });
        }

        // Record this attempt
        recentAttempts.push(now);
        attempts.set(key, recentAttempts);

        next();
    };
};

// Validate session token (alternative to JWT)
const validateSession = async (req, res, next) => {
    try {
        const sessionToken = req.headers['x-session-token'] || req.cookies?.sessionToken;

        if (!sessionToken) {
            return res.status(401).json({
                error: 'Session token required',
            });
        }

        const session = await db.getSessionByToken(sessionToken);
        if (!session) {
            return res.status(401).json({
                error: 'Invalid or expired session',
            });
        }

        req.user = {
            id: session.user_id,
            email: session.email,
            fullName: session.full_name,
            sessionId: session.id,
        };

        req.sessionToken = sessionToken;
        next();

    } catch (error) {
        console.error('Session validation error:', error);
        return res.status(500).json({
            error: 'Session validation failed',
        });
    }
};

// Middleware to check if user can access resource
const checkResourceAccess = (resourceType) => {
    return async (req, res, next) => {
        try {
            // For now, all authenticated users can access all resources
            // In the future, you might have premium content, institution-specific content, etc.
            
            if (!req.user) {
                return res.status(401).json({
                    error: 'Authentication required to access this resource',
                });
            }

            // Add resource access logic here based on user's subscription, institution, etc.
            // Example:
            // if (resourceType === 'premium' && !req.user.isPremium) {
            //     return res.status(403).json({
            //         error: 'Premium subscription required',
            //     });
            // }

            next();

        } catch (error) {
            console.error('Resource access check error:', error);
            return res.status(500).json({
                error: 'Access check failed',
            });
        }
    };
};

module.exports = {
    authenticateToken,
    optionalAuth,
    requireAdmin,
    authRateLimit,
    validateSession,
    checkResourceAccess,
};
