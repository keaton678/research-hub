const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
    constructor() {
        const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../../database/research_hub.db');
        this.db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                console.error('Error opening database:', err.message);
            } else {
                console.log('Connected to SQLite database');
                // Enable foreign keys
                this.db.run('PRAGMA foreign_keys = ON');
            }
        });
    }

    // Helper method to run queries with promises
    run(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ id: this.lastID, changes: this.changes });
                }
            });
        });
    }

    get(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    all(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    // User management methods
    async createUser({ email, fullName, institution, passwordHash, verificationToken, newsletterSubscribed }) {
        const sql = `
            INSERT INTO users (email, full_name, institution, password_hash, verification_token, newsletter_subscribed)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        const result = await this.run(sql, [email, fullName, institution, passwordHash, verificationToken, newsletterSubscribed]);
        return result.id;
    }

    async getUserByEmail(email) {
        const sql = 'SELECT * FROM users WHERE email = ?';
        return await this.get(sql, [email]);
    }

    async getUserById(id) {
        const sql = 'SELECT * FROM users WHERE id = ?';
        return await this.get(sql, [id]);
    }

    async getUserByVerificationToken(token) {
        const sql = 'SELECT * FROM users WHERE verification_token = ?';
        return await this.get(sql, [token]);
    }

    async getUserByResetToken(token) {
        const sql = 'SELECT * FROM users WHERE reset_token = ? AND reset_token_expires > datetime("now")';
        return await this.get(sql, [token]);
    }

    async updateUserLastLogin(userId) {
        const sql = 'UPDATE users SET last_login = datetime("now") WHERE id = ?';
        return await this.run(sql, [userId]);
    }

    async updateUserResetToken(userId, resetToken, expiresAt) {
        const sql = 'UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?';
        return await this.run(sql, [resetToken, expiresAt, userId]);
    }

    async updateUserPassword(userId, passwordHash) {
        const sql = 'UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?';
        return await this.run(sql, [passwordHash, userId]);
    }

    async verifyUserEmail(userId) {
        const sql = 'UPDATE users SET email_verified = 1, verification_token = NULL WHERE id = ?';
        return await this.run(sql, [userId]);
    }

    async updateUserProfile(userId, { fullName, institution }) {
        const sql = 'UPDATE users SET full_name = ?, institution = ? WHERE id = ?';
        return await this.run(sql, [fullName, institution, userId]);
    }

    async deactivateUser(userId) {
        const sql = 'UPDATE users SET is_active = 0 WHERE id = ?';
        return await this.run(sql, [userId]);
    }

    // Session management methods
    async createSession({ userId, sessionToken, expiresAt, ipAddress, userAgent }) {
        const sql = `
            INSERT INTO user_sessions (user_id, session_token, expires_at, ip_address, user_agent)
            VALUES (?, ?, ?, ?, ?)
        `;
        const result = await this.run(sql, [userId, sessionToken, expiresAt, ipAddress, userAgent]);
        return result.id;
    }

    async getSessionByToken(sessionToken) {
        const sql = `
            SELECT s.*, u.email, u.full_name 
            FROM user_sessions s 
            JOIN users u ON s.user_id = u.id 
            WHERE s.session_token = ? AND s.expires_at > datetime("now") AND s.is_active = 1
        `;
        return await this.get(sql, [sessionToken]);
    }

    async invalidateSession(sessionId) {
        const sql = 'UPDATE user_sessions SET is_active = 0 WHERE id = ?';
        return await this.run(sql, [sessionId]);
    }

    async invalidateSessionByToken(sessionToken) {
        const sql = 'UPDATE user_sessions SET is_active = 0 WHERE session_token = ?';
        return await this.run(sql, [sessionToken]);
    }

    async invalidateAllUserSessions(userId) {
        const sql = 'UPDATE user_sessions SET is_active = 0 WHERE user_id = ?';
        return await this.run(sql, [userId]);
    }

    // User preferences methods
    async createUserPreferences(userId) {
        const sql = `
            INSERT INTO user_preferences (user_id)
            VALUES (?)
        `;
        const result = await this.run(sql, [userId]);
        return result.id;
    }

    async getUserPreferences(userId) {
        const sql = 'SELECT * FROM user_preferences WHERE user_id = ?';
        return await this.get(sql, [userId]);
    }

    async updateUserPreferences(userId, preferences) {
        const { theme, emailNotifications, preferredCategories, bookmarkedResources, completedGuides, progressData } = preferences;
        const sql = `
            UPDATE user_preferences 
            SET theme = ?, email_notifications = ?, preferred_categories = ?, 
                bookmarked_resources = ?, completed_guides = ?, progress_data = ?
            WHERE user_id = ?
        `;
        return await this.run(sql, [
            theme, emailNotifications, 
            JSON.stringify(preferredCategories), 
            JSON.stringify(bookmarkedResources),
            JSON.stringify(completedGuides),
            JSON.stringify(progressData),
            userId
        ]);
    }

    // Analytics methods
    async trackPageView({ userId, sessionId, pageUrl, pageTitle, referrer, ipAddress, userAgent, deviceType }) {
        const sql = `
            INSERT INTO page_views (user_id, session_id, page_url, page_title, referrer, ip_address, user_agent, device_type)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const result = await this.run(sql, [userId, sessionId, pageUrl, pageTitle, referrer, ipAddress, userAgent, deviceType]);
        return result.id;
    }

    async trackResourceInteraction({ userId, sessionId, resourceCategory, resourceTitle, interactionType, interactionData, ipAddress }) {
        const sql = `
            INSERT INTO resource_interactions (user_id, session_id, resource_category, resource_title, interaction_type, interaction_data, ip_address)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        const result = await this.run(sql, [userId, sessionId, resourceCategory, resourceTitle, interactionType, JSON.stringify(interactionData), ipAddress]);
        return result.id;
    }

    async trackSearchQuery({ userId, sessionId, query, resultsCount, clickedResult }) {
        const sql = `
            INSERT INTO search_queries (user_id, session_id, query, results_count, clicked_result)
            VALUES (?, ?, ?, ?, ?)
        `;
        const result = await this.run(sql, [userId, sessionId, query, resultsCount, clickedResult]);
        return result.id;
    }

    // Content methods
    async getAllContent(status = 'published') {
        const sql = 'SELECT * FROM content_items WHERE status = ? ORDER BY featured DESC, created_at DESC';
        return await this.all(sql, [status]);
    }

    async getContentBySlug(slug) {
        const sql = 'SELECT * FROM content_items WHERE slug = ? AND status = "published"';
        return await this.get(sql, [slug]);
    }

    async getContentByCategory(category, status = 'published') {
        const sql = 'SELECT * FROM content_items WHERE category = ? AND status = ? ORDER BY created_at DESC';
        return await this.all(sql, [category, status]);
    }

    async incrementContentViewCount(contentId) {
        const sql = 'UPDATE content_items SET view_count = view_count + 1 WHERE id = ?';
        return await this.run(sql, [contentId]);
    }

    // Feedback methods
    async createFeedback({ userId, email, name, subject, message, type }) {
        const sql = `
            INSERT INTO feedback (user_id, email, name, subject, message, type)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        const result = await this.run(sql, [userId, email, name, subject, message, type]);
        return result.id;
    }

    async getAllFeedback(status = null) {
        let sql = 'SELECT * FROM feedback ORDER BY created_at DESC';
        const params = [];
        
        if (status) {
            sql = 'SELECT * FROM feedback WHERE status = ? ORDER BY created_at DESC';
            params.push(status);
        }
        
        return await this.all(sql, params);
    }

    async updateFeedbackStatus(feedbackId, status) {
        const sql = 'UPDATE feedback SET status = ?, responded_at = datetime("now") WHERE id = ?';
        return await this.run(sql, [status, feedbackId]);
    }

    // Analytics aggregation methods
    async getDailyAnalytics(date) {
        const sql = 'SELECT * FROM daily_analytics WHERE date = ?';
        return await this.get(sql, [date]);
    }

    async updateDailyAnalytics(date, analytics) {
        const {
            totalUsers, newUsers, returningUsers, totalPageViews, uniquePageViews,
            avgSessionDuration, bounceRate, topPages, topSearches
        } = analytics;

        const sql = `
            INSERT OR REPLACE INTO daily_analytics 
            (date, total_users, new_users, returning_users, total_page_views, unique_page_views,
             avg_session_duration, bounce_rate, top_pages, top_searches)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        return await this.run(sql, [
            date, totalUsers, newUsers, returningUsers, totalPageViews, uniquePageViews,
            avgSessionDuration, bounceRate, JSON.stringify(topPages), JSON.stringify(topSearches)
        ]);
    }

    // Analytics query methods
    async getPopularContent(days = 7) {
        const sql = `
            SELECT resource_category, resource_title, COUNT(*) as interaction_count
            FROM resource_interactions
            WHERE timestamp >= datetime('now', '-${days} days')
            GROUP BY resource_category, resource_title
            ORDER BY interaction_count DESC
            LIMIT 10
        `;
        return await this.all(sql);
    }

    async getTopSearches(days = 7) {
        const sql = `
            SELECT query, COUNT(*) as search_count
            FROM search_queries
            WHERE timestamp >= datetime('now', '-${days} days')
            GROUP BY query
            ORDER BY search_count DESC
            LIMIT 10
        `;
        return await this.all(sql);
    }

    async getUserStats() {
        const sql = `
            SELECT 
                COUNT(*) as total_users,
                COUNT(CASE WHEN created_at >= datetime('now', '-1 day') THEN 1 END) as new_users_today,
                COUNT(CASE WHEN created_at >= datetime('now', '-7 days') THEN 1 END) as new_users_week,
                COUNT(CASE WHEN last_login >= datetime('now', '-1 day') THEN 1 END) as active_users_today,
                COUNT(CASE WHEN last_login >= datetime('now', '-7 days') THEN 1 END) as active_users_week
            FROM users
            WHERE is_active = 1
        `;
        return await this.get(sql);
    }

    // Close database connection
    close() {
        return new Promise((resolve) => {
            this.db.close((err) => {
                if (err) {
                    console.error('Error closing database:', err.message);
                } else {
                    console.log('Database connection closed');
                }
                resolve();
            });
        });
    }
}

module.exports = Database;
