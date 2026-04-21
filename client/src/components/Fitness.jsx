import React, { useEffect, useMemo, useState } from 'react';
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '../api.js';

function todayStr() { return new Date().toISOString().slice(0, 10); }

export default function Fitness() {
  const [tab, setTab] = useState('log');
  const [templates, setTemplates] = useState([]);
  const [logs, setLogs] = useState([]);
  const [goals, setGoals] = useState([]);
  const [supps, setSupps] = useState([]);
  const [body, setBody] = useState([]);
  const [err, setErr] = useState(null);

  const load = async () => {
    try {
      const [t, l, g, s, b] = await Promise.all([
        api.get('/api/fitness/templates'),
        api.get('/api/fitness/logs'),
        api.get('/api/fitness/goals'),
        api.get('/api/fitness/supplements'),
        api.get('/api/fitness/body')
      ]);
      setTemplates(t); setLogs(l); setGoals(g); setSupps(s); setBody(b);
    } catch (e) { setErr(e.message); }
  };
  useEffect(load, []);

  return (
    <>
      <div className="hud-panel-header">
        <span><span className="spark" />06 · FITNESS</span>
      </div>
      <div className="hud-panel-body">
        {err && <div className="panel-error">{err}</div>}

        <div className="tab-row">
          <button className={`tab-btn ${tab === 'log' ? 'active' : ''}`} onClick={() => setTab('log')}>LOG</button>
          <button className={`tab-btn ${tab === 'templates' ? 'active' : ''}`} onClick={() => setTab('templates')}>TEMPLATES</button>
          <button className={`tab-btn ${tab === 'goals' ? 'active' : ''}`} onClick={() => setTab('goals')}>GOALS</button>
          <button className={`tab-btn ${tab === 'stack' ? 'active' : ''}`} onClick={() => setTab('stack')}>STACK</button>
          <button className={`tab-btn ${tab === 'body' ? 'active' : ''}`} onClick={() => setTab('body')}>BODY</button>
        </div>

        {tab === 'log' && <LogTab logs={logs} templates={templates} reload={load} setErr={setErr} />}
        {tab === 'templates' && <TemplatesTab templates={templates} reload={load} setErr={setErr} />}
        {tab === 'goals' && <GoalsTab goals={goals} reload={load} setErr={setErr} />}
        {tab === 'stack' && <StackTab supps={supps} reload={load} setErr={setErr} />}
        {tab === 'body' && <BodyTab body={body} reload={load} setErr={setErr} />}
      </div>
    </>
  );
}

