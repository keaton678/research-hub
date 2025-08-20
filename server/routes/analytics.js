const express = require('express');
const { body, validationResult } = require('express-validator');
const { trackInteraction, trackSearch, getDashboardData } = require('../middleware/analytics');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Track user interaction (public endpoint with optional auth)
router.post('/track', [
    body('resourceCategory').notEmpty().withMessage('Resource category is required'),
    body('resourceTitle').notEmpty().withMessage('Resource title is required'),
    body('interactionType').isIn(['view', 'expand', 'click_link', 'bookmark', 'share']).withMessage('Invalid interaction type'),
    body('interactionData').optional().isObject(),
], trackInteraction);

// Track search query (public endpoint with optional auth)
router.post('/search', [
    body('query').notEmpty().withMessage('Search query is required'),
    body('resultsCount').optional().isInt({ min: 0 }),
    body('clickedResult').optional().isString(),
], trackSearch);

// Get analytics dashboard data (admin only)
router.get('/dashboard', requireAdmin, getDashboardData);

// Get public analytics (limited data for transparency)
router.get('/public', async (req, res) => {
    try {
        const Database = require('../utils/database');
        const db = new Database();

        const [userStats, popularContent] = await Promise.all([
            db.getUserStats(),
            db.getPopularContent(30), // Last 30 days
        ]);

        res.json({
            totalUsers: userStats.total_users,
            activeUsersWeek: userStats.active_users_week,
            popularContent: popularContent.slice(0, 5), // Top 5 only
            lastUpdated: new Date().toISOString(),
        });

    } catch (error) {
        console.error('Public analytics error:', error);
        res.status(500).json({
            error: 'Failed to get analytics data',
        });
    }
});

module.exports = router;
