# Research Hub Database Setup & Usage Guide

## Overview

The Research Hub uses SQLite for local development with a comprehensive database schema designed to handle user management, analytics, and content delivery. The database is designed to be easily scalable to PostgreSQL or MySQL for production deployment.

## Database Architecture

### Core Tables

1. **users** - User accounts and authentication
2. **user_sessions** - Session management for authentication
3. **user_preferences** - User settings and personalization
4. **page_views** - Page visit tracking
5. **resource_interactions** - User interactions with content
6. **search_queries** - Search behavior tracking
7. **content_items** - CMS for guides and resources
8. **feedback** - User feedback and contact forms
9. **daily_analytics** - Aggregated analytics data

## Quick Start

### 1. Install Dependencies

```bash
cd server
npm install
```

### 2. Set Up Environment Variables

```bash
# Copy the example environment file
cp env.example .env

# Edit .env with your configuration
nano .env
```

### 3. Initialize Database

```bash
# Initialize the database with schema
npm run init-db

# Seed with sample data (optional)
npm run seed
```

### 4. Start the Server

```bash
# Development mode with auto-restart
npm run dev

# Production mode
npm start
```

## Database Schema Details

### Users Table
```sql
users (
    id, email, full_name, institution, password_hash,
    email_verified, verification_token, reset_token,
    newsletter_subscribed, created_at, updated_at, last_login
)
```

**Key Features:**
- Secure password hashing with bcrypt
- Email verification workflow
- Password reset functionality
- Newsletter subscription tracking
- Institution affiliation (for future features)

### Analytics Tables

**page_views** - Tracks every page visit
- User ID (if logged in), session ID, page URL, referrer
- Device type detection, IP address, user agent
- Time on page tracking

**resource_interactions** - Tracks content engagement
- Resource category/title, interaction type (view, expand, click)
- JSON data field for flexible interaction details
- Links to users and sessions

**search_queries** - Search behavior analysis
- Query text, results count, clicked results
- User and session association for personalization

### Content Management

**content_items** - Flexible CMS for guides and resources
- Title, category, description, markdown content
- SEO-friendly slugs, publication status
- View count tracking, featured content flags
- Creator attribution and timestamps

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/forgot-password` - Password reset request
- `POST /api/auth/reset-password` - Password reset with token
- `POST /api/auth/verify-email` - Email verification

### User Management
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `GET /api/users/preferences` - Get user preferences
- `PUT /api/users/preferences` - Update user preferences

### Analytics
- `POST /api/analytics/track` - Track user interaction
- `POST /api/analytics/search` - Track search query
- `GET /api/analytics/dashboard` - Analytics dashboard (admin)

### Content
- `GET /api/content` - Get all published content
- `GET /api/content/:slug` - Get specific content item
- `GET /api/content/category/:category` - Get content by category

### Feedback
- `POST /api/feedback` - Submit user feedback
- `GET /api/feedback` - Get feedback (admin only)

## Analytics & Tracking

### Automatic Tracking
The system automatically tracks:
- **Page Views** - Every page visit with referrer, device type
- **Session Data** - Anonymous session tracking for non-logged users
- **Search Behavior** - All search queries and result interactions
- **Content Engagement** - Resource card expansions, link clicks

### Privacy Considerations
- Anonymous users get session IDs, no personal data stored
- IP addresses are stored but can be anonymized in production
- GDPR-compliant user data deletion available
- Opt-out mechanisms for analytics tracking

### Analytics Dashboard
Access comprehensive analytics at `/api/analytics/dashboard`:
- User growth and engagement metrics
- Popular content and search terms
- Device and traffic source analysis
- Session duration and bounce rate tracking

## User Management Features

### Authentication
- **JWT-based authentication** with configurable expiration
- **Session management** with device tracking
- **Email verification** workflow (configurable)
- **Password reset** with secure tokens
- **Rate limiting** on auth endpoints

### User Preferences
- **Theme selection** (dark/light)
- **Email notification** preferences
- **Bookmarked resources** (JSON array)
- **Completed guides** tracking
- **Progress data** for interactive content

### Security Features
- **bcrypt password hashing** with configurable rounds
- **JWT secret rotation** support
- **Session invalidation** on logout
- **IP-based rate limiting**
- **SQL injection prevention** with parameterized queries

## Development Workflow

### Database Migrations
```bash
# Create new migration
npm run migrate create migration_name

# Run pending migrations
npm run migrate up

# Rollback last migration
npm run migrate down
```

### Testing
```bash
# Run test suite
npm test

# Run tests with coverage
npm run test:coverage
```

### Database Management
```bash
# Reset database (CAUTION: Deletes all data)
npm run db:reset

# Backup database
npm run db:backup

# Import backup
npm run db:restore backup_file.sql
```

## Production Deployment

### Environment Configuration
```bash
NODE_ENV=production
DATABASE_PATH=/var/lib/research-hub/database.db
JWT_SECRET=your-super-secret-production-key
FRONTEND_URL=https://yourdomain.com
```

### Database Optimization
1. **Enable WAL mode** for better concurrent access
2. **Set up regular backups** with cron jobs
3. **Monitor database size** and implement archiving
4. **Index optimization** for query performance

### Scaling Considerations
- **SQLite limitations**: ~100 concurrent writers
- **Migration path**: Schema is PostgreSQL-compatible
- **Horizontal scaling**: Consider read replicas for analytics
- **Caching layer**: Redis for session storage and frequent queries

## Monitoring & Maintenance

### Health Checks
- Database connectivity: `GET /api/health`
- Performance metrics: Built into analytics dashboard
- Error logging: Structured logging with Winston

### Regular Maintenance
- **Daily analytics aggregation** (automated)
- **Session cleanup** (expired sessions)
- **Database optimization** (VACUUM, ANALYZE)
- **Backup verification** (automated testing)

## Troubleshooting

### Common Issues

**Database locked error:**
```bash
# Check for long-running queries
lsof database.db

# Enable WAL mode
sqlite3 database.db "PRAGMA journal_mode=WAL;"
```

**High memory usage:**
```bash
# Check database size
ls -lh database/

# Analyze table sizes
sqlite3 database.db ".schema" | grep CREATE
```

**Performance issues:**
```bash
# Analyze query performance
sqlite3 database.db "EXPLAIN QUERY PLAN SELECT ..."

# Check index usage
sqlite3 database.db ".indices"
```

### Logs and Debugging
- Application logs: `logs/app.log`
- Error logs: `logs/error.log`
- SQL query logging: Enable in development mode
- Analytics debugging: `DEBUG=analytics npm run dev`

## Data Privacy & GDPR

### User Data Handling
- **Right to access**: API endpoint for user data export
- **Right to deletion**: Complete user data removal
- **Data minimization**: Only collect necessary analytics
- **Consent management**: Cookie and tracking preferences

### Implementation
```javascript
// Export user data
GET /api/users/export

// Delete user account and all associated data
DELETE /api/users/account

// Update privacy preferences
PUT /api/users/privacy
```

## Future Enhancements

### Planned Features
- **Multi-tenant support** for institutions
- **Advanced analytics** with ML-based insights
- **Content recommendation engine**
- **A/B testing framework**
- **Real-time collaboration features**

### Database Evolution
- **Microservices architecture** preparation
- **Event sourcing** for audit trails
- **Time-series data** for advanced analytics
- **Full-text search** with FTS5 or Elasticsearch

---

For more detailed technical documentation, see the individual route and middleware files in the `server/` directory.
