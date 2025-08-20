#!/usr/bin/env node

const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

// Database configuration
const DB_PATH = path.join(__dirname, '../../database/research_hub.db');
const SCHEMA_PATH = path.join(__dirname, '../../database/schema.sql');

/**
 * Initialize the SQLite database with schema
 */
async function initializeDatabase() {
    console.log('🚀 Initializing Research Hub database...');
    
    try {
        // Ensure database directory exists
        const dbDir = path.dirname(DB_PATH);
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
            console.log(`📁 Created database directory: ${dbDir}`);
        }

        // Read schema file
        if (!fs.existsSync(SCHEMA_PATH)) {
            throw new Error(`Schema file not found: ${SCHEMA_PATH}`);
        }

        const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
        
        // Create database connection
        const db = new sqlite3.Database(DB_PATH, (err) => {
            if (err) {
                throw new Error(`Failed to connect to database: ${err.message}`);
            }
            console.log('📊 Connected to SQLite database');
        });

        // Execute schema
        await new Promise((resolve, reject) => {
            db.exec(schema, (err) => {
                if (err) {
                    reject(new Error(`Failed to execute schema: ${err.message}`));
                } else {
                    resolve();
                }
            });
        });

        console.log('✅ Database schema created successfully');

        // Verify tables were created
        const tables = await new Promise((resolve, reject) => {
            db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows.map(row => row.name));
                }
            });
        });

        console.log('📋 Created tables:', tables.join(', '));

        // Close database connection
        db.close((err) => {
            if (err) {
                console.error('❌ Error closing database:', err.message);
            } else {
                console.log('🔒 Database connection closed');
            }
        });

        console.log('🎉 Database initialization completed successfully!');
        console.log(`📍 Database location: ${DB_PATH}`);
        
    } catch (error) {
        console.error('❌ Database initialization failed:', error.message);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    initializeDatabase();
}

module.exports = { initializeDatabase };
