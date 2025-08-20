const nodemailer = require('nodemailer');

// Email templates
const templates = {
    verification: {
        subject: 'Verify your Research Junkie account',
        html: (data) => `
            <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa;">
                <div style="background: #1d2330; color: #ffffff; padding: 2rem; text-align: center;">
                    <h1 style="margin: 0; color: #64ffda;">Research Junkie</h1>
                    <p style="margin: 0.5rem 0 0 0; color: #8892b0;">Medical Research Learning Platform</p>
                </div>
                <div style="padding: 2rem; background: #ffffff;">
                    <h2 style="color: #1d2330; margin-top: 0;">Welcome, ${data.name}!</h2>
                    <p style="color: #666; line-height: 1.6;">
                        Thank you for joining Research Junkie. To complete your registration and access all our medical research resources, please verify your email address.
                    </p>
                    <div style="text-align: center; margin: 2rem 0;">
                        <a href="${data.verificationLink}" 
                           style="background: #64ffda; color: #0f1419; padding: 1rem 2rem; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
                            Verify Email Address
                        </a>
                    </div>
                    <p style="color: #666; font-size: 0.9rem;">
                        If the button doesn't work, copy and paste this link into your browser:<br>
                        <a href="${data.verificationLink}" style="color: #64ffda; word-break: break-all;">${data.verificationLink}</a>
                    </p>
                    <p style="color: #666; font-size: 0.9rem; margin-top: 2rem;">
                        This verification link will expire in 24 hours. If you didn't create an account with Research Junkie, you can safely ignore this email.
                    </p>
                </div>
                <div style="background: #f8f9fa; padding: 1rem; text-align: center; color: #666; font-size: 0.8rem;">
                    <p>© ${new Date().getFullYear()} Research Junkie - Medical Research Learning Platform</p>
                </div>
            </div>
        `,
        text: (data) => `
Welcome to Research Junkie, ${data.name}!

Thank you for joining our medical research learning platform. To complete your registration, please verify your email address by clicking the link below:

${data.verificationLink}

This verification link will expire in 24 hours. If you didn't create an account with Research Junkie, you can safely ignore this email.

Best regards,
The Research Junkie Team
        `
    },

    'password-reset': {
        subject: 'Reset your Research Junkie password',
        html: (data) => `
            <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa;">
                <div style="background: #1d2330; color: #ffffff; padding: 2rem; text-align: center;">
                    <h1 style="margin: 0; color: #64ffda;">Research Junkie</h1>
                    <p style="margin: 0.5rem 0 0 0; color: #8892b0;">Password Reset Request</p>
                </div>
                <div style="padding: 2rem; background: #ffffff;">
                    <h2 style="color: #1d2330; margin-top: 0;">Reset Your Password</h2>
                    <p style="color: #666; line-height: 1.6;">
                        Hi ${data.name}, we received a request to reset your password for your Research Junkie account.
                    </p>
                    <div style="text-align: center; margin: 2rem 0;">
                        <a href="${data.resetLink}" 
                           style="background: #64ffda; color: #0f1419; padding: 1rem 2rem; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
                            Reset Password
                        </a>
                    </div>
                    <p style="color: #666; font-size: 0.9rem;">
                        If the button doesn't work, copy and paste this link into your browser:<br>
                        <a href="${data.resetLink}" style="color: #64ffda; word-break: break-all;">${data.resetLink}</a>
                    </p>
                    <p style="color: #666; font-size: 0.9rem; margin-top: 2rem;">
                        This password reset link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email - your password will remain unchanged.
                    </p>
                </div>
                <div style="background: #f8f9fa; padding: 1rem; text-align: center; color: #666; font-size: 0.8rem;">
                    <p>© ${new Date().getFullYear()} Research Junkie - Medical Research Learning Platform</p>
                </div>
            </div>
        `,
        text: (data) => `
Password Reset Request - Research Junkie

Hi ${data.name},

We received a request to reset your password for your Research Junkie account. Click the link below to create a new password:

${data.resetLink}

This password reset link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.

Best regards,
The Research Junkie Team
        `
    },

    welcome: {
        subject: 'Welcome to Research Junkie!',
        html: (data) => `
            <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa;">
                <div style="background: #1d2330; color: #ffffff; padding: 2rem; text-align: center;">
                    <h1 style="margin: 0; color: #64ffda;">Research Junkie</h1>
                    <p style="margin: 0.5rem 0 0 0; color: #8892b0;">Welcome to the Community!</p>
                </div>
                <div style="padding: 2rem; background: #ffffff;">
                    <h2 style="color: #1d2330; margin-top: 0;">Welcome, ${data.name}!</h2>
                    <p style="color: #666; line-height: 1.6;">
                        Your email has been verified and your Research Junkie account is now active. You're ready to explore our comprehensive medical research resources!
                    </p>
                    <div style="background: #f8f9fa; padding: 1.5rem; border-radius: 8px; margin: 1.5rem 0;">
                        <h3 style="color: #1d2330; margin-top: 0;">Get Started:</h3>
                        <ul style="color: #666; line-height: 1.6; margin: 0;">
                            <li>Browse our <strong>Literature Search & Review</strong> guides</li>
                            <li>Learn about <strong>Study Design & Methodology</strong></li>
                            <li>Master <strong>Biostatistics</strong> concepts</li>
                            <li>Navigate <strong>Research Ethics & IRB</strong> processes</li>
                        </ul>
                    </div>
                    <div style="text-align: center; margin: 2rem 0;">
                        <a href="${data.dashboardLink || process.env.FRONTEND_URL}" 
                           style="background: #64ffda; color: #0f1419; padding: 1rem 2rem; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
                            Start Learning
                        </a>
                    </div>
                    <p style="color: #666; font-size: 0.9rem;">
                        Need help getting started? Reply to this email or visit our help section.
                    </p>
                </div>
                <div style="background: #f8f9fa; padding: 1rem; text-align: center; color: #666; font-size: 0.8rem;">
                    <p>© ${new Date().getFullYear()} Research Junkie - Medical Research Learning Platform</p>
                </div>
            </div>
        `,
        text: (data) => `
Welcome to Research Junkie, ${data.name}!

Your email has been verified and your Research Junkie account is now active. You're ready to explore our comprehensive medical research resources!

Get Started:
- Browse our Literature Search & Review guides
- Learn about Study Design & Methodology  
- Master Biostatistics concepts
- Navigate Research Ethics & IRB processes

Visit: ${data.dashboardLink || process.env.FRONTEND_URL}

Need help getting started? Reply to this email or visit our help section.

Best regards,
The Research Junkie Team
        `
    }
};

