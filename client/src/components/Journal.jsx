import React, { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function Journal() {
  const [data, setData] = useState({ configured: false, entries: [], vault_path: '' });
  const [editing, setEditing] = useState(false);
  const [draftPath, setDraftPath] = useState('');
  const [err, setErr] = useState(null);

  const load = () => {
    api.get('/api/journal').then(setData).catch(e => setErr(e.message));
  };
  useEffect(load, []);

  const saveVault = async () => {
    try {
      await api.put('/api/journal/vault-path', { path: draftPath });
      setEditing(false);
      load();
    } catch (e) { setErr(e.message); }
  };

  const newEntry = async () => {
    try {
      const r = await api.post('/api/journal/new', {});
      window.location.href = r.obsidian_uri;
      setTimeout(load, 1500);
    } catch (e) { setErr(e.message); }
  };

  const openInObsidian = async (filePath) => {
    try {
      const r = await api.get(`/api/journal/obsidian-uri?path=${encodeURIComponent(filePath)}`);
      window.location.href = r.uri;
    } catch (e) { setErr(e.message); }
  };

  return (
    <>
      <div className="hud-panel-header">
        <span><span className="spark" />03 · JOURNAL</span>
        <div className="hud-panel-actions">
          {data.configured && <button className="btn sm" onClick={newEntry}>+ NEW ENTRY</button>}
          <button className="btn ghost sm" onClick={() => { setDraftPath(data.vault_path || ''); setEditing(e => !e); }}>
            {editing ? '×' : '⚙'}
          </button>
        </div>
      </div>
      <div className="hud-panel-body">
        {err && <div className="panel-error">{err}</div>}

        {(editing || !data.configured) && (
          <div className="inline-form">
            <div className="tiny mono muted">OBSIDIAN VAULT PATH</div>
            <input className="input mono" placeholder="/Users/you/ObsidianVault" value={draftPath} onChange={e => setDraftPath(e.target.value)} />
            <div className="row">
              <button className="btn" onClick={saveVault}>SAVE</button>
              {data.configured && <button className="btn ghost" onClick={() => setEditing(false)}>CANCEL</button>}
            </div>
          </div>
        )}

        {!data.configured && !editing && (
          <div className="empty">CONFIGURE VAULT PATH →</div>
        )}

        {data.configured && data.error && <div className="panel-error">{data.error}</div>}

        {data.configured && !data.error && data.entries.length === 0 && (
          <div className="empty">NO .MD FILES FOUND</div>
        )}

        {data.entries.map(entry => (
          <div key={entry.path} className="journal-card">
            <div className="title">▸ {entry.filename}</div>
            <div className="preview">{entry.preview || <span className="mute">(empty)</span>}</div>
            <div className="row space-between">
              <span className="tiny mono mute">{new Date(entry.modified_at).toLocaleString()}</span>
              <button className="btn sm" onClick={() => openInObsidian(entry.path)}>OPEN</button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
