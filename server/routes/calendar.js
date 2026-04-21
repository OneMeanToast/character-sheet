const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();

const TOKEN_PATH = path.join(__dirname, '..', 'google-token.json');

function getOAuthClient() {
  let google;
  try {
    ({ google } = require('googleapis'));
  } catch (err) {
    return null;
  }
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/api/calendar/oauth/callback';
  if (!clientId || !clientSecret) return null;
  const client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  if (fs.existsSync(TOKEN_PATH)) {
    try {
      const token = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
      client.setCredentials(token);
    } catch {}
  }
  return { client, google };
}

router.get('/status', (req, res) => {
  const ctx = getOAuthClient();
  if (!ctx) return res.json({ configured: false, authenticated: false });
  const authed = fs.existsSync(TOKEN_PATH);
  res.json({ configured: true, authenticated: authed });
});

router.get('/auth-url', (req, res) => {
  const ctx = getOAuthClient();
  if (!ctx) return res.status(400).json({ error: 'Google OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in server/.env' });
  const url = ctx.client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/calendar.readonly']
  });
  res.json({ url });
});

router.get('/oauth/callback', async (req, res) => {
  const ctx = getOAuthClient();
  if (!ctx) return res.status(400).send('Google OAuth not configured.');
  const { code } = req.query;
  if (!code) return res.status(400).send('Missing code');
  try {
    const { tokens } = await ctx.client.getToken(code);
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
    res.send('<html><body style="background:#0a0a0f;color:#00f5ff;font-family:monospace;padding:40px"><h2>Calendar linked.</h2><p>You can close this tab.</p></body></html>');
  } catch (err) {
    res.status(500).send('OAuth error: ' + err.message);
  }
});

router.get('/events', async (req, res) => {
  const ctx = getOAuthClient();
  if (!ctx) return res.json({ authenticated: false, events: [] });
  if (!fs.existsSync(TOKEN_PATH)) return res.json({ authenticated: false, events: [] });
  try {
    const calendar = ctx.google.calendar({ version: 'v3', auth: ctx.client });
    const now = new Date();
    const later = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: now.toISOString(),
      timeMax: later.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 25
    });
    const events = (response.data.items || []).map(e => ({
      id: e.id,
      title: e.summary || '(untitled)',
      start: e.start?.dateTime || e.start?.date,
      end: e.end?.dateTime || e.end?.date,
      location: e.location || '',
      all_day: !e.start?.dateTime
    }));
    res.json({ authenticated: true, events });
  } catch (err) {
    res.status(500).json({ authenticated: true, events: [], error: err.message });
  }
});

router.post('/disconnect', (req, res) => {
  if (fs.existsSync(TOKEN_PATH)) fs.unlinkSync(TOKEN_PATH);
  res.json({ ok: true });
});

module.exports = router;