class EmailService {
    constructor() {
        this.transporter = null;
        this.initialize();
    }

    async initialize() {
        // Skip email setup in development if credentials not provided
        if (process.env.NODE_ENV === 'development' && !process.env.SMTP_HOST) {
            console.log('📧 Email service disabled in development (no SMTP configuration)');
            return;
        }

        try {
            // Create transporter
            this.transporter = nodemailer.createTransporter({
                host: process.env.SMTP_HOST,
                port: parseInt(process.env.SMTP_PORT) || 587,
                secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS,
                },
                // For development with self-signed certificates
                tls: {
                    rejectUnauthorized: process.env.NODE_ENV === 'production'
                }
            });

            // Verify connection
            await this.transporter.verify();
            console.log('📧 Email service initialized successfully');

        } catch (error) {
            console.error('📧 Email service initialization failed:', error.message);
            
            // In development, continue without email
            if (process.env.NODE_ENV === 'development') {
                console.log('📧 Continuing in development mode without email service');
                this.transporter = null;
            } else {
                throw error;
            }
        }
    }

    async sendEmail({ to, subject, template, data, html, text }) {
        try {
            // If no transporter, log the email instead of sending (development mode)
            if (!this.transporter) {
                console.log('📧 [EMAIL SIMULATION]');
                console.log(`To: ${to}`);
                console.log(`Subject: ${subject}`);
                console.log(`Template: ${template}`);
                console.log(`Data:`, data);
                console.log('📧 [END EMAIL SIMULATION]');
                return { messageId: 'simulated-' + Date.now() };
            }

            let emailHtml = html;
            let emailText = text;
            let emailSubject = subject;

            // Use template if provided
            if (template && templates[template]) {
                const templateData = templates[template];
                emailSubject = subject || templateData.subject;
                emailHtml = templateData.html(data || {});
                emailText = templateData.text(data || {});
            }

            const mailOptions = {
                from: {
                    name: process.env.FROM_NAME || 'Research Junkie',
                    address: process.env.FROM_EMAIL || process.env.SMTP_USER
                },
                to,
                subject: emailSubject,
                html: emailHtml,
                text: emailText,
            };

            const info = await this.transporter.sendMail(mailOptions);
            console.log('📧 Email sent successfully:', info.messageId);
            
            return info;

        } catch (error) {
            console.error('📧 Failed to send email:', error);
            throw error;
        }
    }

    // Convenience methods for common email types
    async sendVerificationEmail(to, data) {
        return this.sendEmail({
            to,
            template: 'verification',
            data
        });
    }

    async sendPasswordResetEmail(to, data) {
        return this.sendEmail({
            to,
            template: 'password-reset',
            data
        });
    }

    async sendWelcomeEmail(to, data) {
        return this.sendEmail({
            to,
            template: 'welcome',
            data
        });
    }

    // Test email functionality
    async sendTestEmail(to) {
        return this.sendEmail({
            to,
            subject: 'Research Junkie - Email Test',
            html: `
                <h2>Email Test Successful! ✅</h2>
                <p>Your Research Junkie email service is working correctly.</p>
                <p><strong>Time:</strong> ${new Date().toISOString()}</p>
                <p><strong>Environment:</strong> ${process.env.NODE_ENV || 'development'}</p>
            `,
            text: `
Email Test Successful!

Your Research Junkie email service is working correctly.
Time: ${new Date().toISOString()}
Environment: ${process.env.NODE_ENV || 'development'}
            `
        });
    }
}

// Create singleton instance
const emailService = new EmailService();

// Export convenience function
const sendEmail = (options) => emailService.sendEmail(options);

module.exports = {
    EmailService,
    sendEmail,
    emailService
};
