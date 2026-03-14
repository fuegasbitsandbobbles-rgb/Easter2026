# Easter 2026 RSVP Backend - Detailed Notes

This project now includes a real backend so form submissions can trigger **automatic email follow-up** reliably.

## 1. What changed

- Added `server.js` (Express API + static file hosting).
- Added `package.json` with backend dependencies.
- Added `.env.example` template for SMTP and email settings.
- Updated `Easterpage2026.js` so the form sends JSON to `/api/rsvp`.
- Added `.gitignore` to keep `.env` and `node_modules` out of source control.

## 2. Why this is better than `mailto:`

With `mailto:`, the browser opens the visitor's local email app and depends on the user finishing the message manually.

With this backend flow:
- The browser sends RSVP data to your server.
- The server validates it.
- The server sends an internal staff email.
- The server sends an automatic confirmation email to the visitor.
- The page receives a clear success/failure response.

This gives you consistent behavior across devices and browsers.

## 3. End-to-end data flow

1. Visitor fills out the RSVP form.
2. Frontend JS validates basic input (name, email, adults, children).
3. Frontend sends `POST /api/rsvp` with JSON.
4. Server validates again (never trust client input alone).
5. Server sends two emails through SMTP using Nodemailer:
   - Internal notification (`RSVP_NOTIFICATION_EMAIL`)
   - Guest follow-up (`data.email`)
6. Server responds:
   - Success: `{ ok: true, message: '...' }`
   - Failure: `{ ok: false, message: '...' }`
7. Frontend updates status text for the user.

## 4. Backend components explained

## `server.js`

- `helmet`: Adds security headers.
- `express.json()`: Reads incoming JSON body safely.
- `express-rate-limit`: Limits repeated RSVP attempts to reduce spam.
- `nodemailer`: Sends email over SMTP.
- `express.static(...)`: Serves existing HTML/CSS/JS/images.
- `POST /api/rsvp`: Main RSVP submission endpoint.
- `GET /api/health`: Simple health check endpoint.

## Validation strategy

Validation exists in two layers:
- Browser layer: fast UX feedback.
- Server layer: security and correctness.

Server validation checks:
- Name has at least 2 chars.
- Email has valid pattern.
- Adults and children are whole numbers >= 0.
- Input is normalized (trimmed strings, bounded length).

## Email strategy

Two separate email builders are used:
- `buildAdminEmail(data)`
- `buildGuestFollowUpEmail(data)`

This keeps message content maintainable and easy to customize.

## 5. One-time setup

1. Install Node.js 18+ if not installed.
2. In this folder, run:

```bash
npm install
```

3. Create your env file:

```bash
copy .env.example .env
```

4. Edit `.env` and fill real SMTP values.

## 6. Environment variables

- `PORT`: Server port (default `3000`)
- `RSVP_NOTIFICATION_EMAIL`: Where staff notifications go
- `RSVP_FROM_EMAIL`: Email sender shown in outgoing messages
- `SMTP_HOST`: SMTP server host
- `SMTP_PORT`: Usually `587` (TLS) or `465` (SSL)
- `SMTP_SECURE`: `true` for SSL (port 465), `false` for STARTTLS (587)
- `SMTP_USER`: SMTP username/login
- `SMTP_PASS`: SMTP password or app password

## Example Gmail note

If using Gmail, use an app password and appropriate SMTP settings:
- Host: `smtp.gmail.com`
- Port: `587`
- Secure: `false`

(Requires account/app-password configuration on Google side.)

## 7. Running locally

Development mode:

```bash
npm run dev
```

Production mode:

```bash
npm start
```

Then open:

- `http://localhost:3000/` (site)
- `http://localhost:3000/api/health` (health check)

## 8. How to test

1. Start server.
2. Open page in browser.
3. Submit test RSVP with a real email you control.
4. Confirm both outcomes:
   - Staff inbox receives internal notification.
   - Guest inbox receives confirmation email.

If submission fails:
- Check terminal logs for `RSVP email send failed`.
- Confirm SMTP values in `.env`.
- Verify provider allows sending from your `RSVP_FROM_EMAIL`.

## 9. Production deployment notes

For deployment later (VPS, Render, Railway, Azure, etc.):
- Set all `.env` values in provider's secret/environment settings.
- Serve over HTTPS.
- Consider adding bot protection (captcha or honeypot).
- Consider saving RSVPs in a database (for reporting and follow-up lists).
- Consider DKIM/SPF/DMARC for better email deliverability.

## 10. Customizing the follow-up email text

Update `buildGuestFollowUpEmail(data)` in `server.js`.

You can customize:
- Subject line
- Plain text body
- HTML body
- Church contact details
- Service times
- Additional links (parking, map, kids check-in)

## 11. Important security and reliability notes

- Never commit `.env` to git.
- Keep SMTP credentials private.
- Keep server-side validation even if frontend validation exists.
- Rate limiting is a first layer, not full spam prevention.
- Log enough errors to debug, but do not log secrets.

## 12. Future enhancements you may want

- Save RSVP records in SQLite/Postgres.
- Add admin dashboard for RSVP exports.
- Send reminder email 24 hours before service.
- Send segmented follow-ups for first-time guests vs returning families.
- Add unsubscribe/preference management if you send future campaigns.
