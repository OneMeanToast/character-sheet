import React, { useEffect, useRef, useState } from 'react';
import { api, ASSETS_BASE } from '../api.js';

function EditableText({ value, onSave, className, placeholder, multiline }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || '');
  useEffect(() => { setDraft(value || ''); }, [value]);

  const commit = () => {
    setEditing(false);
    if ((draft || '') !== (value || '')) onSave(draft);
  };

  if (editing) {
    if (multiline) {
      return (
        <textarea
          className="textarea"
          autoFocus
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commit}
        />
      );
    }
    return (
      <input
        className="input"
        autoFocus
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setDraft(value || ''); setEditing(false); } }}
      />
    );
  }
  return (
    <span className={`editable ${multiline ? 'block' : ''} ${className || ''}`} onClick={() => setEditing(true)}>
      {value || <span className="mute">{placeholder || 'click to edit'}</span>}
    </span>
  );
}

function EditableNumber({ value, onSave, className }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? 0);
  useEffect(() => { setDraft(value ?? 0); }, [value]);
  if (editing) {
    return (
      <input
        type="number"
        className="input mono"
        style={{ width: 70, display: 'inline-block' }}
        autoFocus
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={() => { setEditing(false); const n = Number(draft) || 0; if (n !== value) onSave(n); }}
        onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
      />
    );
  }
  return <span className={`editable ${className || ''}`} onClick={() => setEditing(true)}>{value ?? 0}</span>;
}

export default function CharacterSheet() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const fileRef = useRef();

  const load = () => {
    api.get('/api/character').then(setData).catch(e => setErr(e.message));
  };
  useEffect(load, []);

  const save = async (patch) => {
    try {
      const next = { ...data, ...patch, custom_stats: patch.custom_stats ?? data.custom_stats ?? [] };
      const saved = await api.put('/api/character', next);
      setData(saved);
    } catch (e) { setErr(e.message); }
  };

  const saveStats = (stats) => save({ custom_stats: stats });

  const onAvatarClick = () => fileRef.current?.click();
  const onAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('avatar', file);
    try {
      const r = await api.post('/api/character/avatar', fd);
      setData(d => ({ ...d, avatar_path: r.avatar_path }));
    } catch (err) { setErr(err.message); }
  };

  const addStat = () => {
    const label = prompt('Stat label (e.g. Discipline):');
    if (!label) return;
    const v = prompt('Value 0-100:');
    const value = Math.min(100, Math.max(0, Number(v) || 0));
    const next = [...(data.custom_stats || []), { label, value }];
    saveStats(next);
  };
  const updateStat = (idx, patch) => {
    const next = (data.custom_stats || []).map((s, i) => i === idx ? { ...s, ...patch } : s);
    saveStats(next);
  };
  const removeStat = (idx) => {
    const next = (data.custom_stats || []).filter((_, i) => i !== idx);
    saveStats(next);
  };

  return (
    <>
      <div className="hud-panel-header">
        <span><span className="spark" />01 · CHARACTER SHEET</span>
        <div className="hud-panel-actions">
          <button className="btn sm" onClick={addStat}>+ STAT</button>
        </div>
      </div>
      <div className="hud-panel-body">
        {err && <div className="panel-error">{err}</div>}
        {!data ? <div className="empty">LOADING…</div> : (
          <>
            <div className="char-top">
              <div className="char-avatar" onClick={onAvatarClick} title="Click to upload avatar">
                {data.avatar_path
                  ? <img src={`${ASSETS_BASE}${data.avatar_path}`} alt="avatar" />
                  : <div className="upload-prompt">UPLOAD<br/>AVATAR</div>
                }
                <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onAvatarChange} />
              </div>
              <div className="char-meta">
                <div className="editable-name">
                  <EditableText value={data.name} placeholder="Player Name" onSave={v => save({ name: v })} />
                </div>
                <div className="subtitle">
                  <EditableText value={data.title} placeholder="Title" onSave={v => save({ title: v })} />
                  {data.nickname ? ' · ' : null}
                  <EditableText value={data.nickname} placeholder="Nickname" onSave={v => save({ nickname: v })} />
                </div>
                <div className="archetype">
                  <EditableText value={data.archetype} placeholder="Archetype / Class" onSave={v => save({ archetype: v })} />
                </div>
                <div className="level-row">
                  <span>LVL&nbsp;<EditableNumber value={data.level} onSave={v => save({ level: v })} /></span>
                  <span>·</span>
                  <span>XP&nbsp;<EditableNumber value={data.xp} onSave={v => save({ xp: v })} /></span>
                </div>
              </div>
            </div>

            <div className="divider" />

            <div className="tiny muted mono" style={{ letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>// BIO</div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.5 }}>
              <EditableText value={data.bio} multiline placeholder="Short bio / lore blurb" onSave={v => save({ bio: v })} />
            </div>

            <div className="divider" />

            <div className="tiny muted mono" style={{ letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>// STATS</div>
            {(!data.custom_stats || data.custom_stats.length === 0)
              ? <div className="empty">NO STATS — HIT +STAT</div>
              : (
                <div className="stat-grid">
                  {data.custom_stats.map((s, i) => (
                    <div className="stat-row" key={i}>
                      <div className="stat-label">
                        <span onDoubleClick={() => {
                          const nl = prompt('Rename:', s.label);
                          if (nl) updateStat(i, { label: nl });
                        }}>{s.label}</span>
                        <span className="row" style={{ gap: 6 }}>
                          <span className="stat-value mono">{s.value}</span>
                          <button className="btn ghost sm" title="Remove" onClick={() => removeStat(i)}>×</button>
                        </span>
                      </div>
                      <input
                        type="range" min="0" max="100" value={s.value}
                        onChange={e => updateStat(i, { value: Number(e.target.value) })}
                        style={{ width: '100%' }}
                      />
                    </div>
                  ))}
                </div>
              )
            }
          </>
        )}
      </div>
    </>
  );
}