function LogTab({ logs, templates, reload, setErr }) {
  const [form, setForm] = useState({ template_id: '', date: todayStr(), status: 'hit', notes: '' });

  const heatmap = useMemo(() => {
    const cells = [];
    const byDate = {};
    for (const l of logs) byDate[l.date] = l.status;
    for (let i = 29; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      cells.push({ date: key, status: byDate[key] || null });
    }
    return cells;
  }, [logs]);

  const submit = async () => {
    try {
      await api.post('/api/fitness/logs', { ...form, template_id: form.template_id ? Number(form.template_id) : null });
      setForm({ template_id: '', date: todayStr(), status: 'hit', notes: '' });
      reload();
    } catch (e) { setErr(e.message); }
  };

  return (
    <>
      <div className="inline-form">
        <div className="row">
          <input className="input mono" type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
          <select className="select" value={form.template_id} onChange={e => setForm({...form, template_id: e.target.value})}>
            <option value="">— template —</option>
            {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <select className="select" value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
            <option value="hit">Hit</option>
            <option value="missed">Missed</option>
          </select>
        </div>
        <input className="input" placeholder="Notes" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
        <button className="btn" onClick={submit}>LOG</button>
      </div>

      <div className="tiny mono muted" style={{ marginTop: 4 }}>// LAST 30 DAYS</div>
      <div className="heatmap">
        {heatmap.map(c => (
          <div key={c.date} className={`cell ${c.status || ''}`} title={`${c.date} · ${c.status || 'no log'}`} />
        ))}
      </div>

      <div className="tiny mono muted">// RECENT</div>
      {logs.slice(0, 10).map(l => (
        <div key={l.id} className="row space-between" style={{ padding: '4px 0', borderBottom: '1px solid var(--border-dim)', fontSize: 11 }}>
          <span className="mono">{l.date}</span>
          <span className={`badge ${l.status === 'hit' ? 'badge-magenta' : 'badge-mute'}`}>{l.status}</span>
          <span className="muted grow" style={{ marginLeft: 8 }}>{l.notes}</span>
        </div>
      ))}
    </>
  );
}

function TemplatesTab({ templates, reload, setErr }) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [exercises, setExercises] = useState([{ name: '', sets: 3, reps: 10, weight: 0 }]);

  const addEx = () => setExercises([...exercises, { name: '', sets: 3, reps: 10, weight: 0 }]);
  const updateEx = (i, patch) => setExercises(exercises.map((e, idx) => idx === i ? { ...e, ...patch } : e));
  const removeEx = (i) => setExercises(exercises.filter((_, idx) => idx !== i));

  const save = async () => {
    if (!name) return;
    try {
      await api.post('/api/fitness/templates', { name, exercises: exercises.filter(e => e.name) });
      setName(''); setExercises([{ name: '', sets: 3, reps: 10, weight: 0 }]); setAdding(false); reload();
    } catch (e) { setErr(e.message); }
  };
  const del = async (id) => {
    if (!confirm('Delete template?')) return;
    await api.del(`/api/fitness/templates/${id}`);
    reload();
  };

  return (
    <>
      <button className="btn sm" style={{ marginBottom: 8 }} onClick={() => setAdding(a => !a)}>{adding ? '× CANCEL' : '+ TEMPLATE'}</button>
      {adding && (
        <div className="inline-form">
          <input className="input" placeholder="Template name" value={name} onChange={e => setName(e.target.value)} />
          {exercises.map((ex, i) => (
            <div key={i} className="row">
              <input className="input" placeholder="Exercise" value={ex.name} onChange={e => updateEx(i, { name: e.target.value })} />
              <input className="input mono" type="number" style={{ width: 50 }} value={ex.sets} onChange={e => updateEx(i, { sets: Number(e.target.value) })} />
              <span className="tiny mute">×</span>
              <input className="input mono" type="number" style={{ width: 50 }} value={ex.reps} onChange={e => updateEx(i, { reps: Number(e.target.value) })} />
              <input className="input mono" type="number" style={{ width: 60 }} placeholder="lbs" value={ex.weight} onChange={e => updateEx(i, { weight: Number(e.target.value) })} />
              <button className="btn ghost sm" onClick={() => removeEx(i)}>×</button>
            </div>
          ))}
          <button className="btn ghost sm" onClick={addEx}>+ EXERCISE</button>
          <button className="btn" onClick={save}>SAVE TEMPLATE</button>
        </div>
      )}

      {templates.length === 0 ? <div className="empty">NO TEMPLATES</div> : templates.map(t => (
        <div className="quest-item" key={t.id}>
          <div className="row space-between">
            <div className="quest-title">{t.name}</div>
            <button className="btn ghost sm" onClick={() => del(t.id)}>×</button>
          </div>
          {t.exercises.map((ex, i) => (
            <div key={i} className="tiny mono muted">▸ {ex.name} — {ex.sets}×{ex.reps} @ {ex.weight}</div>
          ))}
        </div>
      ))}
    </>
  );
}

function GoalsTab({ goals, reload, setErr }) {
  const [form, setForm] = useState({ title: '', progress: 0, target_date: '' });
  const submit = async () => {
    if (!form.title) return;
    try { await api.post('/api/fitness/goals', form); setForm({ title: '', progress: 0, target_date: '' }); reload(); }
    catch (e) { setErr(e.message); }
  };
  const update = async (id, patch) => { await api.put(`/api/fitness/goals/${id}`, patch); reload(); };
  const del = async (id) => { if (!confirm('Delete goal?')) return; await api.del(`/api/fitness/goals/${id}`); reload(); };

  return (
    <>
      <div className="inline-form">
        <input className="input" placeholder="Goal" value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
        <div className="row">
          <input className="input" type="date" value={form.target_date} onChange={e => setForm({...form, target_date: e.target.value})} />
          <button className="btn" onClick={submit}>+ ADD</button>
        </div>
      </div>
      {goals.length === 0 ? <div className="empty">NO GOALS</div> : goals.map(g => (
        <div key={g.id} className="quest-item">
          <div className="row space-between">
            <div className="grow">{g.title}</div>
            <span className="mono small" style={{ color: 'var(--accent-magenta)' }}>{g.progress}%</span>
            <button className="btn ghost sm" onClick={() => del(g.id)}>×</button>
          </div>
          {g.target_date && <div className="tiny mono muted">TARGET: {g.target_date}</div>}
          <input type="range" min="0" max="100" value={g.progress} onChange={e => update(g.id, { progress: Number(e.target.value) })} style={{ width: '100%', marginTop: 6 }} />
        </div>
      ))}
    </>
  );
}

