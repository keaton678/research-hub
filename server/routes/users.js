const express = require('express');
const { body, validationResult } = require('express-validator');
const Database = require('../utils/database');

const router = express.Router();
const db = new Database();

// Get user profile
router.get('/profile', async (req, res) => {
    try {
        const user = await db.getUserById(req.user.id);
        if (!user) {
            return res.status(404).json({
                error: 'User not found',
            });
        }

        // Return user data without sensitive information
        const userData = {
            id: user.id,
            email: user.email,
            fullName: user.full_name,
            institution: user.institution,
            emailVerified: user.email_verified,
            newsletterSubscribed: user.newsletter_subscribed,
            createdAt: user.created_at,
            lastLogin: user.last_login,
        };

        res.json({
            user: userData,
        });

    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            error: 'Failed to get user profile',
            message: error.message,
        });
    }
});

// Update user profile
router.put('/profile', [
    body('fullName').optional().isLength({ min: 2, max: 100 }).trim().withMessage('Full name must be 2-100 characters'),
    body('institution').optional().isLength({ max: 255 }).trim(),
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array(),
            });
        }

        const { fullName, institution } = req.body;

        await db.updateUserProfile(req.user.id, {
            fullName: fullName || req.user.fullName,
            institution: institution !== undefined ? institution : null,
        });

        // Get updated user data
        const updatedUser = await db.getUserById(req.user.id);
        const userData = {
            id: updatedUser.id,
            email: updatedUser.email,
            fullName: updatedUser.full_name,
            institution: updatedUser.institution,
            emailVerified: updatedUser.email_verified,
            newsletterSubscribed: updatedUser.newsletter_subscribed,
            createdAt: updatedUser.created_at,
            lastLogin: updatedUser.last_login,
        };

        res.json({
            message: 'Profile updated successfully',
            user: userData,
        });

    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            error: 'Failed to update profile',
            message: error.message,
        });
    }
});

// Get user preferences
router.get('/preferences', async (req, res) => {
    try {
        const preferences = await db.getUserPreferences(req.user.id);
        
        if (!preferences) {
            // Create default preferences if they don't exist
            await db.createUserPreferences(req.user.id);
            const newPreferences = await db.getUserPreferences(req.user.id);
            
            return res.json({
                preferences: {
                    theme: newPreferences.theme,
                    emailNotifications: newPreferences.email_notifications,
                    preferredCategories: JSON.parse(newPreferences.preferred_categories || '[]'),
                    bookmarkedResources: JSON.parse(newPreferences.bookmarked_resources || '[]'),
                    completedGuides: JSON.parse(newPreferences.completed_guides || '[]'),
                    progressData: JSON.parse(newPreferences.progress_data || '{}'),
                },
            });
        }

        res.json({
            preferences: {
                theme: preferences.theme,
                emailNotifications: preferences.email_notifications,
                preferredCategories: JSON.parse(preferences.preferred_categories || '[]'),
                bookmarkedResources: JSON.parse(preferences.bookmarked_resources || '[]'),
                completedGuides: JSON.parse(preferences.completed_guides || '[]'),
                progressData: JSON.parse(preferences.progress_data || '{}'),
            },
        });

    } catch (error) {
        console.error('Get preferences error:', error);
        res.status(500).json({
            error: 'Failed to get user preferences',
            message: error.message,
        });
    }
});

// Update user preferences
router.put('/preferences', [
    body('theme').optional().isIn(['dark', 'light']).withMessage('Theme must be dark or light'),
    body('emailNotifications').optional().isBoolean().withMessage('Email notifications must be boolean'),
    body('preferredCategories').optional().isArray().withMessage('Preferred categories must be an array'),
    body('bookmarkedResources').optional().isArray().withMessage('Bookmarked resources must be an array'),
    body('completedGuides').optional().isArray().withMessage('Completed guides must be an array'),
    body('progressData').optional().isObject().withMessage('Progress data must be an object'),
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array(),
            });
        }

        const {
            theme,
            emailNotifications,
            preferredCategories,
            bookmarkedResources,
            completedGuides,
            progressData
        } = req.body;

        // Get current preferences
        const currentPrefs = await db.getUserPreferences(req.user.id);
        if (!currentPrefs) {
            await db.createUserPreferences(req.user.id);
        }

        // Update preferences
        await db.updateUserPreferences(req.user.id, {
            theme: theme !== undefined ? theme : currentPrefs?.theme || 'dark',
            emailNotifications: emailNotifications !== undefined ? emailNotifications : currentPrefs?.email_notifications || true,
            preferredCategories: preferredCategories || JSON.parse(currentPrefs?.preferred_categories || '[]'),
            bookmarkedResources: bookmarkedResources || JSON.parse(currentPrefs?.bookmarked_resources || '[]'),
            completedGuides: completedGuides || JSON.parse(currentPrefs?.completed_guides || '[]'),
            progressData: progressData || JSON.parse(currentPrefs?.progress_data || '{}'),
        });

        res.json({
            message: 'Preferences updated successfully',
        });

    } catch (error) {
        console.error('Update preferences error:', error);
        res.status(500).json({
            error: 'Failed to update preferences',
            message: error.message,
        });
    }
});

