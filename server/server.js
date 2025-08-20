const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

// Import route handlers
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const analyticsRoutes = require('./routes/analytics');
const contentRoutes = require('./routes/content');
const feedbackRoutes = require('./routes/feedback');

// Import middleware
const { authenticateToken } = require('./middleware/auth');
const { trackPageView } = require('./middleware/analytics');

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
        },
    },
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
    message: {
        error: 'Too many requests from this IP, please try again later.',
    },
    standardHeaders: true,
    legacyHeaders: false,
});

app.use(limiter);

// Compression and logging
app.use(compression());
app.use(morgan('combined'));

// CORS configuration
const corsOptions = {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files from frontend
app.use(express.static(path.join(__dirname, '../')));

// Analytics middleware for page views
app.use(trackPageView);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', authenticateToken, userRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/feedback', feedbackRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
    });
});

// API documentation endpoint
app.get('/api/docs', (req, res) => {
    res.json({
        name: 'Research Junkie API',
        version: '1.0.0',
        description: 'Backend API for Medical Research Learning Platform',
        endpoints: {
            auth: {
                'POST /api/auth/register': 'Register new user',
                'POST /api/auth/login': 'Login user',
                'POST /api/auth/logout': 'Logout user',
                'POST /api/auth/refresh': 'Refresh access token',
                'POST /api/auth/forgot-password': 'Request password reset',
                'POST /api/auth/reset-password': 'Reset password with token',
                'POST /api/auth/verify-email': 'Verify email address',
            },
            users: {
                'GET /api/users/profile': 'Get user profile',
                'PUT /api/users/profile': 'Update user profile',
                'GET /api/users/preferences': 'Get user preferences',
                'PUT /api/users/preferences': 'Update user preferences',
                'DELETE /api/users/account': 'Delete user account',
            },
            analytics: {
                'POST /api/analytics/track': 'Track user interaction',
                'POST /api/analytics/search': 'Track search query',
                'GET /api/analytics/dashboard': 'Get analytics dashboard data',
            },
            content: {
                'GET /api/content': 'Get all content items',
                'GET /api/content/:slug': 'Get content item by slug',
                'GET /api/content/category/:category': 'Get content by category',
            },
            feedback: {
                'POST /api/feedback': 'Submit feedback',
                'GET /api/feedback': 'Get feedback (admin only)',
            },
        },
    });
});

// Serve frontend pages
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../login.html'));
});

app.get('/signup', (req, res) => {
    res.sendFile(path.join(__dirname, '../signup.html'));
});

// Handle 404 for API routes
app.use('/api/*', (req, res) => {
    res.status(404).json({
        error: 'API endpoint not found',
        path: req.path,
        method: req.method,
    });
});

// Serve frontend for all other routes (SPA support)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../index.html'));
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    
    // Don't leak error details in production
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    res.status(err.status || 500).json({
        error: isDevelopment ? err.message : 'Internal server error',
        ...(isDevelopment && { stack: err.stack }),
    });
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    process.exit(0);
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Research Junkie API server running on port ${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🏠 Frontend Website: http://localhost:${PORT}/`);
    console.log(`🌐 API Documentation: http://localhost:${PORT}/api/docs`);
    console.log(`❤️  Health Check: http://localhost:${PORT}/api/health`);
});

module.exports = app;
