-- Research Hub Database Schema
-- SQLite database for user management and analytics

-- Users table for authentication and profile data
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    institution VARCHAR(255),
    password_hash VARCHAR(255) NOT NULL,
    email_verified BOOLEAN DEFAULT FALSE,
    verification_token VARCHAR(255),
    reset_token VARCHAR(255),
    reset_token_expires DATETIME,
    newsletter_subscribed BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME,
    is_active BOOLEAN DEFAULT TRUE
);

-- User sessions for authentication management
CREATE TABLE IF NOT EXISTS user_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45),
    user_agent TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Page views and navigation tracking
CREATE TABLE IF NOT EXISTS page_views (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    session_id VARCHAR(255),
    page_url VARCHAR(500) NOT NULL,
    page_title VARCHAR(255),
    referrer VARCHAR(500),
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    time_on_page INTEGER, -- seconds
    ip_address VARCHAR(45),
    user_agent TEXT,
    device_type VARCHAR(50), -- mobile, tablet, desktop
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Resource interactions (card clicks, expansions, link clicks)
CREATE TABLE IF NOT EXISTS resource_interactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    session_id VARCHAR(255),
    resource_category VARCHAR(100), -- literature, methodology, statistics, etc.
    resource_title VARCHAR(255),
    interaction_type VARCHAR(50), -- view, expand, click_link, search
    interaction_data TEXT, -- JSON for additional data like search terms, link clicked
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Search queries and results
CREATE TABLE IF NOT EXISTS search_queries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    session_id VARCHAR(255),
    query TEXT NOT NULL,
    results_count INTEGER,
    clicked_result VARCHAR(255), -- which resource was clicked from search
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- User preferences and settings
CREATE TABLE IF NOT EXISTS user_preferences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE NOT NULL,
    theme VARCHAR(20) DEFAULT 'dark',
    email_notifications BOOLEAN DEFAULT TRUE,
    preferred_categories TEXT, -- JSON array of preferred resource categories
    bookmarked_resources TEXT, -- JSON array of bookmarked resource IDs
    completed_guides TEXT, -- JSON array of completed guide IDs
    progress_data TEXT, -- JSON for tracking progress through guides
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Content management for guides and resources
CREATE TABLE IF NOT EXISTS content_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT,
    content TEXT, -- Markdown content
    slug VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'draft', -- draft, published, archived
    featured BOOLEAN DEFAULT FALSE,
    view_count INTEGER DEFAULT 0,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    published_at DATETIME,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Feedback and contact submissions
CREATE TABLE IF NOT EXISTS feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    email VARCHAR(255),
    name VARCHAR(255),
    subject VARCHAR(255),
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'general', -- general, bug, feature_request, content_suggestion
    status VARCHAR(20) DEFAULT 'new', -- new, in_progress, resolved, closed
    priority VARCHAR(10) DEFAULT 'medium', -- low, medium, high
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    responded_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Analytics aggregation tables for performance
CREATE TABLE IF NOT EXISTS daily_analytics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date DATE UNIQUE NOT NULL,
    total_users INTEGER DEFAULT 0,
    new_users INTEGER DEFAULT 0,
    returning_users INTEGER DEFAULT 0,
    total_page_views INTEGER DEFAULT 0,
    unique_page_views INTEGER DEFAULT 0,
    avg_session_duration REAL DEFAULT 0,
    bounce_rate REAL DEFAULT 0,
    top_pages TEXT, -- JSON array of {page, views}
    top_searches TEXT, -- JSON array of {query, count}
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_page_views_user_id ON page_views(user_id);
CREATE INDEX IF NOT EXISTS idx_page_views_timestamp ON page_views(timestamp);
CREATE INDEX IF NOT EXISTS idx_page_views_url ON page_views(page_url);
CREATE INDEX IF NOT EXISTS idx_interactions_user_id ON resource_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_interactions_timestamp ON resource_interactions(timestamp);
CREATE INDEX IF NOT EXISTS idx_interactions_category ON resource_interactions(resource_category);
CREATE INDEX IF NOT EXISTS idx_search_queries_user_id ON search_queries(user_id);
CREATE INDEX IF NOT EXISTS idx_search_queries_timestamp ON search_queries(timestamp);
CREATE INDEX IF NOT EXISTS idx_content_slug ON content_items(slug);
CREATE INDEX IF NOT EXISTS idx_content_category ON content_items(category);
CREATE INDEX IF NOT EXISTS idx_content_status ON content_items(status);
CREATE INDEX IF NOT EXISTS idx_feedback_status ON feedback(status);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback(created_at);
CREATE INDEX IF NOT EXISTS idx_daily_analytics_date ON daily_analytics(date);

-- Triggers to update timestamps
CREATE TRIGGER IF NOT EXISTS update_users_timestamp 
    AFTER UPDATE ON users
    BEGIN
        UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS update_preferences_timestamp 
    AFTER UPDATE ON user_preferences
    BEGIN
        UPDATE user_preferences SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS update_content_timestamp 
    AFTER UPDATE ON content_items
    BEGIN
        UPDATE content_items SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

-- Insert sample data for development
INSERT OR IGNORE INTO users (email, full_name, institution, password_hash, email_verified, newsletter_subscribed) VALUES
('demo@medresearch.com', 'Demo User', 'Medical University', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj3bp.Gm.F5m', TRUE, TRUE),
('student@example.com', 'Jane Smith', 'Harvard Medical School', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj3bp.Gm.F5m', TRUE, FALSE),
('researcher@university.edu', 'Dr. John Doe', 'Johns Hopkins', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj3bp.Gm.F5m', TRUE, TRUE);

-- Insert sample content items
INSERT OR IGNORE INTO content_items (title, category, description, slug, status, featured) VALUES
('PubMed Advanced Search Guide', 'literature', 'Master PubMed search strategies with advanced filters and MeSH terms', 'pubmed-advanced-search', 'published', TRUE),
('Study Design Decision Tree', 'methodology', 'Interactive flowchart to choose the right research design', 'study-design-flowchart', 'published', TRUE),
('Statistical Test Selection Guide', 'statistics', 'When to use which statistical test with practical examples', 'statistical-tests-guide', 'published', FALSE),
('IRB Application Walkthrough', 'ethics', 'Step-by-step guide to IRB submissions with real examples', 'irb-application-guide', 'draft', FALSE);