// Export user data (GDPR compliance)
router.get('/export', async (req, res) => {
    try {
        const [user, preferences, sessions, pageViews, interactions, searches] = await Promise.all([
            db.getUserById(req.user.id),
            db.getUserPreferences(req.user.id),
            db.all('SELECT * FROM user_sessions WHERE user_id = ?', [req.user.id]),
            db.all('SELECT * FROM page_views WHERE user_id = ?', [req.user.id]),
            db.all('SELECT * FROM resource_interactions WHERE user_id = ?', [req.user.id]),
            db.all('SELECT * FROM search_queries WHERE user_id = ?', [req.user.id]),
        ]);

        const exportData = {
            user: {
                id: user.id,
                email: user.email,
                fullName: user.full_name,
                institution: user.institution,
                emailVerified: user.email_verified,
                newsletterSubscribed: user.newsletter_subscribed,
                createdAt: user.created_at,
                lastLogin: user.last_login,
            },
            preferences,
            sessions: sessions.map(s => ({
                created: s.created_at,
                ipAddress: s.ip_address,
                userAgent: s.user_agent,
                isActive: s.is_active,
            })),
            analytics: {
                pageViews: pageViews.length,
                interactions: interactions.length,
                searches: searches.length,
            },
            exportedAt: new Date().toISOString(),
        };

        res.json({
            message: 'User data exported successfully',
            data: exportData,
        });

    } catch (error) {
        console.error('Export user data error:', error);
        res.status(500).json({
            error: 'Failed to export user data',
            message: error.message,
        });
    }
});

// Delete user account (GDPR compliance)
router.delete('/account', [
    body('confirmEmail').isEmail().withMessage('Email confirmation required'),
    body('password').notEmpty().withMessage('Password confirmation required'),
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array(),
            });
        }

        const { confirmEmail, password } = req.body;

        // Verify email matches
        if (confirmEmail !== req.user.email) {
            return res.status(400).json({
                error: 'Email confirmation does not match account email',
            });
        }

        // Verify password
        const user = await db.getUserById(req.user.id);
        const bcrypt = require('bcryptjs');
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        
        if (!isValidPassword) {
            return res.status(401).json({
                error: 'Invalid password',
            });
        }

        // Deactivate user account (soft delete)
        await db.deactivateUser(req.user.id);
        
        // Invalidate all sessions
        await db.invalidateAllUserSessions(req.user.id);

        res.json({
            message: 'Account deleted successfully',
        });

    } catch (error) {
        console.error('Delete account error:', error);
        res.status(500).json({
            error: 'Failed to delete account',
            message: error.message,
        });
    }
});

// Get user activity summary
router.get('/activity', async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 30;

        const [pageViews, interactions, searches] = await Promise.all([
            db.all(`
                SELECT DATE(timestamp) as date, COUNT(*) as count
                FROM page_views 
                WHERE user_id = ? AND timestamp >= datetime('now', '-${days} days')
                GROUP BY DATE(timestamp)
                ORDER BY date DESC
            `, [req.user.id]),
            db.all(`
                SELECT resource_category, COUNT(*) as count
                FROM resource_interactions 
                WHERE user_id = ? AND timestamp >= datetime('now', '-${days} days')
                GROUP BY resource_category
                ORDER BY count DESC
            `, [req.user.id]),
            db.all(`
                SELECT query, COUNT(*) as count
                FROM search_queries 
                WHERE user_id = ? AND timestamp >= datetime('now', '-${days} days')
                GROUP BY query
                ORDER BY count DESC
                LIMIT 10
            `, [req.user.id]),
        ]);

        res.json({
            period: `${days} days`,
            activity: {
                pageViews,
                interactions,
                topSearches: searches,
            },
        });

    } catch (error) {
        console.error('Get user activity error:', error);
        res.status(500).json({
            error: 'Failed to get user activity',
            message: error.message,
        });
    }
});

module.exports = router;
