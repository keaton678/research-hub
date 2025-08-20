const express = require('express');
const { query, param, validationResult } = require('express-validator');
const Database = require('../utils/database');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();
const db = new Database();

// Get all published content
router.get('/', [
    query('category').optional().isString(),
    query('featured').optional().isBoolean(),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('offset').optional().isInt({ min: 0 }),
], optionalAuth, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array(),
            });
        }

        const { category, featured, limit = 50, offset = 0 } = req.query;

        let sql = 'SELECT * FROM content_items WHERE status = "published"';
        const params = [];

        if (category) {
            sql += ' AND category = ?';
            params.push(category);
        }

        if (featured !== undefined) {
            sql += ' AND featured = ?';
            params.push(featured ? 1 : 0);
        }

        sql += ' ORDER BY featured DESC, created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const content = await db.all(sql, params);

        // Get total count for pagination
        let countSql = 'SELECT COUNT(*) as total FROM content_items WHERE status = "published"';
        const countParams = [];

        if (category) {
            countSql += ' AND category = ?';
            countParams.push(category);
        }

        if (featured !== undefined) {
            countSql += ' AND featured = ?';
            countParams.push(featured ? 1 : 0);
        }

        const { total } = await db.get(countSql, countParams);

        res.json({
            content,
            pagination: {
                total,
                limit: parseInt(limit),
                offset: parseInt(offset),
                hasMore: parseInt(offset) + parseInt(limit) < total,
            },
        });

    } catch (error) {
        console.error('Get content error:', error);
        res.status(500).json({
            error: 'Failed to get content',
            message: error.message,
        });
    }
});

// Get content by slug
router.get('/:slug', [
    param('slug').isSlug().withMessage('Invalid slug format'),
], optionalAuth, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array(),
            });
        }

        const { slug } = req.params;

        const content = await db.getContentBySlug(slug);
        if (!content) {
            return res.status(404).json({
                error: 'Content not found',
            });
        }

        // Increment view count
        await db.incrementContentViewCount(content.id);

        // Track page view if user is authenticated
        if (req.user) {
            const Database = require('../utils/database');
            const dbInstance = new Database();
            
            setImmediate(async () => {
                try {
                    await dbInstance.trackResourceInteraction({
                        userId: req.user.id,
                        sessionId: req.headers['x-session-id'] || `user_${req.user.id}`,
                        resourceCategory: content.category,
                        resourceTitle: content.title,
                        interactionType: 'view',
                        interactionData: { slug },
                        ipAddress: req.ip,
                    });
                } catch (error) {
                    console.error('Failed to track content view:', error);
                }
            });
        }

        res.json({
            content: {
                id: content.id,
                title: content.title,
                category: content.category,
                description: content.description,
                content: content.content,
                slug: content.slug,
                featured: content.featured,
                viewCount: content.view_count + 1, // Include the increment
                publishedAt: content.published_at,
                updatedAt: content.updated_at,
            },
        });

    } catch (error) {
        console.error('Get content by slug error:', error);
        res.status(500).json({
            error: 'Failed to get content',
            message: error.message,
        });
    }
});

// Get content by category
router.get('/category/:category', [
    param('category').isAlpha().withMessage('Category must contain only letters'),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('offset').optional().isInt({ min: 0 }),
], optionalAuth, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array(),
            });
        }

        const { category } = req.params;
        const { limit = 20, offset = 0 } = req.query;

        const content = await db.getContentByCategory(category, 'published');

        // Apply pagination
        const paginatedContent = content.slice(parseInt(offset), parseInt(offset) + parseInt(limit));

        res.json({
            category,
            content: paginatedContent,
            pagination: {
                total: content.length,
                limit: parseInt(limit),
                offset: parseInt(offset),
                hasMore: parseInt(offset) + parseInt(limit) < content.length,
            },
        });

    } catch (error) {
        console.error('Get content by category error:', error);
        res.status(500).json({
            error: 'Failed to get content by category',
            message: error.message,
        });
    }
});

// Get available categories
router.get('/meta/categories', async (req, res) => {
    try {
        const categories = await db.all(`
            SELECT 
                category,
                COUNT(*) as count,
                MAX(updated_at) as last_updated
            FROM content_items 
            WHERE status = 'published'
            GROUP BY category
            ORDER BY count DESC
        `);

        res.json({
            categories,
        });

    } catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json({
            error: 'Failed to get categories',
            message: error.message,
        });
    }
});

// Search content
router.get('/search', [
    query('q').notEmpty().withMessage('Search query is required'),
    query('category').optional().isString(),
    query('limit').optional().isInt({ min: 1, max: 100 }),
], optionalAuth, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array(),
            });
        }

        const { q: query, category, limit = 20 } = req.query;

        let sql = `
            SELECT *, 
            (CASE 
                WHEN title LIKE ? THEN 10
                WHEN description LIKE ? THEN 5
                WHEN content LIKE ? THEN 1
                ELSE 0
            END) as relevance_score
            FROM content_items 
            WHERE status = 'published' 
            AND (title LIKE ? OR description LIKE ? OR content LIKE ?)
        `;
        
        const searchTerm = `%${query}%`;
        const params = [searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm];

        if (category) {
            sql += ' AND category = ?';
            params.push(category);
        }

        sql += ' ORDER BY relevance_score DESC, featured DESC, view_count DESC LIMIT ?';
        params.push(parseInt(limit));

        const results = await db.all(sql, params);

        // Track search query if user is authenticated
        if (req.user) {
            const Database = require('../utils/database');
            const dbInstance = new Database();
            
            setImmediate(async () => {
                try {
                    await dbInstance.trackSearchQuery({
                        userId: req.user.id,
                        sessionId: req.headers['x-session-id'] || `user_${req.user.id}`,
                        query,
                        resultsCount: results.length,
                        clickedResult: null,
                    });
                } catch (error) {
                    console.error('Failed to track search:', error);
                }
            });
        }

        res.json({
            query,
            results: results.map(item => ({
                id: item.id,
                title: item.title,
                category: item.category,
                description: item.description,
                slug: item.slug,
                featured: item.featured,
                viewCount: item.view_count,
                relevanceScore: item.relevance_score,
                publishedAt: item.published_at,
            })),
            total: results.length,
        });

    } catch (error) {
        console.error('Search content error:', error);
        res.status(500).json({
            error: 'Failed to search content',
            message: error.message,
        });
    }
});

module.exports = router;