function StackTab({ supps, reload, setErr }) {
  const [form, setForm] = useState({ name: '', dose: '', timing: '' });
  const submit = async () => {
    if (!form.name) return;
    try { await api.post('/api/fitness/supplements', { ...form, active: 1 }); setForm({ name: '', dose: '', timing: '' }); reload(); }
    catch (e) { setErr(e.message); }
  };
  const toggle = async (s) => { await api.put(`/api/fitness/supplements/${s.id}`, { active: !s.active }); reload(); };
  const del = async (id) => { if (!confirm('Remove?')) return; await api.del(`/api/fitness/supplements/${id}`); reload(); };

  return (
    <>
      <div className="inline-form">
        <div className="row">
          <input className="input" placeholder="Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
          <input className="input" placeholder="Dose" value={form.dose} onChange={e => setForm({...form, dose: e.target.value})} />
          <input className="input" placeholder="Timing" value={form.timing} onChange={e => setForm({...form, timing: e.target.value})} />
          <button className="btn" onClick={submit}>+</button>
        </div>
      </div>
      {supps.length === 0 ? <div className="empty">EMPTY STACK</div> : supps.map(s => (
        <div key={s.id} className={`supplement-row ${!s.active ? 'inactive' : ''}`}>
          <div className={`toggle ${s.active ? 'on' : ''}`} onClick={() => toggle(s)} />
          <div className="grow">
            <div style={{ fontSize: 12 }}>{s.name}</div>
            <div className="tiny mono muted">{s.dose} · {s.timing}</div>
          </div>
          <button className="btn ghost sm" onClick={() => del(s.id)}>×</button>
        </div>
      ))}
    </>
  );
}

function BodyTab({ body, reload, setErr }) {
  const [form, setForm] = useState({ date: todayStr(), weight: 0, notes: '' });
  const submit = async () => {
    try { await api.post('/api/fitness/body', form); setForm({ date: todayStr(), weight: 0, notes: '' }); reload(); }
    catch (e) { setErr(e.message); }
  };
  const del = async (id) => { if (!confirm('Delete?')) return; await api.del(`/api/fitness/body/${id}`); reload(); };

  const chartData = body.slice().reverse().map(b => ({ date: b.date, weight: b.weight }));

  return (
    <>
      <div className="inline-form">
        <div className="row">
          <input className="input mono" type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
          <input className="input mono" type="number" step="0.1" placeholder="Weight" value={form.weight} onChange={e => setForm({...form, weight: Number(e.target.value)})} />
          <button className="btn" onClick={submit}>LOG</button>
        </div>
        <input className="input" placeholder="Notes" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
      </div>

      {chartData.length > 1 && (
        <div style={{ height: 120, marginBottom: 10 }}>
          <ResponsiveContainer>
            <LineChart data={chartData}>
              <XAxis dataKey="date" hide />
              <YAxis domain={['auto', 'auto']} tick={{ fontSize: 9, fill: '#8a9aab' }} width={30} />
              <Tooltip contentStyle={{ background: '#0a0a0f', border: '1px solid #ff00aa', fontSize: 11 }} />
              <Line type="monotone" dataKey="weight" stroke="#ff00aa" strokeWidth={2} dot={{ r: 2, fill: '#ff00aa' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {body.length === 0 ? <div className="empty">NO DATA</div> : body.slice(0, 10).map(b => (
        <div key={b.id} className="row space-between" style={{ padding: '3px 0', borderBottom: '1px solid var(--border-dim)', fontSize: 11 }}>
          <span className="mono">{b.date}</span>
          <span className="mono" style={{ color: 'var(--accent-magenta)' }}>{b.weight}</span>
          <span className="muted grow" style={{ marginLeft: 8 }}>{b.notes}</span>
          <button className="btn ghost sm" onClick={() => del(b.id)}>×</button>
        </div>
      ))}
    </>
  );
}
