const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const Database = require('../utils/database');
const { sendEmail } = require('../utils/email');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
const db = new Database();

// Validation middleware
const registerValidation = [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('fullName').isLength({ min: 2, max: 100 }).trim().withMessage('Full name must be 2-100 characters'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('institution').optional().isLength({ max: 255 }).trim(),
];

const loginValidation = [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
];

const forgotPasswordValidation = [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
];

const resetPasswordValidation = [
    body('token').notEmpty().withMessage('Reset token is required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
];

// Register new user
router.post('/register', registerValidation, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array(),
            });
        }

        const { email, fullName, password, institution, newsletter } = req.body;

        // Check if user already exists
        const existingUser = await db.getUserByEmail(email);
        if (existingUser) {
            return res.status(409).json({
                error: 'User with this email already exists',
            });
        }

        // Hash password
        const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // Generate verification token
        const verificationToken = uuidv4();

        // Create user
        const userId = await db.createUser({
            email,
            fullName,
            institution: institution || null,
            passwordHash,
            verificationToken,
            newsletterSubscribed: newsletter || false,
        });

        // Send verification email if enabled
        if (process.env.ENABLE_EMAIL_VERIFICATION === 'true') {
            try {
                await sendEmail({
                    to: email,
                    subject: 'Verify your Research Hub account',
                    template: 'verification',
                    data: {
                        name: fullName,
                        verificationLink: `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`,
                    },
                });
            } catch (emailError) {
                console.error('Failed to send verification email:', emailError);
                // Don't fail registration if email fails
            }
        }

        // Create user preferences
        await db.createUserPreferences(userId);

        res.status(201).json({
            message: 'User registered successfully',
            userId,
            emailVerificationRequired: process.env.ENABLE_EMAIL_VERIFICATION === 'true',
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            error: 'Registration failed',
            message: error.message,
        });
    }
});

// Login user
router.post('/login', loginValidation, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array(),
            });
        }

        const { email, password, remember } = req.body;

        // Get user by email
        const user = await db.getUserByEmail(email);
        if (!user) {
            return res.status(401).json({
                error: 'Invalid credentials',
            });
        }

        // Check if account is active
        if (!user.is_active) {
            return res.status(401).json({
                error: 'Account is deactivated',
            });
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({
                error: 'Invalid credentials',
            });
        }

        // Check email verification if required
        if (process.env.ENABLE_EMAIL_VERIFICATION === 'true' && !user.email_verified) {
            return res.status(401).json({
                error: 'Email verification required',
                requiresVerification: true,
            });
        }

        // Generate JWT token
        const expiresIn = remember ? '30d' : process.env.JWT_EXPIRES_IN || '7d';
        const token = jwt.sign(
            { userId: user.id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn }
        );

        // Create session
        const sessionToken = uuidv4();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + (remember ? 30 : 7));

        await db.createSession({
            userId: user.id,
            sessionToken,
            expiresAt: expiresAt.toISOString(),
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
        });

        // Update last login
        await db.updateUserLastLogin(user.id);

        // Return user data (without sensitive info)
        const userData = {
            id: user.id,
            email: user.email,
            fullName: user.full_name,
            institution: user.institution,
            emailVerified: user.email_verified,
            createdAt: user.created_at,
        };

        res.json({
            message: 'Login successful',
            token,
            user: userData,
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            error: 'Login failed',
            message: error.message,
        });
    }
});

// Logout user
router.post('/logout', authenticateToken, async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (token) {
            // Invalidate session if it exists
            await db.invalidateSessionByToken(token);
        }

        res.json({
            message: 'Logout successful',
        });

    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            error: 'Logout failed',
            message: error.message,
        });
    }
});

// Forgot password
router.post('/forgot-password', forgotPasswordValidation, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array(),
            });
        }

        const { email } = req.body;

        const user = await db.getUserByEmail(email);
        if (!user) {
            // Don't reveal if email exists
            return res.json({
                message: 'If an account with that email exists, a password reset link has been sent.',
            });
        }

        // Generate reset token
        const resetToken = uuidv4();
        const resetTokenExpires = new Date();
        resetTokenExpires.setHours(resetTokenExpires.getHours() + 1); // 1 hour expiry

        await db.updateUserResetToken(user.id, resetToken, resetTokenExpires.toISOString());

        // Send reset email
        try {
            await sendEmail({
                to: email,
                subject: 'Reset your Research Hub password',
                template: 'password-reset',
                data: {
                    name: user.full_name,
                    resetLink: `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`,
                },
            });
        } catch (emailError) {
            console.error('Failed to send reset email:', emailError);
            return res.status(500).json({
                error: 'Failed to send reset email',
            });
        }

        res.json({
            message: 'If an account with that email exists, a password reset link has been sent.',
        });

    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({
            error: 'Password reset request failed',
            message: error.message,
        });
    }
});

// Reset password
router.post('/reset-password', resetPasswordValidation, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array(),
            });
        }

        const { token, password } = req.body;

        const user = await db.getUserByResetToken(token);
        if (!user || new Date() > new Date(user.reset_token_expires)) {
            return res.status(400).json({
                error: 'Invalid or expired reset token',
            });
        }

        // Hash new password
        const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // Update password and clear reset token
        await db.updateUserPassword(user.id, passwordHash);

        res.json({
            message: 'Password reset successful',
        });

    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({
            error: 'Password reset failed',
            message: error.message,
        });
    }
});

// Verify email
router.post('/verify-email', async (req, res) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({
                error: 'Verification token is required',
            });
        }

        const user = await db.getUserByVerificationToken(token);
        if (!user) {
            return res.status(400).json({
                error: 'Invalid verification token',
            });
        }

        if (user.email_verified) {
            return res.json({
                message: 'Email already verified',
            });
        }

        await db.verifyUserEmail(user.id);

        res.json({
            message: 'Email verified successfully',
        });

    } catch (error) {
        console.error('Email verification error:', error);
        res.status(500).json({
            error: 'Email verification failed',
            message: error.message,
        });
    }
});

// Refresh token
router.post('/refresh', authenticateToken, async (req, res) => {
    try {
        const user = req.user;

        // Generate new token
        const token = jwt.sign(
            { userId: user.id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );

        res.json({
            message: 'Token refreshed successfully',
            token,
        });

    } catch (error) {
        console.error('Token refresh error:', error);
        res.status(500).json({
            error: 'Token refresh failed',
            message: error.message,
        });
    }
});

module.exports = router;
