import React, { useEffect, useState } from 'react';
import CharacterSheet from './components/CharacterSheet.jsx';
import QuestLog from './components/QuestLog.jsx';
import Journal from './components/Journal.jsx';
import Inventory from './components/Inventory.jsx';
import Calendar from './components/Calendar.jsx';
import Fitness from './components/Fitness.jsx';
import TravelMap from './components/TravelMap.jsx';

class PanelBoundary extends React.Component {
  constructor(props) { super(props); this.state = { err: null }; }
  static getDerivedStateFromError(err) { return { err }; }
  componentDidCatch(err, info) { console.error(err, info); }
  render() {
    if (this.state.err) {
      return <div className="panel-error">Panel error: {String(this.state.err.message || this.state.err)}</div>;
    }
    return this.props.children;
  }
}

export default function App() {
  const [clock, setClock] = useState(() => new Date());

  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const timeStr = clock.toLocaleTimeString('en-US', { hour12: false });
  const dateStr = clock.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: '2-digit' });

  return (
    <>
      <div className="hud-topbar">
        <div className="brand">▰ COMMAND CENTER ▰</div>
        <div className="status">
          <span><span className="dot" />SYSTEM ONLINE</span>
          <span className="mono">{dateStr}</span>
          <span className="mono">{timeStr}</span>
        </div>
      </div>
      <div className="hud-grid">
        <div className="hud-panel panel-character">
          <PanelBoundary><CharacterSheet /></PanelBoundary>
        </div>
        <div className="hud-panel panel-quests">
          <PanelBoundary><QuestLog /></PanelBoundary>
        </div>
        <div className="hud-panel panel-fitness">
          <PanelBoundary><Fitness /></PanelBoundary>
        </div>
        <div className="hud-panel panel-calendar">
          <PanelBoundary><Calendar /></PanelBoundary>
        </div>
        <div className="hud-panel panel-inventory">
          <PanelBoundary><Inventory /></PanelBoundary>
        </div>
        <div className="hud-panel panel-travel">
          <PanelBoundary><TravelMap /></PanelBoundary>
        </div>
        <div className="hud-panel panel-journal">
          <PanelBoundary><Journal /></PanelBoundary>
        </div>
      </div>
    </>
  );
}
