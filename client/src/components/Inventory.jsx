import React, { useEffect, useMemo, useRef, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { api, ASSETS_BASE } from '../api.js';

const CAT_ICON = {
  property: '⌂ PROPERTY',
  vehicle: '▸ VEHICLE',
  tech: '◉ TECH',
  other: '· OTHER'
};
const DONUT_COLORS = ['#00ff88', '#00f5ff', '#9b59ff', '#ffaa00', '#ff00aa', '#3a9bff', '#ff7a18'];

function money(n) {
  if (!n) return '$0';
  return '$' + Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 });
}

export default function Inventory() {
  const [tab, setTab] = useState('assets');
  const [assets, setAssets] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [watchlist, setWatchlist] = useState([]);
  const [err, setErr] = useState(null);
  const [addType, setAddType] = useState(null);

  const load = async () => {
    try {
      const [a, ac, w] = await Promise.all([
        api.get('/api/inventory/assets'),
        api.get('/api/inventory/accounts'),
        api.get('/api/inventory/watchlist')
      ]);
      setAssets(a); setAccounts(ac); setWatchlist(w);
    } catch (e) { setErr(e.message); }
  };
  useEffect(load, []);

  const netTotal = useMemo(() => accounts.reduce((s, a) => s + (a.balance || 0), 0), [accounts]);
  const donutData = useMemo(() => accounts.map(a => ({ name: a.name, value: a.balance || 0 })), [accounts]);

  return (
    <>
      <div className="hud-panel-header">
        <span><span className="spark" />04 · INVENTORY + FINANCIAL</span>
        <div className="hud-panel-actions">
          <button className="btn sm" onClick={() => setAddType(tab === 'assets' ? 'asset' : (addType === 'account' ? 'watch' : 'account'))}>
            + {tab === 'assets' ? 'ASSET' : (addType === 'account' ? 'WATCH' : 'ACCOUNT')}
          </button>
        </div>
      </div>
      <div className="hud-panel-body">
        {err && <div className="panel-error">{err}</div>}

        <div className="tab-row">
          <button className={`tab-btn ${tab === 'assets' ? 'active' : ''}`} onClick={() => setTab('assets')}>ASSETS</button>
          <button className={`tab-btn ${tab === 'financial' ? 'active' : ''}`} onClick={() => setTab('financial')}>FINANCIAL</button>
        </div>

        {tab === 'assets' && (
          <AssetsTab
            items={assets}
            adding={addType === 'asset'}
            closeAdd={() => setAddType(null)}
            reload={load}
            setErr={setErr}
          />
        )}

        {tab === 'financial' && (
          <FinancialTab
            accounts={accounts}
            watchlist={watchlist}
            netTotal={netTotal}
            donutData={donutData}
            adding={addType}
            closeAdd={() => setAddType(null)}
            reload={load}
            setErr={setErr}
          />
        )}
      </div>
    </>
  );
}

function AssetImage({ asset, onUpload, onClear, onPreview }) {
  const ref = useRef();
  const hasImg = !!asset.image_path;
  return (
    <div className="asset-image">
      {hasImg && (
        <img
          src={`${ASSETS_BASE}${asset.image_path}`}
          alt={asset.name}
          onClick={() => onPreview(asset)}
        />
      )}
      {!hasImg && (
        <div className="asset-image-placeholder" onClick={() => ref.current?.click()}>
          + IMAGE
        </div>
      )}
      <div className="asset-image-actions">
        <button className="btn ghost sm" onClick={() => ref.current?.click()} title={hasImg ? 'Replace' : 'Upload'}>
          {hasImg ? '↻' : '+'}
        </button>
        {hasImg && <button className="btn ghost sm" onClick={() => onClear(asset)} title="Remove image">×</button>}
      </div>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={e => {
          const f = e.target.files?.[0];
          if (f) onUpload(asset, f);
          e.target.value = '';
        }}
      />
    </div>
  );
}

