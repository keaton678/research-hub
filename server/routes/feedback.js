const express = require('express');
const { body, query, validationResult } = require('express-validator');
const Database = require('../utils/database');
const { optionalAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();
const db = new Database();

// Submit feedback (public endpoint with optional auth)
router.post('/', [
    body('email').optional().isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('name').optional().isLength({ min: 2, max: 100 }).trim().withMessage('Name must be 2-100 characters'),
    body('subject').isLength({ min: 5, max: 255 }).trim().withMessage('Subject must be 5-255 characters'),
    body('message').isLength({ min: 10, max: 2000 }).trim().withMessage('Message must be 10-2000 characters'),
    body('type').optional().isIn(['general', 'bug', 'feature_request', 'content_suggestion']).withMessage('Invalid feedback type'),
], optionalAuth, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array(),
            });
        }

        const { email, name, subject, message, type = 'general' } = req.body;

        // If user is authenticated, use their info, otherwise require email/name
        let feedbackEmail = email;
        let feedbackName = name;

        if (req.user) {
            feedbackEmail = req.user.email;
            feedbackName = req.user.fullName;
        } else {
            if (!email || !name) {
                return res.status(400).json({
                    error: 'Email and name are required for anonymous feedback',
                });
            }
        }

        const feedbackId = await db.createFeedback({
            userId: req.user?.id || null,
            email: feedbackEmail,
            name: feedbackName,
            subject,
            message,
            type,
        });

        // Send notification email to admins (if configured)
        try {
            const { sendEmail } = require('../utils/email');
            const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').filter(Boolean);
            
            if (adminEmails.length > 0) {
                for (const adminEmail of adminEmails) {
                    await sendEmail({
                        to: adminEmail,
                        subject: `New Research Hub Feedback: ${subject}`,
                        html: `
                            <h3>New Feedback Received</h3>
                            <p><strong>From:</strong> ${feedbackName} (${feedbackEmail})</p>
                            <p><strong>Type:</strong> ${type}</p>
                            <p><strong>Subject:</strong> ${subject}</p>
                            <div style="background: #f5f5f5; padding: 1rem; margin: 1rem 0; border-left: 4px solid #64ffda;">
                                ${message.replace(/\n/g, '<br>')}
                            </div>
                            <p><strong>Submitted:</strong> ${new Date().toISOString()}</p>
                            ${req.user ? `<p><strong>User ID:</strong> ${req.user.id}</p>` : '<p><em>Anonymous submission</em></p>'}
                        `,
                        text: `
New Feedback Received

From: ${feedbackName} (${feedbackEmail})
Type: ${type}
Subject: ${subject}

Message:
${message}

Submitted: ${new Date().toISOString()}
${req.user ? `User ID: ${req.user.id}` : 'Anonymous submission'}
                        `
                    });
                }
            }
        } catch (emailError) {
            console.error('Failed to send feedback notification email:', emailError);
            // Don't fail the feedback submission if email fails
        }

        res.status(201).json({
            message: 'Feedback submitted successfully',
            feedbackId,
        });

    } catch (error) {
        console.error('Submit feedback error:', error);
        res.status(500).json({
            error: 'Failed to submit feedback',
            message: error.message,
        });
    }
});

// Get all feedback (admin only)
router.get('/', [
    query('status').optional().isIn(['new', 'in_progress', 'resolved', 'closed']),
    query('type').optional().isIn(['general', 'bug', 'feature_request', 'content_suggestion']),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('offset').optional().isInt({ min: 0 }),
], requireAdmin, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array(),
            });
        }

        const { status, type, limit = 50, offset = 0 } = req.query;

        let sql = 'SELECT * FROM feedback WHERE 1=1';
        const params = [];

        if (status) {
            sql += ' AND status = ?';
            params.push(status);
        }

        if (type) {
            sql += ' AND type = ?';
            params.push(type);
        }

        sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const feedback = await db.all(sql, params);

        // Get total count
        let countSql = 'SELECT COUNT(*) as total FROM feedback WHERE 1=1';
        const countParams = [];

        if (status) {
            countSql += ' AND status = ?';
            countParams.push(status);
        }

        if (type) {
            countSql += ' AND type = ?';
            countParams.push(type);
        }

        const { total } = await db.get(countSql, countParams);

        res.json({
            feedback,
            pagination: {
                total,
                limit: parseInt(limit),
                offset: parseInt(offset),
                hasMore: parseInt(offset) + parseInt(limit) < total,
            },
        });

    } catch (error) {
        console.error('Get feedback error:', error);
        res.status(500).json({
            error: 'Failed to get feedback',
            message: error.message,
        });
    }
});

// Update feedback status (admin only)
router.put('/:id/status', [
    body('status').isIn(['new', 'in_progress', 'resolved', 'closed']).withMessage('Invalid status'),
], requireAdmin, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array(),
            });
        }

        const { id } = req.params;
        const { status } = req.body;

        await db.updateFeedbackStatus(id, status);

        res.json({
            message: 'Feedback status updated successfully',
        });

    } catch (error) {
        console.error('Update feedback status error:', error);
        res.status(500).json({
            error: 'Failed to update feedback status',
            message: error.message,
        });
    }
});

// Get feedback statistics (admin only)
router.get('/stats', requireAdmin, async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 30;

        const stats = await db.get(`
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN status = 'new' THEN 1 END) as new_count,
                COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_count,
                COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved_count,
                COUNT(CASE WHEN status = 'closed' THEN 1 END) as closed_count,
                COUNT(CASE WHEN created_at >= datetime('now', '-${days} days') THEN 1 END) as recent_count
            FROM feedback
        `);

        const typeStats = await db.all(`
            SELECT type, COUNT(*) as count
            FROM feedback
            WHERE created_at >= datetime('now', '-${days} days')
            GROUP BY type
            ORDER BY count DESC
        `);

        const dailyStats = await db.all(`
            SELECT 
                DATE(created_at) as date,
                COUNT(*) as count
            FROM feedback
            WHERE created_at >= datetime('now', '-${days} days')
            GROUP BY DATE(created_at)
            ORDER BY date DESC
        `);

        res.json({
            period: `${days} days`,
            overview: stats,
            byType: typeStats,
            daily: dailyStats,
        });

    } catch (error) {
        console.error('Get feedback stats error:', error);
        res.status(500).json({
            error: 'Failed to get feedback statistics',
            message: error.message,
        });
    }
});

module.exports = router;
