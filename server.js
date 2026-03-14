/*
 * Easter 2026 RSVP backend
 *
 * What this server does:
 * 1) Serves the static website files from this folder.
 * 2) Accepts RSVP form submissions at POST /api/rsvp.
 * 3) Sends two emails for each valid RSVP:
 *    - Internal notification to church staff.
 *    - Automatic follow-up confirmation to the guest.
 *
 * Why this is a "proper backend":
 * - The browser no longer depends on the visitor's local email app.
 * - Validation runs on the server, not only in the browser.
 * - SMTP credentials stay on the server (inside .env), not in public JS.
 * - You get predictable success/failure handling for the form.
 */

const path = require('path');
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();

// ---- Runtime configuration from environment variables ----
const PORT = Number(process.env.PORT || 3000);
const RSVP_NOTIFICATION_EMAIL = process.env.RSVP_NOTIFICATION_EMAIL || 'John.Pastor@fakeemail.org';
const RSVP_FROM_EMAIL = process.env.RSVP_FROM_EMAIL || 'no-reply@example.org';

// SMTP settings must match your mail provider.
const SMTP_CONFIG = {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
};

// ---- Basic hardening and body parsing ----
app.use(helmet({
    // CSP can be added later, but default helmet headers already improve safety.
    contentSecurityPolicy: false
}));
app.use(express.json({ limit: '20kb' }));

// Limit request bursts to reduce bot spam and abuse on RSVP endpoint.
const rsvpLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        ok: false,
        message: 'Too many RSVP attempts. Please wait a few minutes and try again.'
    }
});

// Serve your existing static files (HTML/CSS/JS/images) from this directory.
app.use(express.static(path.join(__dirname)));

// Build a reusable mail transporter once and reuse it per request.
const transporter = nodemailer.createTransport(SMTP_CONFIG);

function normalizeText(value, maxLength) {
    const text = String(value || '').trim();
    return text.slice(0, maxLength);
}

function normalizeCount(value) {
    // Empty children input becomes 0.
    if (value === '' || value === null || typeof value === 'undefined') {
        return 0;
    }

    const numeric = Number(value);
    if (!Number.isInteger(numeric) || numeric < 0) {
        return null;
    }

    return numeric;
}

function validateRsvpPayload(payload) {
    const name = normalizeText(payload.name, 120);
    const email = normalizeText(payload.email, 200).toLowerCase();
    const adults = normalizeCount(payload.adults);
    const children = normalizeCount(payload.children);

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (name.length < 2) {
        return { error: 'Please enter a valid name (at least 2 characters).' };
    }

    if (!emailPattern.test(email)) {
        return { error: 'Please enter a valid email address.' };
    }

    if (adults === null) {
        return { error: 'Adults must be a whole number of 0 or more.' };
    }

    if (children === null) {
        return { error: 'Children must be a whole number of 0 or more.' };
    }

    return {
        value: {
            name,
            email,
            adults,
            children
        }
    };
}

function buildAdminEmail(data) {
    const subject = `New Easter RSVP - ${data.name}`;
    const text = [
        'A new Easter RSVP was submitted.',
        '',
        `Name: ${data.name}`,
        `Email: ${data.email}`,
        `Adults: ${data.adults}`,
        `Children: ${data.children}`,
        `Submitted At (UTC): ${new Date().toISOString()}`
    ].join('\n');

    return {
        from: RSVP_FROM_EMAIL,
        to: RSVP_NOTIFICATION_EMAIL,
        replyTo: data.email,
        subject,
        text
    };
}

function buildGuestFollowUpEmail(data) {
    const subject = "You're all set for Easter at Church of the Good Shepherd";

    const text = [
        `Hi ${data.name},`,
        '',
        'Thank you for letting us know you are coming for Easter.',
        'We are excited to welcome you at Church of the Good Shepherd.',
        '',
        'RSVP summary:',
        `Adults: ${data.adults}`,
        `Children: ${data.children}`,
        '',
        'Location: 10928 SW 15th St, Yukon, OK 73099',
        '',
        'If your plans change, you can reply to this message and let us know.',
        '',
        'Blessings,',
        'Church of the Good Shepherd'
    ].join('\n');

    const html = `
        <div style="font-family: Arial, sans-serif; color: #222; line-height: 1.5;">
            <p>Hi ${data.name},</p>
            <p>Thank you for letting us know you are coming for Easter.</p>
            <p>We are excited to welcome you at <strong>Church of the Good Shepherd</strong>.</p>
            <p><strong>RSVP summary:</strong><br>
            Adults: ${data.adults}<br>
            Children: ${data.children}</p>
            <p><strong>Location:</strong> 10928 SW 15th St, Yukon, OK 73099</p>
            <p>If your plans change, you can reply to this message and let us know.</p>
            <p>Blessings,<br>Church of the Good Shepherd</p>
        </div>
    `;

    return {
        from: RSVP_FROM_EMAIL,
        to: data.email,
        subject,
        text,
        html
    };
}

app.post('/api/rsvp', rsvpLimiter, async (req, res) => {
    const result = validateRsvpPayload(req.body || {});
    if (result.error) {
        return res.status(400).json({ ok: false, message: result.error });
    }

    const data = result.value;

    try {
        // Send internal staff notification first.
        await transporter.sendMail(buildAdminEmail(data));

        // Then send automatic confirmation/follow-up to the guest.
        await transporter.sendMail(buildGuestFollowUpEmail(data));

        return res.json({
            ok: true,
            message: 'RSVP received. A confirmation email has been sent.'
        });
    } catch (error) {
        console.error('RSVP email send failed:', error);
        return res.status(500).json({
            ok: false,
            message: 'Unable to send RSVP right now. Please try again in a few minutes.'
        });
    }
});

// Health endpoint for quick server checks.
app.get('/api/health', (req, res) => {
    res.json({ ok: true, service: 'rsvp-backend' });
});

// Friendly root route so / serves your existing page explicitly.
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'Easter_page_2026.html'));
});

app.listen(PORT, () => {
    console.log(`RSVP backend running at http://localhost:${PORT}`);

    // Helpful startup warning if required SMTP values are missing.
    if (!SMTP_CONFIG.host || !SMTP_CONFIG.auth.user || !SMTP_CONFIG.auth.pass) {
        console.warn('SMTP is not fully configured. Update .env before using RSVP email sending.');
    }
});
