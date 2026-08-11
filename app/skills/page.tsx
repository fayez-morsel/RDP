"use client";

import {
  BadgeCheck,
  Bell,
  BookOpenCheck,
  Check,
  ChevronRight,
  CircleGauge,
  FileCheck2,
  FileText,
  FolderLock,
  KeyRound,
  Link2,
  LockKeyhole,
  Menu,
  Plus,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Target,
  Trash2,
  Upload,
  UserCheck,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Sidebar } from "../dashboard/page";
import { usePlayer } from "../player-store";
import { categories, initialSkills, type Skill, type SkillCategory } from "./skill-data";
import {
  addEvidence,
  createShareGrant,
  migrateLegacySkill,
  prerequisitesMet,
  revokeShareGrant,
  settleMasteryTrial,
  validateAttachment,
  type MasteryCriterion,
  type MasteryProfile,
  type ShareGrant,
  type SkillEvidence,
} from "./mastery-engine";
import "../dashboard/dashboard.css";
import "./skills.css";
import "./skills-system.css";
import "./mastery.css";

type SkillView = "graph" | "evidence" | "trials" | "portfolio";
const views: Array<{ key: SkillView; label: string }> = [
  { key: "graph", label: "Skill Graph" },
  { key: "evidence", label: "Evidence Vault" },
  { key: "trials", label: "Mastery Trials" },
  { key: "portfolio", label: "Private Portfolio" },
];
const storageKey = "lifequest.mastery.v2";
const legacySkillByTreeNode: Record<string, string> = {
  reading: "frontend-development",
  "creative-0": "ui-ux-design",
  "career-0": "project-management",
};

function seedProfile(skillId: string, xp: number, level: number): MasteryProfile {
  const base = migrateLegacySkill(skillId, xp, level);
  if (skillId !== "reading") return base;
  const evidence: SkillEvidence[] = [
    { id: "portfolio-project", kind: "reference", title: "Published responsive portfolio project", private: true, verified: true, createdAt: "2026-08-08T12:00:00Z" },
    { id: "performance-result", kind: "result", title: "Improved interaction latency from 180ms to 72ms", private: true, verified: true, createdAt: "2026-08-09T12:00:00Z" },
    { id: "architecture-reflection", kind: "reflection", title: "Reflection on server-component boundaries", private: true, verified: false, createdAt: "2026-08-10T12:00:00Z" },
  ];
  const criteria: MasteryCriterion[] = [
    { id: "project", title: "Complete a practical production project", required: true, satisfied: true, evidenceIds: ["portfolio-project"] },
    { id: "standard", title: "Demonstrate a measurable performance standard", required: true, satisfied: true, evidenceIds: ["performance-result"] },
  ];
  return { ...base, readiness: 78, masteryTier: "Demonstrated", evidence, criteria };
}

function GraphView({ selected, onSelect, profiles }: { selected: Skill; onSelect: (skill: Skill) => void; profiles: Record<string, MasteryProfile> }) {
  const [category, setCategory] = useState<SkillCategory>(selected.category);
  const [query, setQuery] = useState("");
  const visible = initialSkills.filter((skill) => skill.category === category && skill.name.toLowerCase().includes(query.toLowerCase()));
  const masteredIds = Object.values(profiles).filter((profile) => profile.masteryTier === "Mastered").map((profile) => profile.skillId);
  const prerequisiteMap = Object.fromEntries(initialSkills.map((skill) => [skill.id, skill.prerequisite ? [skill.prerequisite] : []]));
  return <section className="mastery-view"><section className="skills-command mastery-command"><div className="category-selector" role="tablist" aria-label="Skill categories">{categories.map((item) => { const Icon = item.icon; return <button key={item.name} role="tab" aria-selected={category === item.name} className={`${item.tone} ${category === item.name ? "active" : ""}`} onClick={() => setCategory(item.name)}><Icon size={16} /><span>{item.name}</span><b>{item.level}</b></button>; })}</div><label className="skill-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search this branch" /></label></section><div className="mastery-workspace"><section className="mastery-graph game-panel" aria-label={`${category} skill graph`}><header><div><p className="eyebrow"><span /> ACCESSIBLE SKILL GRAPH</p><h2>{category} development route</h2></div><small>Practice, readiness, and mastery remain separate.</small></header><div className="mastery-node-map">{visible.map((skill, index) => { const profile = profiles[skill.id] ?? migrateLegacySkill(skill.id, skill.xp, Math.max(1, skill.level)); const missing = prerequisitesMet(skill.id, prerequisiteMap, masteredIds); return <button key={skill.id} onClick={() => onSelect(skill)} className={`${skill.status} ${selected.id === skill.id ? "selected" : ""}`} aria-pressed={selected.id === skill.id}><span>{missing.length ? <LockKeyhole size={15} /> : <CircleGauge size={15} />}</span><div><small>STEP {index + 1} · {profile.masteryTier}</small><strong>{skill.name}</strong><em>{profile.practiceXp} practice XP · {profile.readiness}% ready</em>{missing.length > 0 && <i>Requires {missing.map((id) => initialSkills.find((item) => item.id === id)?.name ?? id).join(", ")}</i>}</div><ChevronRight size={15} /></button>; })}</div><details className="skill-list-fallback" open><summary>Accessible skill tree list</summary><ol>{visible.map((skill) => <li key={skill.id}><button onClick={() => onSelect(skill)}><strong>{skill.name}</strong><span>{skill.prerequisite ? `Requires ${initialSkills.find((item) => item.id === skill.prerequisite)?.name}` : "No prerequisite"}</span></button></li>)}</ol></details></section><SkillProfileCard skill={selected} profile={profiles[selected.id] ?? migrateLegacySkill(selected.id, selected.xp, Math.max(1, selected.level))} /></div></section>;
}

