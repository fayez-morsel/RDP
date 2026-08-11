"use client";

import { lazy, Suspense, useEffect, useState } from "react";
import "./character.css";
import "./character-fixes.css";
import "./character-performance.css";
import { OnboardingCalibration } from "./onboarding-calibration";

const CharacterScene3D = lazy(() => import("./CharacterScene3D"));

type AttributeKey = "strength" | "intelligence" | "discipline" | "vitality" | "wealth" | "charisma";
type Gender = "male" | "female" | "neutral";
const details: Record<AttributeKey, { label: string; icon: string; tip: string; zone: string }> = {
  strength: { label: "Strength", icon: "01", tip: "Physical training, movement and performance.", zone: "body" },
  intelligence: { label: "Intelligence", icon: "02", tip: "Learning, study and knowledge development.", zone: "head" },
  discipline: { label: "Discipline", icon: "03", tip: "Consistency, focus and execution.", zone: "core" },
  vitality: { label: "Vitality", icon: "04", tip: "Sleep, recovery, nutrition and energy.", zone: "torso" },
  wealth: { label: "Wealth", icon: "05", tip: "Career, business and financial growth.", zone: "core" },
  charisma: { label: "Charisma", icon: "06", tip: "Communication, leadership and relationships.", zone: "head" },
};
const base: Record<AttributeKey, number> = { strength: 1, intelligence: 1, discipline: 1, vitality: 1, wealth: 1, charisma: 1 };
const types: { value: Gender; label: string; mark: string }[] = [{ value: "male", label: "Male", mark: "♂" }, { value: "female", label: "Female", mark: "♀" }, { value: "neutral", label: "Neutral", mark: "◉" }];

function IdentityHud({ name, setName, age, setAge, gender, setGender }: { name: string; setName: (v: string) => void; age: string; setAge: (v: string) => void; gender: Gender; setGender: (v: Gender) => void }) {
  return <aside className="identity-hud">
    <p className="section-kicker"><span>01</span> IDENTITY</p>
    <label className="hud-input-label" htmlFor="name">NAME</label>
    <div className="hud-input"><input id="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={24} placeholder="YOUR NAME" aria-invalid={!name.trim()} /></div>
    {!name.trim() && <p className="error">Identity designation required.</p>}
    <p className="micro-label">CHARACTER TYPE</p>
    <div className="type-controls" role="radiogroup" aria-label="Character type">
      {types.map((item) => <button key={item.value} type="button" role="radio" aria-checked={gender === item.value} className={gender === item.value ? "active" : ""} onClick={() => setGender(item.value)}><b>{item.mark}</b><span>{item.label}</span></button>)}
    </div>
    <label className="age-control" htmlFor="age"><span>AGE <em>OPTIONAL</em></span><input id="age" value={age} type="number" min="1" max="120" onChange={(e) => setAge(e.target.value)} placeholder="--" /></label>
    <div className="identity-status"><i /> IDENTITY CHANNEL / READY</div>
  </aside>;
}

function AttributeMeters({ stats, remaining, update, active, setActive }: { stats: Record<AttributeKey, number>; remaining: number; update: (key: AttributeKey, value: number) => void; active: AttributeKey | null; setActive: (v: AttributeKey | null) => void }) {
  return <aside className="attribute-hud">
    <div className="attribute-heading"><p className="section-kicker"><span>02</span> ATTRIBUTE MATRIX</p><div className="point-readout"><span>POINTS</span><b>{remaining}<small>/12</small></b></div></div>
    <div className="level-up"><span>LEVEL UP</span><i><b /></i><strong>103 <em>/ 280</em></strong></div>
    <div className="meters">{(Object.keys(details) as AttributeKey[]).map((key) => { const item = details[key]; return <div className={`meter ${active === key ? "active" : ""}`} key={key} onMouseEnter={() => setActive(key)} onMouseLeave={() => setActive(null)} onFocus={() => setActive(key)} onBlur={() => setActive(null)}>
      <div className="meter-top"><button type="button" aria-describedby={`${key}-tip`}><i>{item.icon}</i>{item.label}</button><b>{stats[key]}<small>/5</small></b></div>
      <input type="range" min="1" max="5" value={stats[key]} aria-label={`${item.label} self assessment`} style={{ "--value": String(stats[key]) } as React.CSSProperties} onChange={(e) => update(key, Number(e.target.value))} />
      <span className="meter-tooltip" role="tooltip" id={`${key}-tip`}>{item.tip}</span>
    </div>; })}</div>
  </aside>;
}

