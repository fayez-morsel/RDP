"use client";

import { useEffect, useMemo, useState } from "react";

type AttributeKey = "strength" | "intelligence" | "discipline" | "vitality" | "wealth" | "charisma";
type Gender = "male" | "female" | "neutral";

const attributeInfo: Record<AttributeKey, { label: string; icon: string; description: string; zone: string }> = {
  strength: { label: "Strength", icon: "✦", description: "Physical training, movement and performance.", zone: "body" },
  intelligence: { label: "Intelligence", icon: "◉", description: "Learning, study and knowledge development.", zone: "head" },
  discipline: { label: "Discipline", icon: "◈", description: "Consistency, focus and execution.", zone: "core" },
  vitality: { label: "Vitality", icon: "⊹", description: "Sleep, recovery, nutrition and energy.", zone: "torso" },
  wealth: { label: "Wealth", icon: "◇", description: "Career, business and financial growth.", zone: "core" },
  charisma: { label: "Charisma", icon: "☼", description: "Communication, leadership and relationships.", zone: "head" },
};

const initialStats: Record<AttributeKey, number> = { strength: 1, intelligence: 1, discipline: 1, vitality: 1, wealth: 1, charisma: 1 };
const genderChoices: { value: Gender; label: string; glyph: string }[] = [
  { value: "male", label: "Male", glyph: "◐" }, { value: "female", label: "Female", glyph: "◑" }, { value: "neutral", label: "Neutral", glyph: "◇" },
];

function Character({ gender, activeZone }: { gender: Gender; activeZone: string | null }) {
  return <div className={`character-wrap ${gender} ${activeZone ? `zone-${activeZone}` : ""}`} aria-label="Holographic character preview">
    <div className="rank-core" aria-hidden="true"><span>E</span></div>
    <div className="character-float">
      <div className="head" />
      <div className="neck" />
      <div className="torso"><i /><i /><i /></div>
      <div className="arm left" /><div className="arm right" />
      <div className="hips" />
      <div className="leg left" /><div className="leg right" />
    </div>
    <div className="scan-line" />
    <div className="platform"><span /><span /><span /></div>
  </div>;
}