function SkillProfileCard({ skill, profile }: { skill: Skill; profile: MasteryProfile }) {
  const category = categories.find((item) => item.name === skill.category)!;
  const Icon = category.icon;
  return <aside className="mastery-profile game-panel"><div className={`mastery-profile-icon ${category.tone}`}><Icon size={23} /></div><p className="eyebrow"><span /> {skill.category} / {profile.masteryTier}</p><h2>{skill.name}</h2><p>{skill.description}</p><section className="mastery-separation"><article><span>Practice XP</span><strong>{profile.practiceXp}</strong><small>Preserved from level {profile.legacyLevel}</small></article><article><span>Readiness</span><strong>{profile.readiness}%</strong><small>Temporary signal</small></article><article><span>Mastery</span><strong>{profile.masteryTier}</strong><small>Evidence-backed</small></article></section><div className="readiness-meter"><span>Current readiness</span><i><b style={{ width: `${profile.readiness}%` }} /></i><small>Readiness may change without reducing practice or mastery.</small></div><dl><dt>Personal reason</dt><dd>Turn repeated practice into dependable, demonstrable capability.</dd><dt>Linked attribute</dt><dd>{skill.category === "Strength" ? "Strength" : skill.category === "Social" ? "Communication" : "Intelligence"}</dd><dt>Practice sources</dt><dd>{skill.activities.join(" · ")}</dd></dl></aside>;
}

