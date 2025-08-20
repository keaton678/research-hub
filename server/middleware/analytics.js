const Database = require('../utils/database');
const { v4: uuidv4 } = require('uuid');

const db = new Database();

// Device type detection
function getDeviceType(userAgent) {
    if (!userAgent) return 'unknown';
    
    const ua = userAgent.toLowerCase();
    
    if (/tablet|ipad|playbook|silk/.test(ua)) {
        return 'tablet';
    }
    
    if (/mobile|iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/.test(ua)) {
        return 'mobile';
    }
    
    return 'desktop';
}

// Generate session ID for anonymous users
function getSessionId(req) {
    if (req.user) {
        return `user_${req.user.id}`;
    }
    
    // Generate or retrieve anonymous session ID from cookies/headers
    let sessionId = req.headers['x-session-id'];
    if (!sessionId) {
        sessionId = uuidv4();
    }
    
    return sessionId;
}

// Middleware to track page views
const trackPageView = async (req, res, next) => {
    // Only track GET requests to HTML pages
    if (req.method !== 'GET' || req.path.startsWith('/api/') || req.path.includes('.')) {
        return next();
    }

    try {
        const sessionId = getSessionId(req);
        const deviceType = getDeviceType(req.get('User-Agent'));
        
        // Track page view asynchronously (don't block the response)
        setImmediate(async () => {
            try {
                await db.trackPageView({
                    userId: req.user?.id || null,
                    sessionId,
                    pageUrl: req.originalUrl,
                    pageTitle: getPageTitle(req.path),
                    referrer: req.get('Referer') || null,
                    ipAddress: req.ip,
                    userAgent: req.get('User-Agent'),
                    deviceType,
                });
            } catch (error) {
                console.error('Failed to track page view:', error);
            }
        });

        // Add session ID to response headers for frontend tracking
        res.set('X-Session-ID', sessionId);
        
    } catch (error) {
        console.error('Page view tracking error:', error);
    }

    next();
};

// Get page title based on path
function getPageTitle(path) {
    const titleMap = {
        '/': 'Research Junkie - Home',
        '/login': 'Sign In - Research Junkie',
        '/signup': 'Sign Up - Research Junkie',
        '/profile': 'Profile - Research Junkie',
        '/dashboard': 'Dashboard - Research Junkie',
        '/guides': 'Guides - Research Junkie',
        '/resources': 'Resources - Research Junkie',
        '/about': 'About - Research Junkie',
        '/contact': 'Contact - Research Junkie',
        '/privacy': 'Privacy Policy - Research Junkie',
        '/terms': 'Terms of Service - Research Junkie',
    };

    return titleMap[path] || `Research Junkie - ${path}`;
}

// Track resource interactions (clicks, expansions, etc.)
const trackInteraction = async (req, res, next) => {
    try {
        const {
            resourceCategory,
            resourceTitle,
            interactionType,
            interactionData
        } = req.body;

        const sessionId = getSessionId(req);

        await db.trackResourceInteraction({
            userId: req.user?.id || null,
            sessionId,
            resourceCategory,
            resourceTitle,
            interactionType,
            interactionData,
            ipAddress: req.ip,
        });

        res.json({ success: true });

    } catch (error) {
        console.error('Interaction tracking error:', error);
        res.status(500).json({ error: 'Failed to track interaction' });
    }
};

// Track search queries
const trackSearch = async (req, res, next) => {
    try {
        const { query, resultsCount, clickedResult } = req.body;

        const sessionId = getSessionId(req);

        await db.trackSearchQuery({
            userId: req.user?.id || null,
            sessionId,
            query,
            resultsCount,
            clickedResult,
        });

        res.json({ success: true });

    } catch (error) {
        console.error('Search tracking error:', error);
        res.status(500).json({ error: 'Failed to track search' });
    }
};

// Get analytics dashboard data
const getDashboardData = async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 7;

        const [
            userStats,
            popularContent,
            topSearches,
        ] = await Promise.all([
            db.getUserStats(),
            db.getPopularContent(days),
            db.getTopSearches(days),
        ]);

        // Get page view trends
        const pageViewTrends = await db.all(`
            SELECT 
                DATE(timestamp) as date,
                COUNT(*) as views,
                COUNT(DISTINCT user_id) as unique_users
            FROM page_views
            WHERE timestamp >= datetime('now', '-${days} days')
            GROUP BY DATE(timestamp)
            ORDER BY date DESC
        `);

        res.json({
            userStats,
            popularContent,
            topSearches,
            pageViewTrends,
            period: `${days} days`,
        });

    } catch (error) {
        console.error('Dashboard data error:', error);
        res.status(500).json({ error: 'Failed to get dashboard data' });
    }
};

// Aggregate daily analytics (run as a scheduled job)
const aggregateDailyAnalytics = async (date = null) => {
    try {
        const targetDate = date || new Date().toISOString().split('T')[0];
        
        // Get daily metrics
        const metrics = await db.get(`
            SELECT 
                COUNT(DISTINCT user_id) as total_users,
                COUNT(DISTINCT CASE WHEN u.created_at >= ? THEN user_id END) as new_users,
                COUNT(DISTINCT CASE WHEN u.created_at < ? THEN user_id END) as returning_users,
                COUNT(*) as total_page_views,
                COUNT(DISTINCT user_id || page_url) as unique_page_views,
                AVG(time_on_page) as avg_session_duration
            FROM page_views pv
            LEFT JOIN users u ON pv.user_id = u.id
            WHERE DATE(pv.timestamp) = ?
        `, [targetDate, targetDate, targetDate]);

        // Get bounce rate (single page sessions)
        const bounceRate = await db.get(`
            SELECT 
                CAST(single_page_sessions AS FLOAT) / CAST(total_sessions AS FLOAT) * 100 as bounce_rate
            FROM (
                SELECT 
                    COUNT(CASE WHEN page_count = 1 THEN 1 END) as single_page_sessions,
                    COUNT(*) as total_sessions
                FROM (
                    SELECT session_id, COUNT(*) as page_count
                    FROM page_views
                    WHERE DATE(timestamp) = ?
                    GROUP BY session_id
                ) session_stats
            )
        `, [targetDate]);

        // Get top pages
        const topPages = await db.all(`
            SELECT page_url, COUNT(*) as views
            FROM page_views
            WHERE DATE(timestamp) = ?
            GROUP BY page_url
            ORDER BY views DESC
            LIMIT 10
        `, [targetDate]);

        // Get top searches
        const topSearches = await db.all(`
            SELECT query, COUNT(*) as count
            FROM search_queries
            WHERE DATE(timestamp) = ?
            GROUP BY query
            ORDER BY count DESC
            LIMIT 10
        `, [targetDate]);

        // Save aggregated data
        await db.updateDailyAnalytics(targetDate, {
            totalUsers: metrics?.total_users || 0,
            newUsers: metrics?.new_users || 0,
            returningUsers: metrics?.returning_users || 0,
            totalPageViews: metrics?.total_page_views || 0,
            uniquePageViews: metrics?.unique_page_views || 0,
            avgSessionDuration: metrics?.avg_session_duration || 0,
            bounceRate: bounceRate?.bounce_rate || 0,
            topPages,
            topSearches,
        });

        console.log(`Daily analytics aggregated for ${targetDate}`);

    } catch (error) {
        console.error('Daily analytics aggregation error:', error);
    }
};

module.exports = {
    trackPageView,
    trackInteraction,
    trackSearch,
    getDashboardData,
    aggregateDailyAnalytics,
    getSessionId,
    getDeviceType,
};
