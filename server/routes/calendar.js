const express = require('express');
const fs = require('fs');
const path = require('path');
const { readConfig, writeConfig } = require('../config');

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
  client.on('tokens', (tokens) => {
    try {
      let existing = {};
      if (fs.existsSync(TOKEN_PATH)) existing = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
      const merged = { ...existing, ...tokens };
      fs.writeFileSync(TOKEN_PATH, JSON.stringify(merged, null, 2));
    } catch {}
  });
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

// List all calendars the user has access to
router.get('/calendars', async (req, res) => {
  const ctx = getOAuthClient();
  if (!ctx || !fs.existsSync(TOKEN_PATH)) {
    return res.json({ authenticated: false, calendars: [], selected: [] });
  }
  try {
    const calendar = ctx.google.calendar({ version: 'v3', auth: ctx.client });
    const response = await calendar.calendarList.list({ maxResults: 250 });
    const { selected_calendar_ids = [] } = readConfig();
    const calendars = (response.data.items || []).map(c => ({
      id: c.id,
      summary: c.summaryOverride || c.summary,
      description: c.description || '',
      primary: !!c.primary,
      access_role: c.accessRole,
      background_color: c.backgroundColor || '#3a9bff',
      foreground_color: c.foregroundColor || '#ffffff',
      selected: selected_calendar_ids.includes(c.id)
    }));
    calendars.sort((a, b) => (b.primary ? 1 : 0) - (a.primary ? 1 : 0) || a.summary.localeCompare(b.summary));
    res.json({ authenticated: true, calendars, selected: selected_calendar_ids });
  } catch (err) {
    res.status(500).json({ authenticated: true, calendars: [], selected: [], error: err.message });
  }
});

// Persist which calendars to include
router.put('/calendars/selection', (req, res) => {
  const ids = Array.isArray(req.body?.ids) ? req.body.ids.filter(x => typeof x === 'string') : [];
  const next = writeConfig({ selected_calendar_ids: ids });
  res.json({ selected_calendar_ids: next.selected_calendar_ids });
});

// Aggregate events from all selected calendars (falls back to primary)
router.get('/events', async (req, res) => {
  const ctx = getOAuthClient();
  if (!ctx) return res.json({ authenticated: false, events: [] });
  if (!fs.existsSync(TOKEN_PATH)) return res.json({ authenticated: false, events: [] });

  try {
    const calendar = ctx.google.calendar({ version: 'v3', auth: ctx.client });
    const { selected_calendar_ids = [] } = readConfig();
    const now = new Date();
    const later = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Build the id+name+color map once so events can carry source metadata
    let calendarMeta = {};
    if (selected_calendar_ids.length > 0) {
      try {
        const listResp = await calendar.calendarList.list({ maxResults: 250 });
        for (const c of (listResp.data.items || [])) {
          calendarMeta[c.id] = {
            name: c.summaryOverride || c.summary,
            color: c.backgroundColor || '#3a9bff'
          };
        }
      } catch {}
    }

    const idsToQuery = selected_calendar_ids.length > 0 ? selected_calendar_ids : ['primary'];

    const results = await Promise.all(idsToQuery.map(async calId => {
      try {
        const response = await calendar.events.list({
          calendarId: calId,
          timeMin: now.toISOString(),
          timeMax: later.toISOString(),
          singleEvents: true,
          orderBy: 'startTime',
          maxResults: 50
        });
        const meta = calendarMeta[calId] || { name: calId === 'primary' ? 'Primary' : calId, color: '#3a9bff' };
        return (response.data.items || []).map(e => ({
          id: `${calId}:${e.id}`,
          title: e.summary || '(untitled)',
          start: e.start?.dateTime || e.start?.date,
          end: e.end?.dateTime || e.end?.date,
          location: e.location || '',
          all_day: !e.start?.dateTime,
          calendar_id: calId,
          calendar_name: meta.name,
          calendar_color: meta.color
        }));
      } catch (err) {
        return [{
          id: `${calId}:error`,
          title: `[${calId}] ${err.message}`,
          start: now.toISOString(),
          end: now.toISOString(),
          location: '',
          all_day: false,
          calendar_id: calId,
          calendar_name: calId,
          calendar_color: '#ff4d6d',
          error: true
        }];
      }
    }));

    const events = results.flat().sort((a, b) => new Date(a.start) - new Date(b.start));
    res.json({ authenticated: true, events, calendar_count: idsToQuery.length });
  } catch (err) {
    res.status(500).json({ authenticated: true, events: [], error: err.message });
  }
});

router.post('/disconnect', (req, res) => {
  if (fs.existsSync(TOKEN_PATH)) fs.unlinkSync(TOKEN_PATH);
  res.json({ ok: true });
});

module.exports = router;