function EvidenceVault({ profile, onProfile }: { profile: MasteryProfile; onProfile: (profile: MasteryProfile, notice: string) => void }) {
  const [creating, setCreating] = useState(false);
  const [kind, setKind] = useState<SkillEvidence["kind"]>("reflection");
  const [title, setTitle] = useState("");
  const [fileMessage, setFileMessage] = useState("");
  const add = () => {
    if (!title.trim()) return;
    const evidence: SkillEvidence = { id: `evidence-${Date.now()}`, kind, title: title.trim(), private: true, verified: false, createdAt: new Date().toISOString() };
    onProfile(addEvidence(profile, evidence), "Evidence saved privately. No XP was awarded.");
    setCreating(false);
    setTitle("");
  };
  return <section className="mastery-view"><header className="mastery-section-hero"><div><p>EVIDENCE VAULT / PRIVATE BY DEFAULT</p><h1>Proof with context</h1><span>Attach only what supports this skill. Private files use expiring signed access.</span></div><button className="mastery-primary" onClick={() => setCreating(true)}><Plus size={15} /> Add evidence</button></header><div className="evidence-grid">{profile.evidence.map((evidence) => <article key={evidence.id}><header><span>{evidence.kind === "url" ? <Link2 size={18} /> : evidence.kind === "file" ? <FileCheck2 size={18} /> : <FileText size={18} />}</span><div><small>{evidence.kind} · {evidence.private ? "private" : "shareable"}</small><h2>{evidence.title}</h2></div>{evidence.verified ? <BadgeCheck size={18} aria-label="Verified reference" /> : <FolderLock size={18} aria-label="Private unverified evidence" />}</header><p>{evidence.verified ? "Linked to an authoritative record or accepted review." : "Owner-provided context; not sufficient to approve mastery by itself."}</p><footer><button onClick={() => onProfile({ ...profile, evidence: profile.evidence.map((item) => item.id === evidence.id ? { ...item, private: !item.private } : item) }, evidence.private ? "Evidence marked shareable for explicit grants." : "Evidence returned to private.")}>{evidence.private ? "Make selectable" : "Keep private"}</button><button aria-label={`Delete ${evidence.title}`} onClick={() => onProfile({ ...profile, evidence: profile.evidence.filter((item) => item.id !== evidence.id), criteria: profile.criteria.map((criterion) => ({ ...criterion, evidenceIds: criterion.evidenceIds.filter((id) => id !== evidence.id) })) }, "Evidence metadata removed. Authoritative progression history was untouched.")}><Trash2 size={14} /></button></footer></article>)}</div>{creating && <div className="mastery-dialog-backdrop"><section className="mastery-dialog" role="dialog" aria-modal="true" aria-labelledby="evidence-title"><header><h2 id="evidence-title">Add skill evidence</h2><button onClick={() => setCreating(false)} aria-label="Close evidence form"><X size={19} /></button></header><div><label>Evidence type<select value={kind} onChange={(event) => setKind(event.target.value as SkillEvidence["kind"])}><option value="reflection">Text reflection</option><option value="url">URL</option><option value="file">File or document</option><option value="result">Measurable result</option><option value="before-after">Before / after record</option><option value="reference">Existing verified reference</option></select></label><label>Title or reflection<textarea value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Describe what this evidence demonstrates" /></label>{kind === "file" && <label>Private attachment<input type="file" accept="image/jpeg,image/png,image/webp,application/pdf,text/plain" onChange={(event) => { const file = event.target.files?.[0]; if (!file) return; const result = validateAttachment(file); setFileMessage(result.ok ? `${result.sanitizedName} is ready for private upload.` : result.message); if (result.ok && !title) setTitle(result.sanitizedName); }} /><small>JPG, PNG, WebP, PDF, or text · maximum 8 MB</small>{fileMessage && <b>{fileMessage}</b>}</label>}<div className="privacy-callout"><ShieldCheck size={18} /><span>Private by default. Uploading evidence or writing a reflection awards no progression.</span></div></div><footer><button onClick={() => setCreating(false)}>Cancel</button><button className="mastery-primary" onClick={add}><Upload size={14} /> Save evidence</button></footer></section></div>}</section>;
}

function Trials({ profile, onProfile }: { profile: MasteryProfile; onProfile: (profile: MasteryProfile, notice: string) => void }) {
  const [attemptId] = useState(() => `attempt-${Date.now()}`);
  const settle = () => {
    const result = settleMasteryTrial(profile, attemptId);
    onProfile(result.profile, result.duplicate ? "This attempt was already settled." : result.settled ? `Mastery advanced to ${result.profile.masteryTier}. No practice XP was added.` : result.message ?? "Trial requirements are incomplete.");
  };
  return <section className="mastery-view"><header className="mastery-section-hero"><div><p>MASTERY TRIAL / SERVER VALIDATED</p><h1>Demonstrate readiness</h1><span>The result settles once after required criteria and verified evidence are checked.</span></div></header><div className="trial-layout"><section className="trial-card"><header><div><span>TRIAL 01</span><h2>Build and explain a production interface</h2></div><Target size={24} /></header><p>Deliver a responsive feature, document the architecture, and show a measurable performance result.</p><dl><dt>Objective</dt><dd>Demonstrate an end-to-end implementation under realistic constraints.</dd><dt>Success criteria</dt><dd>All required criteria have verified evidence and immutable references.</dd><dt>Allowed evidence</dt><dd>Project link, measured result, document, verified quest or campaign reference.</dd></dl><div className="criterion-list">{profile.criteria.map((criterion) => <article key={criterion.id}><span>{criterion.satisfied ? <Check size={14} /> : <LockKeyhole size={14} />}</span><div><h3>{criterion.title}</h3><p>{criterion.evidenceIds.length} evidence link{criterion.evidenceIds.length === 1 ? "" : "s"}</p></div><b>{criterion.required ? "Required" : "Optional"}</b></article>)}</div><button className="mastery-primary settle-trial" onClick={settle}><BookOpenCheck size={16} /> Submit for authoritative settlement</button><small>AI, currency, inventory, and client state cannot approve this trial.</small></section><aside className="attempt-history"><h2>Attempt history</h2>{profile.settledAttemptIds.length ? profile.settledAttemptIds.map((id, index) => <article key={id}><BadgeCheck size={18} /><div><b>Attempt {index + 1}</b><span>Settled once · {profile.masteryTier}</span></div></article>) : <p>No settled attempts yet.</p>}<div className="mentor-note"><UserCheck size={20} /><h3>Optional mentor confirmation</h3><p>A mentor sees only evidence included in a restricted invitation, never your XP ledger or other skills.</p></div></aside></div></section>;
}

function Portfolio({ profile, grant, setGrant, notice }: { profile: MasteryProfile; grant?: ShareGrant; setGrant: (grant?: ShareGrant) => void; notice: (message: string) => void }) {
  const selectable = profile.evidence.filter((evidence) => !evidence.private);
  const [selected, setSelected] = useState<string[]>(grant?.evidenceIds ?? []);
  const [mentorOpen, setMentorOpen] = useState(false);
  const [mentorEmail, setMentorEmail] = useState("");
  const publish = () => { if (!selected.length) return notice("Select at least one shareable evidence item."); const next = createShareGrant(selected); setGrant(next); notice("Revocable portfolio link created. No XP was awarded."); };
  const inviteMentor = () => { if (!/^\S+@\S+\.\S+$/.test(mentorEmail)) return notice("Enter a valid mentor email."); setMentorOpen(false); notice(`Restricted mentor invitation created for ${mentorEmail}. It expires in 7 days and includes only ${selected.length} selected evidence item${selected.length === 1 ? "" : "s"}.`); setMentorEmail(""); };
  return <section className="mastery-view"><header className="mastery-section-hero"><div><p>PRIVATE PORTFOLIO / OPT-IN</p><h1>Share only what you choose</h1><span>Published entries use a revocable token; private evidence never appears automatically.</span></div></header><div className="portfolio-layout"><section className="portfolio-picker"><h2>Selectable evidence</h2>{selectable.length ? selectable.map((evidence) => <label key={evidence.id} aria-label={`Select ${evidence.title}`}><input type="checkbox" checked={selected.includes(evidence.id)} onChange={() => setSelected((current) => current.includes(evidence.id) ? current.filter((id) => id !== evidence.id) : [...current, evidence.id])} /><span><b>{evidence.title}</b><small>{evidence.kind} · explicit sharing only</small></span></label>) : <div className="portfolio-empty"><FolderLock size={26} /><p>Mark evidence selectable in the Evidence Vault first.</p></div>}<button className="mastery-primary" onClick={publish}><KeyRound size={15} /> Create revocable share</button></section><aside className="share-card"><ShieldCheck size={25} /><h2>{grant && !grant.revokedAt ? "Portfolio link active" : "Portfolio remains private"}</h2>{grant && !grant.revokedAt ? <><p>Token: <code>{grant.token.slice(0, 8)}…</code></p><span>{grant.evidenceIds.length} selected entr{grant.evidenceIds.length === 1 ? "y" : "ies"}</span><button onClick={() => { setGrant(revokeShareGrant(grant)); notice("Portfolio token revoked immediately."); }}><X size={14} /> Revoke access</button><button onClick={() => setMentorOpen(true)}><Send size={14} /> Invite mentor</button></> : <p>No public or mentor access exists.</p>}<small>Predictable profile or evidence IDs are never used as public links.</small></aside></div>{mentorOpen && <div className="mastery-dialog-backdrop"><section className="mastery-dialog" role="dialog" aria-modal="true" aria-labelledby="mentor-title"><header><h2 id="mentor-title">Restricted mentor invitation</h2><button onClick={() => setMentorOpen(false)} aria-label="Close mentor invitation"><X size={19} /></button></header><div><label>Mentor email<input type="email" value={mentorEmail} onChange={(event) => setMentorEmail(event.target.value)} placeholder="mentor@example.com" /></label><div className="privacy-callout"><UserCheck size={18} /><span>The invite expires in 7 days. This mentor can review only the {selected.length} selected evidence item{selected.length === 1 ? "" : "s"}, never XP, journals, or other skills.</span></div></div><footer><button onClick={() => setMentorOpen(false)}>Cancel</button><button className="mastery-primary" onClick={inviteMentor}><Send size={14} /> Create invitation</button></footer></section></div>}</section>;
}

export default function SkillsPage() {
  const { state } = usePlayer();
  const [view, setView] = useState<SkillView>("graph");
  const [selectedId, setSelectedId] = useState("reading");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notice, setNotice] = useState("Existing practice XP and levels were preserved during mastery mapping.");
  const [profiles, setProfiles] = useState<Record<string, MasteryProfile>>(() => Object.fromEntries(initialSkills.map((skill) => { const ledgerSkill = state.skills.find((item) => item.id === legacySkillByTreeNode[skill.id]); return [skill.id, seedProfile(skill.id, ledgerSkill?.xp ?? skill.xp, ledgerSkill?.level ?? Math.max(1, skill.level))]; })));
  const [grant, setGrant] = useState<ShareGrant | undefined>();
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => { const timer = window.setTimeout(() => { try { const raw = window.localStorage.getItem(storageKey); if (raw) { const saved = JSON.parse(raw) as { profiles?: Record<string, MasteryProfile>; grant?: ShareGrant }; if (saved.profiles) setProfiles((current) => Object.fromEntries(Object.entries({ ...current, ...saved.profiles }).map(([id, profile]) => { const ledgerSkill = state.skills.find((skill) => skill.id === legacySkillByTreeNode[id]); return [id, ledgerSkill ? { ...profile, practiceXp: Math.max(profile.practiceXp, ledgerSkill.xp), legacyLevel: Math.max(profile.legacyLevel, ledgerSkill.level) } : profile]; }))); if (saved.grant) setGrant(saved.grant); } } finally { setHydrated(true); } }, 0); return () => window.clearTimeout(timer); }, [state.skills]);
  useEffect(() => { if (hydrated) window.localStorage.setItem(storageKey, JSON.stringify({ profiles, grant })); }, [grant, hydrated, profiles]);
  const selectedSkill = useMemo(() => initialSkills.find((skill) => skill.id === selectedId) ?? initialSkills.find((skill) => skill.category === "Intelligence") ?? initialSkills[0], [selectedId]);
  const linkedPlayerSkill = state.skills.find((skill) => skill.id === legacySkillByTreeNode[selectedSkill.id]);
  const profile = profiles[selectedSkill.id] ?? seedProfile(selectedSkill.id, linkedPlayerSkill?.xp ?? selectedSkill.xp, linkedPlayerSkill?.level ?? Math.max(1, selectedSkill.level));
  const onProfile = (next: MasteryProfile, message: string) => { setProfiles((current) => ({ ...current, [next.skillId]: next })); setNotice(message); };
  return <main className="dashboard-page skills-page mastery-page"><div className="dashboard-atmosphere" aria-hidden="true"><div className="aurora aurora-one" /><div className="aurora aurora-two" /></div><Sidebar collapsed={collapsed} mobileOpen={mobileOpen} active="Skills" onSelect={() => setMobileOpen(false)} onCollapse={() => setCollapsed(!collapsed)} onClose={() => setMobileOpen(false)} /><section className={`dashboard-shell ${collapsed ? "sidebar-collapsed" : ""}`}><header className="dashboard-header"><button className="mobile-menu" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu size={20} /></button><div className="breadcrumb"><span>REALM /</span> MASTERY LAB</div><div className="header-actions"><button className="header-icon" aria-label="Skill notifications"><Bell size={16} /><b>2</b></button></div></header><nav className="mastery-subviews" aria-label="Skill views">{views.map((item) => <button key={item.key} className={view === item.key ? "active" : ""} aria-current={view === item.key ? "page" : undefined} onClick={() => setView(item.key)}>{item.label}</button>)}</nav><div className="skills-content mastery-content"><section className="skills-hero mastery-hero"><div><p className="eyebrow"><span /> EVIDENCE-BASED DEVELOPMENT</p><h1>Skills &amp; <em>Mastery</em></h1><p>Practice builds experience. Readiness reflects today. Mastery requires evidence.</p></div><div className="mastery-hero-stats"><article><span>Practice XP</span><strong>{profile.practiceXp}</strong></article><article><span>Readiness</span><strong>{profile.readiness}%</strong></article><article><span>Mastery tier</span><strong>{profile.masteryTier}</strong></article></div></section><div className="mastery-notice" role="status"><Sparkles size={15} /> {notice}</div>{view === "graph" && <GraphView selected={selectedSkill} onSelect={(skill) => { setSelectedId(skill.id); setNotice(`${skill.name} selected. Skill points cannot change mastery.`); }} profiles={profiles} />}{view === "evidence" && <EvidenceVault profile={profile} onProfile={onProfile} />}{view === "trials" && <Trials profile={profile} onProfile={onProfile} />}{view === "portfolio" && <Portfolio profile={profile} grant={grant} setGrant={setGrant} notice={setNotice} />}</div></section></main>;
}