function InitializationOverlay({ step, ready }: { step: number; ready: boolean }) {
  const messages = ["INITIALIZING SYSTEM...", "SAVING IDENTITY...", "CALIBRATING ATTRIBUTES...", "CHARACTER REGISTERED", "SYSTEM ONLINE"];
  return <div className="initialization" role="status" aria-live="assertive"><div className="terminal"><p>SYSTEM / INITIALIZATION</p>{messages.slice(0, step + 1).map((message, index) => <div className={index === step ? "current" : "done"} key={message}>{index < step ? "OK" : ">"} {message}</div>)}{ready && <h2>SYSTEM READY</h2>}</div></div>;
}

export default function Home() {
  const [name, setName] = useState("F-A-Y"); const [age, setAge] = useState(""); const [gender, setGender] = useState<Gender>("neutral");
  const [stats, setStats] = useState(base); const [active, setActive] = useState<AttributeKey | null>(null); const [initializing, setInitializing] = useState(false); const [ready, setReady] = useState(false); const [step, setStep] = useState(0);
  const spent = Object.values(stats).reduce((sum, value) => sum + value, 0) - 6; const remaining = 12 - spent; const displayName = name.trim() || "UNNAMED";
  useEffect(() => { if (!initializing) return; if (step < 4) { const timer = window.setTimeout(() => setStep((value) => value + 1), 300); return () => window.clearTimeout(timer); } const timer = window.setTimeout(() => setReady(true), 430); return () => window.clearTimeout(timer); }, [initializing, step]);
  useEffect(() => { if (!ready) return; const timer = window.setTimeout(() => window.location.assign("/dashboard"), 750); return () => window.clearTimeout(timer); }, [ready]);
  const update = (key: AttributeKey, value: number) => { const projected = spent - (stats[key] - 1) + (value - 1); if (projected <= 12) setStats({ ...stats, [key]: value }); };
  return <main className="system-page">
    <OnboardingCalibration />
    <div className="atmosphere" aria-hidden="true"><div className="fog" /><div className="floor-grid" /><i className="dot d1" /><i className="dot d2" /><i className="dot d3" /><i className="scan" /></div>
    <div className="system-frame" aria-hidden="true"><i /><i /><i /><i /><b>SYS // 01</b><em>UPLINK STABLE</em></div>
    <header className="page-header"><p>SYSTEM / CHARACTER PROTOCOL</p><h1>Character Creation</h1><span>Configure your identity and initialize your SYSTEM.</span></header>
    <div className="creation-layout">
      <IdentityHud name={name} setName={setName} age={age} setAge={setAge} gender={gender} setGender={setGender} />
      <section className="character-stage">
        <div className="avatar-hex" aria-hidden="true"><i /><i /><i /><span>E</span></div>
        <div className="avatar-arrow avatar-arrow-left" aria-hidden="true">‹</div><div className="avatar-arrow avatar-arrow-right" aria-hidden="true">›</div>
        <div className="character-data"><strong>{displayName}</strong><span>LEVEL 1 <i /> RANK E</span><div className="xp"><b>XP</b><i /><em>0 / 100</em></div></div>
        <div className="scene-shell"><Suspense fallback={<div className="scene-loading" aria-label="Loading character preview" role="status" />}><CharacterScene3D gender={gender} activeZone={active ? details[active].zone : null} /></Suspense></div>
        <div className="stage-readout"><span>LEVEL <b>1</b></span><i /><span>RANK <b>E</b></span><i /><span>POINTS <b>{remaining}</b></span></div>
      </section>
      <AttributeMeters stats={stats} remaining={remaining} update={update} active={active} setActive={setActive} />
    </div>
    <footer className="page-footer"><button className="continue" type="button" onClick={() => { if (name.trim()) { setStep(0); setInitializing(true); } }} disabled={!name.trim()}><span>CONTINUE</span></button><p>Your starting attributes can evolve through real-world progress.</p></footer>
    {initializing && <InitializationOverlay step={step} ready={ready} />}
  </main>;
}