export default function Home() {
  const [name, setName] = useState("Fayez");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState<Gender>("neutral");
  const [stats, setStats] = useState(initialStats);
  const [active, setActive] = useState<AttributeKey | null>(null);
  const [initializing, setInitializing] = useState(false);
  const [ready, setReady] = useState(false);
  const spent = Object.values(stats).reduce((a, b) => a + b, 0) - 6;
  const remaining = 12 - spent;
  const displayName = name.trim() || "UNNAMED";
  const steps = ["INITIALIZING SYSTEM...", "SAVING IDENTITY...", "CALIBRATING ATTRIBUTES...", "CHARACTER REGISTERED", "SYSTEM ONLINE"];
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!initializing) return;
    if (step < steps.length - 1) {
      const id = window.setTimeout(() => setStep((s) => s + 1), 300);
      return () => window.clearTimeout(id);
    }
    const id = window.setTimeout(() => setReady(true), 430);
    return () => window.clearTimeout(id);
  }, [initializing, step]);

  useEffect(() => {
    if (!ready) return;
    const id = window.setTimeout(() => window.location.assign("/dashboard"), 750);
    return () => window.clearTimeout(id);
  }, [ready]);

  const updateStat = (key: AttributeKey, value: number) => {
    const current = stats[key];
    const nextSpent = spent - (current - 1) + (value - 1);
    if (nextSpent <= 12) setStats({ ...stats, [key]: value });
  };
  const start = () => {
    if (!name.trim()) return;
    setStep(0); setInitializing(true);
  };
  const panelStyle = useMemo(() => ({ "--gender-shift": gender === "female" ? "-5px" : gender === "male" ? "5px" : "0px" }) as React.CSSProperties, [gender]);
  return <main className="system-page" style={panelStyle}>
    <div className="environment" aria-hidden="true"><div className="grid-floor" /><div className="particle p1" /><div className="particle p2" /><div className="particle p3" /></div>
    <div className="hud-frame" aria-hidden="true"><b /><b /><b /><b /></div>
    <header className="page-header"><div className="status"><i /> SYSTEM / 01</div><h1>Character Creation</h1><p>Configure your identity and initialize your SYSTEM.</p><div className="header-line" /></header>
    <section className="creation-grid">
      <aside className="hud-card identity-panel">
        <div className="panel-label"><span>01</span> IDENTITY</div>
        <label className="field-label" htmlFor="name">Name</label>
        <input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" maxLength={24} aria-invalid={!name.trim()} />
        {!name.trim() && <p className="field-error">Enter a name to initialize.</p>}
        <p className="field-label type-label">Character Type</p>
        <div className="gender-grid" role="radiogroup" aria-label="Character type">
          {genderChoices.map((choice) => <button key={choice.value} type="button" role="radio" aria-checked={gender === choice.value} className={gender === choice.value ? "selected" : ""} onClick={() => setGender(choice.value)}><b>{choice.glyph}</b><span>{choice.label}</span></button>)}
        </div>
        <label className="field-label age-label" htmlFor="age">Age <em>optional</em></label>
        <input id="age" type="number" min="1" max="120" value={age} onChange={(e) => setAge(e.target.value)} placeholder="--" />
        <div className="identity-footer"><span>STATUS</span><b>READY</b><i /></div>
      </aside>

      <section className="character-panel">
        <div className="level-display"><span>{displayName}</span><div><b>LEVEL 1</b><i /> <b>RANK E</b></div><div className="xp"><small>XP</small><div><i /></div><small>0 / 100</small></div></div>
        <div className="connection left-connection" /><div className="connection right-connection" />
        <Character gender={gender} activeZone={active ? attributeInfo[active].zone : null} />
        <div className="mini-stats"><div><span>LEVEL</span><b>1</b></div><div><span>RANK</span><b>E</b></div><div><span>AVAILABLE POINTS</span><b>{remaining}</b></div></div>
      </section>

      <aside className="hud-card attributes-panel">
        <div className="panel-label"><span>02</span> INITIAL ATTRIBUTES</div>
        <div className="points"><span>POINTS REMAINING</span><b>{remaining}<small> / 12</small></b></div>
        <div className="attributes">
          {(Object.keys(attributeInfo) as AttributeKey[]).map((key) => {
            const item = attributeInfo[key];
            return <div className={`attribute ${active === key ? "active" : ""}`} key={key} onMouseEnter={() => setActive(key)} onMouseLeave={() => setActive(null)} onFocus={() => setActive(key)} onBlur={() => setActive(null)}>
              <div className="attribute-heading"><button type="button" aria-label={`${item.label}: ${item.description}`}><i>{item.icon}</i>{item.label}</button><b>{stats[key]}<small>/5</small></b></div>
              <input aria-label={`${item.label} value`} type="range" min="1" max="5" value={stats[key]} style={{ "--value": stats[key] } as React.CSSProperties} onChange={(e) => updateStat(key, Number(e.target.value))} />
              <p role="tooltip">{item.description}</p>
            </div>;
          })}
        </div>
      </aside>
    </section>
    <footer className="page-footer"><button type="button" className="initialize" disabled={!name.trim()} onClick={start}><span>INITIALIZE SYSTEM</span></button><p>Your starting attributes can evolve through real-world progress.</p></footer>
    {initializing && <div className="initialization" role="status" aria-live="assertive"><div className="terminal"><p>SYSTEM // INITIALIZATION</p>{steps.slice(0, step + 1).map((item, index) => <div key={item} className={index === step ? "current" : "done"}>{index < step ? "✓" : ">"} {item}</div>)}{ready && <h2>SYSTEM READY</h2>}</div></div>}
  </main>;
}