function AssetsTab({ items, adding, closeAdd, reload, setErr }) {
  const [form, setForm] = useState({ name: '', category: 'other', value_estimate: 0, notes: '' });
  const [pendingImage, setPendingImage] = useState(null);
  const pendingRef = useRef();
  const [preview, setPreview] = useState(null);

  const submit = async () => {
    if (!form.name) return;
    try {
      const created = await api.post('/api/inventory/assets', form);
      if (pendingImage) {
        const fd = new FormData();
        fd.append('image', pendingImage);
        await api.post(`/api/inventory/assets/${created.id}/image`, fd);
      }
      setForm({ name: '', category: 'other', value_estimate: 0, notes: '' });
      setPendingImage(null);
      closeAdd();
      reload();
    } catch (e) { setErr(e.message); }
  };

  const uploadImage = async (asset, file) => {
    const fd = new FormData();
    fd.append('image', file);
    try { await api.post(`/api/inventory/assets/${asset.id}/image`, fd); reload(); }
    catch (e) { setErr(e.message); }
  };
  const clearImage = async (asset) => {
    if (!confirm('Remove image?')) return;
    try { await api.del(`/api/inventory/assets/${asset.id}/image`); reload(); }
    catch (e) { setErr(e.message); }
  };
  const del = async (id) => {
    if (!confirm('Delete asset?')) return;
    await api.del(`/api/inventory/assets/${id}`);
    reload();
  };

  return (
    <>
      {adding && (
        <div className="inline-form">
          <input className="input" placeholder="Name (e.g. 2019 Yamaha MT-07)" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
          <div className="row">
            <select className="select" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
              <option value="property">Property</option>
              <option value="vehicle">Vehicle</option>
              <option value="tech">Tech</option>
              <option value="other">Other</option>
            </select>
            <input className="input mono" type="number" placeholder="Value" value={form.value_estimate} onChange={e => setForm({...form, value_estimate: Number(e.target.value)})} />
          </div>
          <input className="input" placeholder="Notes" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
          <div className="row">
            <button className="btn ghost sm" onClick={() => pendingRef.current?.click()}>
              {pendingImage ? '↻ REPLACE' : '+ IMAGE'}
            </button>
            {pendingImage && (
              <span className="tiny mono muted grow" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                📎 {pendingImage.name}
              </span>
            )}
            {pendingImage && (
              <button className="btn ghost sm" onClick={() => setPendingImage(null)}>×</button>
            )}
          </div>
          <input
            ref={pendingRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={e => { setPendingImage(e.target.files?.[0] || null); e.target.value = ''; }}
          />
          <button className="btn" onClick={submit}>ADD</button>
        </div>
      )}
      {items.length === 0 ? <div className="empty">NO ASSETS</div> : (
        <div className="asset-grid">
          {items.map(a => (
            <div className="asset-card" key={a.id}>
              <AssetImage
                asset={a}
                onUpload={uploadImage}
                onClear={clearImage}
                onPreview={setPreview}
              />
              <div className="cat-icon">{CAT_ICON[a.category] || CAT_ICON.other}</div>
              <div className="asset-name">{a.name}</div>
              <div className="asset-value mono">{money(a.value_estimate)}</div>
              {a.notes && <div className="tiny muted" style={{ marginTop: 4 }}>{a.notes}</div>}
              <div style={{ position: 'absolute', top: 4, right: 4 }}>
                <button className="btn ghost sm" onClick={() => del(a.id)}>×</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {preview && (
        <div className="image-preview-overlay" onClick={() => setPreview(null)}>
          <div className="image-preview">
            <img src={`${ASSETS_BASE}${preview.image_path}`} alt={preview.name} />
            <div className="image-preview-caption mono">
              {preview.name} · {money(preview.value_estimate)}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function FinancialTab({ accounts, watchlist, netTotal, donutData, adding, closeAdd, reload, setErr }) {
  const [accForm, setAccForm] = useState({ name: '', institution: '', type: 'brokerage', balance: 0, notes: '' });
  const [wForm, setWForm] = useState({ ticker: '', name: '', current_price: 0, target_price: 0, status: 'watching', notes: '' });

  const addAccount = async () => {
    if (!accForm.name) return;
    await api.post('/api/inventory/accounts', accForm);
    setAccForm({ name: '', institution: '', type: 'brokerage', balance: 0, notes: '' });
    closeAdd(); reload();
  };
  const addWatch = async () => {
    if (!wForm.ticker && !wForm.name) return;
    await api.post('/api/inventory/watchlist', wForm);
    setWForm({ ticker: '', name: '', current_price: 0, target_price: 0, status: 'watching', notes: '' });
    closeAdd(); reload();
  };
  const delAcc = async (id) => { if (!confirm('Delete account?')) return; await api.del(`/api/inventory/accounts/${id}`); reload(); };
  const delW = async (id) => { if (!confirm('Delete watch?')) return; await api.del(`/api/inventory/watchlist/${id}`); reload(); };
  const updateWStatus = async (id, status) => { await api.put(`/api/inventory/watchlist/${id}`, { status }); reload(); };

  return (
    <>
      {adding === 'account' && (
        <div className="inline-form">
          <input className="input" placeholder="Account Name" value={accForm.name} onChange={e => setAccForm({...accForm, name: e.target.value})} />
          <div className="row">
            <input className="input" placeholder="Institution" value={accForm.institution} onChange={e => setAccForm({...accForm, institution: e.target.value})} />
            <select className="select" value={accForm.type} onChange={e => setAccForm({...accForm, type: e.target.value})}>
              <option value="brokerage">Brokerage</option>
              <option value="retirement">Retirement</option>
              <option value="crypto">Crypto</option>
              <option value="bank">Bank</option>
            </select>
          </div>
          <input className="input mono" type="number" placeholder="Balance" value={accForm.balance} onChange={e => setAccForm({...accForm, balance: Number(e.target.value)})} />
          <button className="btn" onClick={addAccount}>ADD</button>
        </div>
      )}
      {adding === 'watch' && (
        <div className="inline-form">
          <div className="row">
            <input className="input mono" placeholder="TICKER" value={wForm.ticker} onChange={e => setWForm({...wForm, ticker: e.target.value.toUpperCase()})} />
            <input className="input" placeholder="Name" value={wForm.name} onChange={e => setWForm({...wForm, name: e.target.value})} />
          </div>
          <div className="row">
            <input className="input mono" type="number" placeholder="Price" value={wForm.current_price} onChange={e => setWForm({...wForm, current_price: Number(e.target.value)})} />
            <input className="input mono" type="number" placeholder="Target" value={wForm.target_price} onChange={e => setWForm({...wForm, target_price: Number(e.target.value)})} />
            <select className="select" value={wForm.status} onChange={e => setWForm({...wForm, status: e.target.value})}>
              <option value="watching">Watching</option>
              <option value="prospective">Prospective</option>
              <option value="owned">Owned</option>
            </select>
          </div>
          <button className="btn" onClick={addWatch}>ADD</button>
        </div>
      )}

      <div className="row space-between" style={{ marginBottom: 8 }}>
        <div className="tiny mono muted">// NET TRACKED VALUE</div>
        <div className="net-total">{money(netTotal)}</div>
      </div>

      {accounts.length > 0 && (
        <div className="donut-wrap" style={{ marginBottom: 10 }}>
          <div style={{ width: 110, height: 110 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={donutData} innerRadius={28} outerRadius={52} dataKey="value" stroke="#0a0a0f" strokeWidth={2}>
                  {donutData.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#0a0a0f', border: '1px solid #00ff88', fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="legend">
            {donutData.map((d, i) => (
              <div key={i}>
                <span className="swatch" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                <span className="muted">{d.name}</span> — <span className="mono">{money(d.value)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="tiny mono muted" style={{ marginBottom: 4 }}>// ACCOUNTS</div>
      {accounts.length === 0 ? <div className="empty">NO ACCOUNTS</div> : (
        <table className="data-table">
          <thead><tr><th>Name</th><th>Type</th><th>Balance</th><th></th></tr></thead>
          <tbody>
            {accounts.map(a => (
              <tr key={a.id}>
                <td>{a.name}<div className="tiny muted">{a.institution}</div></td>
                <td className="mono tiny">{a.type}</td>
                <td className="mono">{money(a.balance)}</td>
                <td><button className="btn ghost sm" onClick={() => delAcc(a.id)}>×</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="divider" />
      <div className="tiny mono muted" style={{ marginBottom: 4 }}>// WATCHLIST</div>
      {watchlist.length === 0 ? <div className="empty">NO WATCHES</div> : (
        <table className="data-table">
          <thead><tr><th>Ticker</th><th>Price</th><th>Target</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {watchlist.map(w => (
              <tr key={w.id}>
                <td className="mono">{w.ticker || w.name}</td>
                <td className="mono">{money(w.current_price)}</td>
                <td className="mono">{money(w.target_price)}</td>
                <td>
                  <select className="select" value={w.status} onChange={e => updateWStatus(w.id, e.target.value)}>
                    <option value="watching">Watching</option>
                    <option value="prospective">Prospective</option>
                    <option value="owned">Owned</option>
                  </select>
                </td>
                <td><button className="btn ghost sm" onClick={() => delW(w.id)}>×</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
