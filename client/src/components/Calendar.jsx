import React, { useEffect, useState } from 'react';
import { api } from '../api.js';

function formatEventTime(iso, allDay) {
  if (allDay) return 'ALL DAY';
  const d = new Date(iso);
  return d.toLocaleString('en-US', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
}

export default function Calendar() {
  const [calStatus, setCalStatus] = useState({ configured: false, authenticated: false });
  const [events, setEvents] = useState([]);
  const [calErr, setCalErr] = useState(null);

  const [articles, setArticles] = useState([]);
  const [feeds, setFeeds] = useState([]);
  const [tagFilter, setTagFilter] = useState('');
  const [feedSettings, setFeedSettings] = useState(false);
  const [feedForm, setFeedForm] = useState({ name: '', url: '', tag: '' });
  const [intelErr, setIntelErr] = useState(null);
  const [intelLoading, setIntelLoading] = useState(false);

  const today = new Date();
  const dayStr = today.toLocaleDateString('en-US', { weekday: 'long' });
  const dateStr = today.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });

  const loadCalendar = async () => {
    try {
      const s = await api.get('/api/calendar/status');
      setCalStatus(s);
      if (s.authenticated) {
        const r = await api.get('/api/calendar/events');
        setEvents(r.events || []);
        if (r.error) setCalErr(r.error);
      }
    } catch (e) { setCalErr(e.message); }
  };

  const loadFeeds = async () => {
    try { setFeeds(await api.get('/api/intel/feeds')); } catch (e) { setIntelErr(e.message); }
  };
  const loadArticles = async () => {
    setIntelLoading(true);
    try {
      const qs = tagFilter ? `?tag=${encodeURIComponent(tagFilter)}` : '';
      const r = await api.get(`/api/intel/articles${qs}`);
      setArticles(r.articles || []);
    } catch (e) { setIntelErr(e.message); }
    setIntelLoading(false);
  };

  useEffect(() => { loadCalendar(); loadFeeds(); loadArticles(); }, []);
  useEffect(() => { loadArticles(); }, [tagFilter]);

  const connect = async () => {
    try {
      const r = await api.get('/api/calendar/auth-url');
      window.open(r.url, '_blank');
    } catch (e) { setCalErr(e.message); }
  };

  const addFeed = async () => {
    if (!feedForm.url) return;
    await api.post('/api/intel/feeds', feedForm);
    setFeedForm({ name: '', url: '', tag: '' });
    loadFeeds(); loadArticles();
  };
  const delFeed = async (id) => {
    if (!confirm('Remove feed?')) return;
    await api.del(`/api/intel/feeds/${id}`);
    loadFeeds(); loadArticles();
  };

  const tags = Array.from(new Set(feeds.map(f => f.tag).filter(Boolean)));

  return (
    <>
      <div className="hud-panel-header">
        <span><span className="spark" />05 · CALENDAR + INTEL</span>
      </div>
      <div className="hud-panel-body">
        {/* Calendar section */}
        <div className="calendar-subsection">
          <div className="sub-header">
            <span>▸ CALENDAR</span>
            {calStatus.authenticated && <button className="btn ghost sm" onClick={loadCalendar}>⟳</button>}
          </div>

          <div className="today-banner">
            <div className="day">{dayStr.toUpperCase()}</div>
            <div className="date-sub mono">{dateStr}</div>
          </div>

          {calErr && <div className="panel-error">{calErr}</div>}

          {!calStatus.configured && (
            <div className="empty">
              GOOGLE OAUTH NOT CONFIGURED<br/>
              <span className="tiny">Set GOOGLE_CLIENT_ID & SECRET in server/.env</span>
            </div>
          )}
          {calStatus.configured && !calStatus.authenticated && (
            <button className="btn" onClick={connect}>▸ CONNECT GOOGLE CALENDAR</button>
          )}
          {calStatus.authenticated && events.length === 0 && (
            <div className="empty">NO EVENTS IN NEXT 7 DAYS</div>
          )}
          {events.map(e => (
            <div key={e.id} className="event-row">
              <div className="time">{formatEventTime(e.start, e.all_day)}</div>
              <div>{e.title}</div>
              {e.location && <div className="tiny muted">◉ {e.location}</div>}
            </div>
          ))}
        </div>

        <div className="divider" />

        {/* Intel feed */}
        <div className="intel-subsection">
          <div className="sub-header">
            <span>▸ INTEL FEED</span>
            <div className="row" style={{ gap: 4 }}>
              <button className="btn ghost sm" onClick={loadArticles}>{intelLoading ? '…' : '⟳'}</button>
              <button className="btn ghost sm" onClick={() => setFeedSettings(s => !s)}>⚙</button>
            </div>
          </div>

          {intelErr && <div className="panel-error">{intelErr}</div>}

          {feedSettings && (
            <div className="inline-form">
              <input className="input" placeholder="Name" value={feedForm.name} onChange={e => setFeedForm({...feedForm, name: e.target.value})} />
              <input className="input mono" placeholder="RSS URL" value={feedForm.url} onChange={e => setFeedForm({...feedForm, url: e.target.value})} />
              <input className="input" placeholder="Tag (e.g. tech, news)" value={feedForm.tag} onChange={e => setFeedForm({...feedForm, tag: e.target.value})} />
              <button className="btn" onClick={addFeed}>+ ADD FEED</button>
              <div className="divider" />
              <div className="tiny mono muted">ACTIVE FEEDS</div>
              {feeds.length === 0 ? <div className="empty">NONE</div> : feeds.map(f => (
                <div key={f.id} className="row space-between" style={{ fontSize: 11, padding: '2px 0' }}>
                  <span>{f.name}{f.tag && <span className="badge badge-mute" style={{ marginLeft: 6 }}>{f.tag}</span>}</span>
                  <button className="btn ghost sm" onClick={() => delFeed(f.id)}>×</button>
                </div>
              ))}
            </div>
          )}

          {tags.length > 0 && (
            <div className="pill-btn-group" style={{ marginBottom: 8 }}>
              <button className={`pill-btn ${!tagFilter ? 'active' : ''}`} onClick={() => setTagFilter('')}>ALL</button>
              {tags.map(t => (
                <button key={t} className={`pill-btn ${tagFilter === t ? 'active' : ''}`} onClick={() => setTagFilter(t)}>{t}</button>
              ))}
            </div>
          )}

          {articles.length === 0 ? <div className="empty">NO ARTICLES</div> : articles.map((a, i) => (
            <div key={i} className="article-row">
              <div className="source">▸ {a.source}{a.published && ` · ${new Date(a.published).toLocaleDateString()}`}</div>
              <a href={a.link} target="_blank" rel="noopener noreferrer">{a.title}</a>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
