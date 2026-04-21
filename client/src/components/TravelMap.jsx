import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { api } from '../api.js';

const STATUS_COLORS = {
  conquered: '#00f5ff',
  radar: '#ffaa00',
  dreaming: '#9b59ff'
};

function iconForStatus(status) {
  const color = STATUS_COLORS[status] || STATUS_COLORS.radar;
  return L.divIcon({
    className: '',
    html: `<div class="custom-pin" style="background:${color};color:${color}"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7]
  });
}

export default function TravelMap() {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markerLayer = useRef(null);
  const [pins, setPins] = useState([]);
  const [countries, setCountries] = useState(0);
  const [selected, setSelected] = useState(null);
  const [newPinCoords, setNewPinCoords] = useState(null);
  const [err, setErr] = useState(null);
  const [form, setForm] = useState({ name: '', country: '', status: 'radar', notes: '', target_date: '' });

  const load = async () => {
    try {
      const r = await api.get('/api/travel');
      setPins(r.pins); setCountries(r.countries_visited);
    } catch (e) { setErr(e.message); }
  };

  useEffect(() => {
    if (mapInstance.current || !mapRef.current) return;
    const map = L.map(mapRef.current, {
      center: [20, 0],
      zoom: 2,
      worldCopyJump: true,
      zoomControl: true
    });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 19
    }).addTo(map);
    markerLayer.current = L.layerGroup().addTo(map);
    map.on('click', (e) => {
      setNewPinCoords({ lat: e.latlng.lat, lng: e.latlng.lng });
      setSelected(null);
      setForm({ name: '', country: '', status: 'radar', notes: '', target_date: '' });
    });
    mapInstance.current = map;
    load();
    setTimeout(() => map.invalidateSize(), 100);
  }, []);

  useEffect(() => {
    if (!markerLayer.current) return;
    markerLayer.current.clearLayers();
    pins.forEach(p => {
      const marker = L.marker([p.lat, p.lng], { icon: iconForStatus(p.status) });
      marker.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        setSelected(p);
        setNewPinCoords(null);
      });
      marker.addTo(markerLayer.current);
    });
  }, [pins]);

  const savePin = async () => {
    if (!form.name || !newPinCoords) return;
    try {
      await api.post('/api/travel', { ...form, lat: newPinCoords.lat, lng: newPinCoords.lng });
      setNewPinCoords(null);
      load();
    } catch (e) { setErr(e.message); }
  };

  const updateSelected = async (patch) => {
    if (!selected) return;
    try {
      const updated = await api.put(`/api/travel/${selected.id}`, patch);
      setSelected(updated);
      load();
    } catch (e) { setErr(e.message); }
  };

  const deletePin = async () => {
    if (!selected || !confirm('Delete pin?')) return;
    await api.del(`/api/travel/${selected.id}`);
    setSelected(null);
    load();
  };

  return (
    <>
      <div className="hud-panel-header">
        <span><span className="spark" />07 · TRAVEL / EXPLORATION</span>
        <div className="pin-count">
          COUNTRIES · <span className="mono" style={{ fontSize: 14 }}>{countries}</span>
        </div>
      </div>
      <div className="map-wrap">
        <div ref={mapRef} style={{ flex: 1 }} />
        <div className="travel-sidebar">
          {err && <div className="panel-error">{err}</div>}

          <div className="pin-count">
            <span className="big">{pins.length}</span>
            TOTAL PINS
          </div>
          <div className="divider" />
          <div className="tiny mono muted">// LEGEND</div>
          <div className="tiny" style={{ lineHeight: 1.8 }}>
            <div><span className="custom-pin" style={{ background: STATUS_COLORS.conquered, display: 'inline-block', marginRight: 6, verticalAlign: 'middle' }} /> CONQUERED</div>
            <div><span className="custom-pin" style={{ background: STATUS_COLORS.radar, display: 'inline-block', marginRight: 6, verticalAlign: 'middle' }} /> ON RADAR</div>
            <div><span className="custom-pin" style={{ background: STATUS_COLORS.dreaming, display: 'inline-block', marginRight: 6, verticalAlign: 'middle' }} /> DREAMING</div>
          </div>
          <div className="divider" />

          {newPinCoords && (
            <div className="inline-form">
              <div className="tiny mono muted">NEW PIN @ {newPinCoords.lat.toFixed(3)}, {newPinCoords.lng.toFixed(3)}</div>
              <input className="input" placeholder="Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
              <input className="input" placeholder="Country" value={form.country} onChange={e => setForm({...form, country: e.target.value})} />
              <select className="select" value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                <option value="conquered">Conquered</option>
                <option value="radar">On Radar</option>
                <option value="dreaming">Dreaming</option>
              </select>
              <input className="input" type="date" value={form.target_date} onChange={e => setForm({...form, target_date: e.target.value})} />
              <textarea className="textarea" placeholder="Notes" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
              <div className="row">
                <button className="btn" onClick={savePin}>SAVE</button>
                <button className="btn ghost" onClick={() => setNewPinCoords(null)}>CANCEL</button>
              </div>
            </div>
          )}

          {selected && (
            <div className="inline-form">
              <div className="tiny mono muted">PIN · #{selected.id}</div>
              <input className="input" value={selected.name} onChange={e => updateSelected({ name: e.target.value })} />
              <input className="input" placeholder="Country" value={selected.country || ''} onChange={e => updateSelected({ country: e.target.value })} />
              <select className="select" value={selected.status} onChange={e => updateSelected({ status: e.target.value })}>
                <option value="conquered">Conquered</option>
                <option value="radar">On Radar</option>
                <option value="dreaming">Dreaming</option>
              </select>
              <input className="input" type="date" value={selected.target_date || ''} onChange={e => updateSelected({ target_date: e.target.value })} />
              <textarea className="textarea" value={selected.notes || ''} onChange={e => updateSelected({ notes: e.target.value })} />
              <div className="row">
                <button className="btn danger" onClick={deletePin}>DELETE</button>
                <button className="btn ghost" onClick={() => setSelected(null)}>CLOSE</button>
              </div>
            </div>
          )}

          {!newPinCoords && !selected && (
            <div className="tiny muted" style={{ lineHeight: 1.5 }}>
              ▸ CLICK MAP TO ADD PIN<br/>
              ▸ CLICK PIN TO EDIT
            </div>
          )}
        </div>
      </div>
    </>
  );
}
