import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { api } from '../api.js';

const STATUS_COLORS = {
  visited: '#00f5ff',
  planned: '#ffaa00',
  wishlist: '#9b59ff'
};
const STATUS_LABEL = {
  visited: 'VISITED',
  planned: 'PLANNED',
  wishlist: 'WISHLIST'
};

const COUNTRY_GEOJSON_URL =
  'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson';

function pinIcon(status) {
  const color = STATUS_COLORS[status] || STATUS_COLORS.planned;
  return L.divIcon({
    className: '',
    html: `<div class="custom-pin" style="background:${color};color:${color}"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7]
  });
}

function featureCode(f) {
  const p = f.properties || {};
  return (p.ISO_A3_EH && p.ISO_A3_EH !== '-99' && p.ISO_A3_EH)
      || (p.ISO_A3 && p.ISO_A3 !== '-99' && p.ISO_A3)
      || p.ADM0_A3
      || p.NAME;
}
function featureName(f) {
  const p = f.properties || {};
  return p.NAME_LONG || p.NAME || p.ADMIN || '';
}

export default function TravelMap() {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markerLayer = useRef(null);
  const countryLayer = useRef(null);
  const countryStatusRef = useRef({}); // { code: status }

  const [pins, setPins] = useState([]);
  const [countries, setCountries] = useState([]);
  const [counts, setCounts] = useState({ visited: 0, planned: 0, wishlist: 0, pins: 0 });
  const [selected, setSelected] = useState(null);          // selected pin
  const [newPinCoords, setNewPinCoords] = useState(null);
  const [selectedCountry, setSelectedCountry] = useState(null); // { code, name, status, notes }
  const [pinAddMode, setPinAddMode] = useState(false);
  const [err, setErr] = useState(null);
  const [pinForm, setPinForm] = useState({ name: '', country: '', status: 'planned', notes: '', target_date: '' });
  const [countryForm, setCountryForm] = useState({ status: 'planned', notes: '', target_date: '' });
  const [geojsonLoading, setGeojsonLoading] = useState(true);

  // ── Load travel data ──────────────────────────────────────────
  const load = async () => {
    try {
      const r = await api.get('/api/travel');
      setPins(r.pins);
      setCountries(r.countries);
      setCounts(r.counts);
      const map = {};
      for (const c of r.countries) map[c.country_code] = c.status;
      countryStatusRef.current = map;
      restyleCountries();
    } catch (e) { setErr(e.message); }
  };

  const restyleCountries = () => {
    if (!countryLayer.current) return;
    countryLayer.current.eachLayer(layer => {
      const code = featureCode(layer.feature);
      const status = countryStatusRef.current[code];
      layer.setStyle(countryStyle(status));
    });
  };

  const countryStyle = (status) => ({
    weight: 0.5,
    color: 'rgba(255,255,255,0.18)',
    fillColor: STATUS_COLORS[status] || '#222',
    fillOpacity: status ? 0.45 : 0.02
  });

  // ── Init map ──────────────────────────────────────────────────
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

    // Map background click → if pin-add mode, drop pin; else clear UI
    map.on('click', (e) => {
      if (pinAddModeRef.current) {
        setNewPinCoords({ lat: e.latlng.lat, lng: e.latlng.lng });
        setPinForm({ name: '', country: '', status: 'planned', notes: '', target_date: '' });
        setSelected(null);
        setSelectedCountry(null);
        setPinAddMode(false);
      }
    });

    mapInstance.current = map;
    setTimeout(() => map.invalidateSize(), 100);

    // Load country GeoJSON
    fetch(COUNTRY_GEOJSON_URL)
      .then(r => r.json())
      .then(geo => {
        countryLayer.current = L.geoJSON(geo, {
          style: f => countryStyle(countryStatusRef.current[featureCode(f)]),
          onEachFeature: (feature, layer) => {
            layer.on('click', (ev) => {
              L.DomEvent.stopPropagation(ev);
              if (pinAddModeRef.current) {
                // Let map click drop a pin; trigger via fireEvent
                setNewPinCoords({ lat: ev.latlng.lat, lng: ev.latlng.lng });
                setPinForm({
                  name: '',
                  country: featureName(feature),
                  status: 'planned',
                  notes: '',
                  target_date: ''
                });
                setSelected(null);
                setSelectedCountry(null);
                setPinAddMode(false);
                return;
              }
              const code = featureCode(feature);
              const name = featureName(feature);
              const existing = countryStatusRef.current[code];
              setSelectedCountry({ code, name });
              setCountryForm({
                status: existing || 'planned',
                notes: '',
                target_date: ''
              });
              setSelected(null);
              setNewPinCoords(null);
            });
            layer.on('mouseover', () => {
              layer.setStyle({ weight: 1.2, color: 'rgba(255,255,255,0.7)' });
            });
            layer.on('mouseout', () => {
              const code = featureCode(feature);
              layer.setStyle(countryStyle(countryStatusRef.current[code]));
            });
          }
        }).addTo(map);
        // Send countries below pins
        countryLayer.current.bringToBack();
        setGeojsonLoading(false);
        // Re-apply current statuses (in case load() finished first)
        restyleCountries();
      })
      .catch(e => {
        setErr(`Failed to load country borders: ${e.message}`);
        setGeojsonLoading(false);
      });

    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep latest pinAddMode in a ref so map handlers see the current value
  const pinAddModeRef = useRef(false);
  useEffect(() => { pinAddModeRef.current = pinAddMode; }, [pinAddMode]);

  // ── Render markers ─────────────────────────────────────────────
  useEffect(() => {
    if (!markerLayer.current) return;
    markerLayer.current.clearLayers();
    pins.forEach(p => {
      const marker = L.marker([p.lat, p.lng], { icon: pinIcon(p.status) });
      marker.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        setSelected(p);
        setSelectedCountry(null);
        setNewPinCoords(null);
      });
      marker.addTo(markerLayer.current);
    });
  }, [pins]);

  // ── Pin actions ────────────────────────────────────────────────
  const savePin = async () => {
    if (!pinForm.name || !newPinCoords) return;
    try {
      await api.post('/api/travel', { ...pinForm, lat: newPinCoords.lat, lng: newPinCoords.lng });
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

  // ── Country actions ────────────────────────────────────────────
  const saveCountry = async () => {
    if (!selectedCountry) return;
    try {
      await api.put(`/api/travel/countries/${selectedCountry.code}`, {
        country_name: selectedCountry.name,
        status: countryForm.status,
        notes: countryForm.notes,
        target_date: countryForm.target_date
      });
      countryStatusRef.current[selectedCountry.code] = countryForm.status;
      restyleCountries();
      setSelectedCountry(null);
      load();
    } catch (e) { setErr(e.message); }
  };
  const clearCountry = async () => {
    if (!selectedCountry) return;
    try {
      await api.del(`/api/travel/countries/${selectedCountry.code}`);
      delete countryStatusRef.current[selectedCountry.code];
      restyleCountries();
      setSelectedCountry(null);
      load();
    } catch (e) { setErr(e.message); }
  };

  const existingCountryRecord = selectedCountry
    ? countries.find(c => c.country_code === selectedCountry.code)
    : null;

  return (
    <>
      <div className="hud-panel-header">
        <span><span className="spark" />07 · TRAVEL / EXPLORATION</span>
        <div className="row" style={{ gap: 10 }}>
          <span className="pin-count" style={{ color: STATUS_COLORS.visited }}>
            ✓ {counts.visited}
          </span>
          <span className="pin-count" style={{ color: STATUS_COLORS.planned }}>
            ▸ {counts.planned}
          </span>
          <span className="pin-count" style={{ color: STATUS_COLORS.wishlist }}>
            ✦ {counts.wishlist}
          </span>
        </div>
      </div>
      <div className="map-wrap">
        <div ref={mapRef} style={{ flex: 1 }} />
        <div className="travel-sidebar">
          {err && <div className="panel-error">{err}</div>}
          {geojsonLoading && <div className="tiny mono muted">▸ LOADING COUNTRY BORDERS…</div>}

          <div className="pin-count">
            <span className="big">{counts.visited}</span>
            COUNTRIES VISITED
          </div>
          <div className="tiny mono muted" style={{ marginTop: 4 }}>
            {counts.pins} PINS · {counts.planned} PLANNED · {counts.wishlist} WISHLIST
          </div>

          <div className="divider" />

          <div className="tiny mono muted">// LEGEND</div>
          <div className="tiny" style={{ lineHeight: 1.8 }}>
            <div><span className="custom-pin" style={{ background: STATUS_COLORS.visited, display: 'inline-block', marginRight: 6, verticalAlign: 'middle' }} /> VISITED</div>
            <div><span className="custom-pin" style={{ background: STATUS_COLORS.planned, display: 'inline-block', marginRight: 6, verticalAlign: 'middle' }} /> PLANNED</div>
            <div><span className="custom-pin" style={{ background: STATUS_COLORS.wishlist, display: 'inline-block', marginRight: 6, verticalAlign: 'middle' }} /> WISHLIST</div>
          </div>

          <div className="divider" />

          <button
            className={`btn ${pinAddMode ? 'danger' : ''}`}
            style={{ width: '100%' }}
            onClick={() => {
              setPinAddMode(m => !m);
              setSelected(null); setSelectedCountry(null); setNewPinCoords(null);
            }}
          >
            {pinAddMode ? '× CANCEL PIN MODE' : '+ ADD PIN (CLICK MAP)'}
          </button>

          <div className="divider" />

          {/* Country form */}
          {selectedCountry && (
            <div className="inline-form">
              <div className="tiny mono muted">COUNTRY · {selectedCountry.code}</div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{selectedCountry.name}</div>

              <select className="select" value={countryForm.status} onChange={e => setCountryForm({...countryForm, status: e.target.value})}>
                <option value="visited">Visited</option>
                <option value="planned">Planned</option>
                <option value="wishlist">Wishlist</option>
              </select>
              <input className="input" type="date" placeholder="Target date" value={countryForm.target_date} onChange={e => setCountryForm({...countryForm, target_date: e.target.value})} />
              <textarea className="textarea" placeholder="Notes" value={countryForm.notes} onChange={e => setCountryForm({...countryForm, notes: e.target.value})} />

              {existingCountryRecord && (
                <div className="tiny muted">
                  Currently: <span className="badge" style={{ color: STATUS_COLORS[existingCountryRecord.status] }}>
                    {STATUS_LABEL[existingCountryRecord.status]}
                  </span>
                  {existingCountryRecord.notes && <div style={{ marginTop: 4 }}>{existingCountryRecord.notes}</div>}
                </div>
              )}

              <div className="row">
                <button className="btn" onClick={saveCountry}>SAVE</button>
                {existingCountryRecord && <button className="btn danger" onClick={clearCountry}>CLEAR</button>}
                <button className="btn ghost" onClick={() => setSelectedCountry(null)}>×</button>
              </div>
            </div>
          )}

          {/* New pin form */}
          {newPinCoords && (
            <div className="inline-form">
              <div className="tiny mono muted">NEW PIN @ {newPinCoords.lat.toFixed(3)}, {newPinCoords.lng.toFixed(3)}</div>
              <input className="input" placeholder="Name" value={pinForm.name} onChange={e => setPinForm({...pinForm, name: e.target.value})} />
              <input className="input" placeholder="Country" value={pinForm.country} onChange={e => setPinForm({...pinForm, country: e.target.value})} />
              <select className="select" value={pinForm.status} onChange={e => setPinForm({...pinForm, status: e.target.value})}>
                <option value="visited">Visited</option>
                <option value="planned">Planned</option>
                <option value="wishlist">Wishlist</option>
              </select>
              <input className="input" type="date" value={pinForm.target_date} onChange={e => setPinForm({...pinForm, target_date: e.target.value})} />
              <textarea className="textarea" placeholder="Notes" value={pinForm.notes} onChange={e => setPinForm({...pinForm, notes: e.target.value})} />
              <div className="row">
                <button className="btn" onClick={savePin}>SAVE</button>
                <button className="btn ghost" onClick={() => setNewPinCoords(null)}>CANCEL</button>
              </div>
            </div>
          )}

          {/* Selected pin edit */}
          {selected && (
            <div className="inline-form">
              <div className="tiny mono muted">PIN · #{selected.id}</div>
              <input className="input" value={selected.name} onChange={e => updateSelected({ name: e.target.value })} />
              <input className="input" placeholder="Country" value={selected.country || ''} onChange={e => updateSelected({ country: e.target.value })} />
              <select className="select" value={selected.status} onChange={e => updateSelected({ status: e.target.value })}>
                <option value="visited">Visited</option>
                <option value="planned">Planned</option>
                <option value="wishlist">Wishlist</option>
              </select>
              <input className="input" type="date" value={selected.target_date || ''} onChange={e => updateSelected({ target_date: e.target.value })} />
              <textarea className="textarea" value={selected.notes || ''} onChange={e => updateSelected({ notes: e.target.value })} />
              <div className="row">
                <button className="btn danger" onClick={deletePin}>DELETE</button>
                <button className="btn ghost" onClick={() => setSelected(null)}>CLOSE</button>
              </div>
            </div>
          )}

          {!newPinCoords && !selected && !selectedCountry && !pinAddMode && (
            <div className="tiny muted" style={{ lineHeight: 1.6 }}>
              ▸ CLICK A COUNTRY TO SET STATUS<br/>
              ▸ CLICK A PIN TO EDIT<br/>
              ▸ +ADD PIN ABOVE TO DROP NEW PINS
            </div>
          )}
          {pinAddMode && (
            <div className="tiny mono" style={{ color: STATUS_COLORS.planned, lineHeight: 1.6 }}>
              ▸ PIN-ADD MODE<br/>
              CLICK ANYWHERE ON MAP
            </div>
          )}
        </div>
      </div>
    </>
  );
}
