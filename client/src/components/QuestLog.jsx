import React, { useEffect, useState } from 'react';
import { api } from '../api.js';

const STATUSES = ['all', 'active', 'complete', 'abandoned'];

function tierBadge(tier) {
  return tier === 'main'
    ? <span className="badge badge-cyan">MAIN QUEST</span>
    : <span className="badge badge-mute">SIDE QUEST</span>;
}
function statusBadge(status) {
  if (status === 'complete') return <span className="badge badge-green">COMPLETE</span>;
  if (status === 'abandoned') return <span className="badge badge-mute">ABANDONED</span>;
  return <span className="badge badge-cyan">ACTIVE</span>;
}

export default function QuestLog() {
  const [quests, setQuests] = useState([]);
  const [filter, setFilter] = useState('active');
  const [expanded, setExpanded] = useState(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', tier: 'side', target_date: '' });
  const [err, setErr] = useState(null);

  const load = async () => {
    try {
      const qs = filter === 'all' ? '' : `?status=${filter}`;
      const rows = await api.get(`/api/quests${qs}`);
      setQuests(rows);
    } catch (e) { setErr(e.message); }
  };
  useEffect(() => { load(); }, [filter]);

  const submit = async () => {
    if (!form.title) return;
    try {
      await api.post('/api/quests', form);
      setForm({ title: '', description: '', tier: 'side', target_date: '' });
      setAdding(false);
      load();
    } catch (e) { setErr(e.message); }
  };

  const update = async (id, patch) => {
    try { await api.put(`/api/quests/${id}`, patch); load(); } catch (e) { setErr(e.message); }
  };
  const remove = async (id) => {
    if (!confirm('Delete quest?')) return;
    try { await api.del(`/api/quests/${id}`); load(); } catch (e) { setErr(e.message); }
  };

  const addObj = async (questId) => {
    const label = prompt('Objective:');
    if (!label) return;
    await api.post(`/api/quests/${questId}/objectives`, { label });
    load();
  };
  const toggleObj = async (quest, obj) => {
    const completed = !obj.completed;
    await api.put(`/api/quests/objectives/${obj.id}`, { completed });
    const others = quest.objectives.filter(o => o.id !== obj.id);
    const allDone = completed && others.every(o => o.completed);
    if (allDone && others.length >= 0 && quest.status !== 'complete') {
      if (confirm('All objectives complete. Mark quest complete?')) {
        await api.put(`/api/quests/${quest.id}`, { status: 'complete', progress: 100 });
      }
    }
    load();
  };
  const delObj = async (objId) => {
    await api.del(`/api/quests/objectives/${objId}`);
    load();
  };

  return (
    <>
      <div className="hud-panel-header">
        <span><span className="spark" />02 · QUEST LOG</span>
        <div className="hud-panel-actions">
          <button className="btn sm" onClick={() => setAdding(a => !a)}>{adding ? '× CANCEL' : '+ NEW QUEST'}</button>
        </div>
      </div>
      <div className="hud-panel-body">
        {err && <div className="panel-error">{err}</div>}

        <div className="filter-row">
          {STATUSES.map(s => (
            <button key={s} className={`pill-btn ${filter === s ? 'active' : ''}`} onClick={() => setFilter(s)}>{s}</button>
          ))}
        </div>

        {adding && (
          <div className="inline-form">
            <input className="input" placeholder="Title" value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
            <textarea className="textarea" placeholder="Description" value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
            <div className="row">
              <select className="select" value={form.tier} onChange={e => setForm({...form, tier: e.target.value})}>
                <option value="side">Side Quest</option>
                <option value="main">Main Quest</option>
              </select>
              <input className="input" type="date" value={form.target_date} onChange={e => setForm({...form, target_date: e.target.value})} />
            </div>
            <button className="btn" onClick={submit}>CREATE</button>
          </div>
        )}

        {quests.length === 0 ? <div className="empty">NO QUESTS</div> : quests.map(q => (
          <div className="quest-item" key={q.id}>
            <div className="row space-between" style={{ alignItems: 'flex-start' }}>
              <div className="grow">
                <div className="quest-title" onClick={() => setExpanded(expanded === q.id ? null : q.id)}>
                  {q.title}
                </div>
                <div className="row" style={{ gap: 6, marginTop: 4 }}>
                  {tierBadge(q.tier)}
                  {statusBadge(q.status)}
                </div>
              </div>
              <span className="mono small" style={{ color: 'var(--accent-cyan)' }}>{q.progress}%</span>
            </div>
            <div className="progress-bar cyan" style={{ marginTop: 6 }}>
              <div className="progress-bar-fill" style={{ width: `${q.progress}%` }} />
            </div>

            {expanded === q.id && (
              <div className="quest-expanded">
                {q.description && <div className="small muted" style={{ marginBottom: 6 }}>{q.description}</div>}
                {q.target_date && <div className="tiny mono muted" style={{ marginBottom: 6 }}>▸ TARGET: {q.target_date}</div>}

                <div className="row" style={{ gap: 6, marginBottom: 6 }}>
                  <span className="tiny mono muted">PROGRESS</span>
                  <input type="range" min="0" max="100" value={q.progress} onChange={e => update(q.id, { progress: Number(e.target.value) })} className="grow" />
                </div>

                <div className="tiny mono muted" style={{ marginBottom: 4 }}>// OBJECTIVES</div>
                {(q.objectives || []).map(o => (
                  <div key={o.id} className={`objective-item ${o.completed ? 'done' : ''}`}>
                    <input type="checkbox" checked={!!o.completed} onChange={() => toggleObj(q, o)} />
                    <span className="grow">{o.label}</span>
                    <button className="btn ghost sm" onClick={() => delObj(o.id)}>×</button>
                  </div>
                ))}
                <div className="row" style={{ gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                  <button className="btn sm" onClick={() => addObj(q.id)}>+ OBJECTIVE</button>
                  <select className="select" style={{ width: 'auto' }} value={q.status} onChange={e => update(q.id, { status: e.target.value })}>
                    <option value="active">Active</option>
                    <option value="complete">Complete</option>
                    <option value="abandoned">Abandoned</option>
                  </select>
                  <button className="btn danger sm" onClick={() => remove(q.id)}>DELETE</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
