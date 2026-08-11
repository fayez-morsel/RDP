"use client";
/* eslint-disable jsx-a11y/no-autofocus */

import {
  AlertTriangle,
  Archive,
  ArrowLeft,
  CalendarClock,
  Check,
  ChevronRight,
  Circle,
  Edit3,
  Flag,
  LockKeyhole,
  Pause,
  Play,
  Plus,
  Shield,
  Sparkles,
  Swords,
  Target,
  TrendingUp,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  contributeToBoss,
  forecastCampaign,
  remainingPrerequisites,
  unlockCampaignQuests,
  type BossState,
  type CampaignQuest,
  type Dependency,
} from "../campaign-engine";
import "./campaigns.css";

type CampaignStatus =
  | "draft"
  | "active"
  | "paused"
  | "completed"
  | "abandoned"
  | "archived";
type Milestone = { id: string; title: string; completed: boolean };
type Intention = { situation: string; response: string; cue: string; powerUp: string };
type Campaign = {
  id: string;
  title: string;
  outcome: string;
  why: string;
  lifeArea: string;
  attributes: string[];
  skills: string[];
  startDate: string;
  targetDate?: string;
  priority: number;
  status: CampaignStatus;
  successCriteria: string;
  weeklyCapacity: number;
  privacy: "private" | "allies" | "public";
  milestones: Milestone[];
  quests: CampaignQuest[];
  dependencies: Dependency[];
  obstacles: Array<{ obstacle: string; response: string }>;
  intention: Intention;
  boss: BossState & { title: string; phases: string[] };
};

const storageKey = "lifequest.campaigns.v1";
const seedCampaign: Campaign = {
  id: "portfolio-launch",
  title: "Portfolio Launch",
  outcome: "Publish a focused case study that opens a new career realm.",
  why: "Show the quality of my thinking, not only the final screens.",
  lifeArea: "Career",
  attributes: ["Creativity", "Communication"],
  skills: ["UI/UX Design", "Front-End Development"],
  startDate: "2026-08-04",
  targetDate: "2026-08-28",
  priority: 5,
  status: "active",
  successCriteria: "One published, mobile-ready case study reviewed by two peers.",
  weeklyCapacity: 180,
  privacy: "private",
  milestones: [
    { id: "story", title: "Shape the story", completed: true },
    { id: "evidence", title: "Refine the evidence", completed: false },
    { id: "publish", title: "Publish and review", completed: false },
  ],
  quests: [
    { id: "outline", title: "Finish narrative outline", estimatedMinutes: 60, status: "completed" },
    { id: "evidence-pass", title: "Complete evidence pass", estimatedMinutes: 90, status: "available" },
    { id: "visual-treatment", title: "Publish visual treatment", estimatedMinutes: 150, status: "locked" },
  ],
  dependencies: [
    { questId: "evidence-pass", prerequisiteQuestId: "outline" },
    { questId: "visual-treatment", prerequisiteQuestId: "evidence-pass" },
  ],
  obstacles: [{ obstacle: "Perfectionism slows publishing", response: "Time-box the polish pass to 45 minutes." }],
  intention: {
    situation: "I start polishing before the story is complete",
    response: "I will write the next rough section first",
    cue: "Weekdays at 18:30",
    powerUp: "Open the outline and work for five minutes",
  },
  boss: {
    title: "The Final Review",
    healthTotal: 300,
    healthRemaining: 240,
    rewarded: false,
    contributionIds: ["outline"],
    phases: ["Story integrity", "Visual polish", "Publish"],
  },
};

const blankCampaign = (): Campaign => ({
  id: "",
  title: "",
  outcome: "",
  why: "",
  lifeArea: "Personal Growth",
  attributes: [],
  skills: [],
  startDate: new Date().toISOString().slice(0, 10),
  priority: 3,
  status: "draft",
  successCriteria: "",
  weeklyCapacity: 120,
  privacy: "private",
  milestones: [],
  quests: [],
  dependencies: [],
  obstacles: [],
  intention: { situation: "", response: "", cue: "", powerUp: "" },
  boss: { title: "Campaign Boss", healthTotal: 300, healthRemaining: 300, rewarded: false, contributionIds: [], phases: ["Prepare", "Execute", "Complete"] },
});

function CampaignWizard({ initial, onClose, onSave }: { initial?: Campaign; onClose: () => void; onSave: (campaign: Campaign) => void }) {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Campaign>(initial ?? blankCampaign());
  const [milestoneText, setMilestoneText] = useState("");
  const canContinue = step > 0 || Boolean(draft.title.trim() && draft.outcome.trim());
  const save = (status: CampaignStatus) => {
    const generatedQuests = draft.quests.length ? draft.quests : draft.milestones.map((milestone, index) => ({ id: `quest-${milestone.id}`, title: milestone.title, estimatedMinutes: 60, status: index === 0 ? "available" as const : "locked" as const }));
    const generatedDependencies = draft.dependencies.length ? draft.dependencies : generatedQuests.slice(1).map((quest, index) => ({ questId: quest.id, prerequisiteQuestId: generatedQuests[index].id }));
    onSave({
      ...draft,
      id: draft.id || `campaign-${Date.now()}`,
      title: draft.title.trim() || "Untitled campaign",
      outcome: draft.outcome.trim(),
      status,
      quests: generatedQuests,
      dependencies: generatedDependencies,
    });
  };
  return <div className="campaign-dialog-backdrop"><section className="campaign-dialog" role="dialog" aria-modal="true" aria-labelledby="campaign-wizard-title"><header><div><p className="eyebrow"><span /> CAMPAIGN FORGE</p><h2 id="campaign-wizard-title">{initial ? "Edit campaign" : "Create a campaign"}</h2></div><button onClick={onClose} aria-label="Close campaign wizard"><X size={20} /></button></header><nav aria-label="Campaign creation progress">{["Outcome", "Plan", "Support"].map((label, index) => <button key={label} className={step === index ? "active" : ""} onClick={() => setStep(index)}><span>{index + 1}</span>{label}</button>)}</nav><div className="campaign-form">
    {step === 0 && <><label>Campaign title<input autoFocus value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="Launch my portfolio" /></label><label>Desired outcome<textarea value={draft.outcome} onChange={(event) => setDraft({ ...draft, outcome: event.target.value })} placeholder="A concise, observable result" /></label><label>Why this matters<textarea value={draft.why} onChange={(event) => setDraft({ ...draft, why: event.target.value })} placeholder="Your personal reason" /></label><div className="campaign-form-row"><label>Life area<select value={draft.lifeArea} onChange={(event) => setDraft({ ...draft, lifeArea: event.target.value })}><option>Career</option><option>Learning</option><option>Health</option><option>Fitness</option><option>Relationships</option><option>Personal Growth</option></select></label><label>Priority<select value={draft.priority} onChange={(event) => setDraft({ ...draft, priority: Number(event.target.value) })}>{[1, 2, 3, 4, 5].map((priority) => <option key={priority} value={priority}>{priority}</option>)}</select></label></div><label>Success criteria<textarea value={draft.successCriteria} onChange={(event) => setDraft({ ...draft, successCriteria: event.target.value })} placeholder="How will you know the outcome is complete?" /></label></>}
    {step === 1 && <><div className="campaign-form-row"><label>Start date<input type="date" value={draft.startDate} onChange={(event) => setDraft({ ...draft, startDate: event.target.value })} /></label><label>Optional target date<input type="date" min={draft.startDate} value={draft.targetDate ?? ""} onChange={(event) => setDraft({ ...draft, targetDate: event.target.value || undefined })} /></label></div><label>Weekly capacity (minutes)<input type="number" min="15" max="10080" value={draft.weeklyCapacity} onChange={(event) => setDraft({ ...draft, weeklyCapacity: Math.max(15, Number(event.target.value)) })} /></label><fieldset><legend>Milestones</legend><div className="inline-add"><input value={milestoneText} onChange={(event) => setMilestoneText(event.target.value)} placeholder="Add an ordered milestone" /><button type="button" onClick={() => { if (!milestoneText.trim()) return; setDraft({ ...draft, milestones: [...draft.milestones, { id: `milestone-${Date.now()}`, title: milestoneText.trim(), completed: false }] }); setMilestoneText(""); }}><Plus size={15} /> Add</button></div>{draft.milestones.map((milestone, index) => <div className="wizard-list-row" key={milestone.id}><span>{index + 1}</span><b>{milestone.title}</b><button aria-label={`Remove ${milestone.title}`} onClick={() => setDraft({ ...draft, milestones: draft.milestones.filter((item) => item.id !== milestone.id) })}><X size={14} /></button></div>)}</fieldset></>}
    {step === 2 && <><label>Privacy<select value={draft.privacy} onChange={(event) => setDraft({ ...draft, privacy: event.target.value as Campaign["privacy"] })}><option value="private">Private</option><option value="allies">Allies</option><option value="public">Public</option></select></label><h3>If–then plan <small>Optional · no XP awarded</small></h3><div className="intention-builder"><label>If<input value={draft.intention.situation} onChange={(event) => setDraft({ ...draft, intention: { ...draft.intention, situation: event.target.value } })} placeholder="an obstacle appears" /></label><label>Then I will<input value={draft.intention.response} onChange={(event) => setDraft({ ...draft, intention: { ...draft.intention, response: event.target.value } })} placeholder="take a specific response" /></label><label>Time or context cue<input value={draft.intention.cue} onChange={(event) => setDraft({ ...draft, intention: { ...draft.intention, cue: event.target.value } })} placeholder="After lunch, at my desk…" /></label><label>Power-up<input value={draft.intention.powerUp} onChange={(event) => setDraft({ ...draft, intention: { ...draft.intention, powerUp: event.target.value } })} placeholder="Prepare equipment or use a five-minute start" /></label></div></>}
  </div><footer><button className="campaign-secondary" onClick={() => step === 0 ? onClose() : setStep(step - 1)}><ArrowLeft size={15} /> {step === 0 ? "Cancel" : "Back"}</button><div><button className="campaign-secondary" onClick={() => save("draft")}>Save draft</button>{step < 2 ? <button disabled={!canContinue} className="campaign-primary" onClick={() => setStep(step + 1)}>Continue <ChevronRight size={15} /></button> : <button className="campaign-primary" onClick={() => save("active")}><Sparkles size={15} /> Activate campaign</button>}</div></footer></section></div>;
}

function CampaignDetail({ campaign, onBack, onChange }: { campaign: Campaign; onBack: () => void; onChange: (campaign: Campaign, notice: string) => void }) {
  const forecast = forecastCampaign(campaign.quests, campaign.weeklyCapacity, campaign.targetDate);
  const completed = campaign.quests.filter((quest) => quest.status === "completed").length;
  const progress = campaign.quests.length ? Math.round(completed / campaign.quests.length * 100) : 0;
  const completeQuest = (quest: CampaignQuest) => {
    const remaining = remainingPrerequisites(quest.id, campaign.quests, campaign.dependencies);
    if (remaining.length) return onChange(campaign, `Locked: complete ${remaining.join(", ")} first.`);
    if (quest.status === "completed") return;
    const quests = unlockCampaignQuests(campaign.quests.map((item) => item.id === quest.id ? { ...item, status: "completed" as const } : item), campaign.dependencies);
    let boss = campaign.boss;
    let notice = `${quest.title} completed. Dependents were checked automatically.`;
    if (boss) {
      const result = contributeToBoss(boss, quest.id, quest.estimatedMinutes);
      boss = { ...boss, ...result.boss };
      if (result.rewardSettled) notice = `${notice} Boss defeated — the one-time reward is settled.`;
    }
    onChange({ ...campaign, quests, boss }, notice);
  };
  const rescope = (action: "extend" | "scope" | "split" | "capacity" | "pause") => {
    if (action === "pause") return onChange({ ...campaign, status: "paused" }, "Campaign paused. Earned progress is preserved.");
    if (action === "capacity") return onChange({ ...campaign, weeklyCapacity: campaign.weeklyCapacity + 30 }, "Weekly capacity increased by 30 minutes.");
    if (action === "extend") {
      const base = campaign.targetDate ? new Date(`${campaign.targetDate}T12:00:00`) : new Date();
      base.setDate(base.getDate() + 7);
      return onChange({ ...campaign, targetDate: base.toISOString().slice(0, 10) }, "Target date extended by one week.");
    }
    const open = campaign.quests.find((quest) => quest.status !== "completed" && quest.status !== "archived");
    if (!open) return;
    if (action === "scope") return onChange({ ...campaign, quests: campaign.quests.map((quest) => quest.id === open.id ? { ...quest, estimatedMinutes: Math.max(5, Math.round(quest.estimatedMinutes * .75)) } : quest) }, "Remaining scope reduced. Completed history is unchanged.");
    const first = { ...open, id: `${open.id}-a`, title: `${open.title} — first pass`, estimatedMinutes: Math.ceil(open.estimatedMinutes / 2) };
    const second = { ...open, id: `${open.id}-b`, title: `${open.title} — finish`, estimatedMinutes: Math.floor(open.estimatedMinutes / 2), status: "locked" as const };
    const quests = campaign.quests.flatMap((quest) => quest.id === open.id ? [first, second] : [quest]);
    const dependencies = campaign.dependencies.map((edge) => edge.questId === open.id ? { ...edge, questId: first.id } : edge.prerequisiteQuestId === open.id ? { ...edge, prerequisiteQuestId: second.id } : edge).concat({ questId: second.id, prerequisiteQuestId: first.id });
    onChange({ ...campaign, quests, dependencies }, "Milestone quest split. Existing completed history is unchanged.");
  };
  return <section className="campaign-detail-view"><button className="campaign-back" onClick={onBack}><ArrowLeft size={16} /> All campaigns</button><header className="campaign-detail-header"><div><span className={`campaign-status ${campaign.status}`}>{campaign.status}</span><h1>{campaign.title}</h1><p>{campaign.outcome}</p></div><div className="campaign-detail-actions"><button onClick={() => onChange({ ...campaign, status: campaign.status === "paused" ? "active" : "paused" }, campaign.status === "paused" ? "Campaign resumed." : "Campaign paused. Earned progress is safe.")}>{campaign.status === "paused" ? <Play size={15} /> : <Pause size={15} />}{campaign.status === "paused" ? "Resume" : "Pause"}</button><button onClick={() => onChange({ ...campaign, status: "archived" }, "Campaign archived. Its history remains available.")}><Archive size={15} /> Archive</button></div></header><div className="campaign-detail-grid"><div className="campaign-main-column"><section className="campaign-panel campaign-summary-panel"><div><span>Progress</span><strong>{progress}%</strong></div><div><span>Remaining</span><strong>{forecast.remainingMinutes} min</strong></div><div><span>Estimate</span><strong>{forecast.weeks} weeks</strong></div><div><span>Capacity</span><strong>{campaign.weeklyCapacity} min/wk</strong></div></section><section className="campaign-panel"><header><div><p className="eyebrow"><span /> QUEST CHAIN</p><h2>Milestone path</h2></div><small>Dependencies do not change when reordered.</small></header><div className="campaign-map" aria-label="Campaign dependency map">{campaign.quests.map((quest, index) => { const remaining = remainingPrerequisites(quest.id, campaign.quests, campaign.dependencies); return <article key={quest.id} className={`chain-node ${quest.status}`}><div className="chain-connector" aria-hidden="true" /><span>{quest.status === "completed" ? <Check size={15} /> : remaining.length ? <LockKeyhole size={14} /> : <Circle size={14} />}</span><div><small>Quest {index + 1} · {quest.estimatedMinutes} min</small><h3>{quest.title}</h3>{remaining.length > 0 && <p>Unlocks after: {remaining.join(", ")}</p>}</div><button disabled={quest.status === "completed" || remaining.length > 0} onClick={() => completeQuest(quest)}>{quest.status === "completed" ? "Completed" : remaining.length ? "Locked" : "Complete"}</button></article>; })}</div></section>{campaign.boss && <section className="campaign-panel boss-panel"><header><div><p className="eyebrow"><span /> OPTIONAL BOSS</p><h2>{campaign.boss.title}</h2></div><Swords size={25} /></header><div className="boss-health-copy"><span>Verified effort</span><strong>{campaign.boss.healthTotal - campaign.boss.healthRemaining} / {campaign.boss.healthTotal}</strong></div><div className="boss-health"><i style={{ width: `${100 - campaign.boss.healthRemaining / campaign.boss.healthTotal * 100}%` }} /></div><div className="boss-phases">{campaign.boss.phases.map((phase, index) => <span key={phase} className={100 - campaign.boss.healthRemaining / campaign.boss.healthTotal * 100 >= ((index + 1) / campaign.boss!.phases.length) * 100 ? "complete" : ""}><Shield size={14} /> {phase}</span>)}</div><p>Only completed linked quests contribute. Missed days never remove health, XP, or rewards.</p></section>}</div><aside className="campaign-side-column"><section className={`campaign-panel forecast-panel ${forecast.atRisk ? "at-risk" : ""}`}><header>{forecast.atRisk ? <AlertTriangle size={20} /> : <TrendingUp size={20} />}<div><small>Estimated forecast</small><h2>{forecast.atRisk ? "Needs a rescope" : "On course"}</h2></div></header><p>{forecast.atRisk ? `${forecast.weeks} weeks of work remain with ${forecast.weeksAvailable} weeks available.` : `About ${forecast.weeks} weeks remain at the current capacity.`}</p><div className="rescope-actions"><button onClick={() => rescope("extend")}>Extend date</button><button onClick={() => rescope("scope")}>Reduce scope</button><button onClick={() => rescope("split")}>Split next quest</button><button onClick={() => rescope("capacity")}>Add 30 min/week</button><button onClick={() => rescope("pause")}>Pause campaign</button></div></section><section className="campaign-panel campaign-why"><h2>Mission briefing</h2><dl><dt>Why</dt><dd>{campaign.why || "Not set"}</dd><dt>Success</dt><dd>{campaign.successCriteria || "Not set"}</dd><dt>Life area</dt><dd>{campaign.lifeArea}</dd><dt>Privacy</dt><dd>{campaign.privacy}</dd></dl></section>{campaign.intention.situation && <section className="campaign-panel intention-card"><Zap size={19} /><h2>If–then plan</h2><p>If <strong>{campaign.intention.situation}</strong>, then I will <strong>{campaign.intention.response}</strong>.</p>{campaign.intention.cue && <small>Cue: {campaign.intention.cue}</small>}{campaign.intention.powerUp && <small>Power-up: {campaign.intention.powerUp}</small>}</section>}</aside></div></section>;
}

export function CampaignsView({ archiveOnly = false }: { archiveOnly?: boolean }) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([seedCampaign]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Campaign | null | undefined>(undefined);
  const [notice, setNotice] = useState("Campaign data is saved on this device.");
  const [hydrated, setHydrated] = useState(false);
  const [archiveView, setArchiveView] = useState(archiveOnly);
  useEffect(() => { const restore = () => { const requested = new URLSearchParams(window.location.search).get("campaignView"); setArchiveView(archiveOnly || requested === "archive"); }; restore(); window.addEventListener("popstate", restore); return () => window.removeEventListener("popstate", restore); }, [archiveOnly]);
  useEffect(() => { const restoreTimer = window.setTimeout(() => { try { const stored = window.localStorage.getItem(storageKey); if (stored) setCampaigns(JSON.parse(stored) as Campaign[]); } catch { setNotice("Saved campaigns could not be restored; the safe starter campaign is shown."); } finally { setHydrated(true); } }, 0); return () => window.clearTimeout(restoreTimer); }, []);
  useEffect(() => { if (hydrated) window.localStorage.setItem(storageKey, JSON.stringify(campaigns)); }, [campaigns, hydrated]);
  const visible = useMemo(() => campaigns.filter((campaign) => archiveView ? campaign.status === "archived" || campaign.status === "abandoned" : campaign.status !== "archived" && campaign.status !== "abandoned"), [archiveView, campaigns]);
  const selected = campaigns.find((campaign) => campaign.id === selectedId);
  const save = (campaign: Campaign) => { setCampaigns((current) => current.some((item) => item.id === campaign.id) ? current.map((item) => item.id === campaign.id ? campaign : item) : [campaign, ...current]); setEditing(undefined); setSelectedId(campaign.id); setNotice(`${campaign.title} saved.`); };
  const change = (campaign: Campaign, message: string) => { setCampaigns((current) => current.map((item) => item.id === campaign.id ? campaign : item)); setNotice(message); if (campaign.status === "archived" && !archiveView) setSelectedId(null); };
  const navigateArchive = (next: boolean) => { const url = new URL(window.location.href); if (next) url.searchParams.set("campaignView", "archive"); else url.searchParams.delete("campaignView"); window.history.pushState({}, "", url); setSelectedId(null); setArchiveView(next); };
  if (selected) return <><div className="campaign-notice" role="status"><Sparkles size={14} /> {notice}</div><CampaignDetail campaign={selected} onBack={() => setSelectedId(null)} onChange={change} />{editing !== undefined && <CampaignWizard initial={editing ?? undefined} onClose={() => setEditing(undefined)} onSave={save} />}</>;
  return <section className="campaigns-view"><nav className="campaign-subviews" aria-label="Quest route views"><button onClick={() => navigateArchive(false)}>Quest Board / Campaigns</button><button className={archiveView ? "active" : ""} aria-current={archiveView ? "page" : undefined} onClick={() => navigateArchive(true)}>Archive</button></nav><header className="campaigns-hero"><div><p className="eyebrow"><span /> {archiveView ? "PRESERVED HISTORY" : "LONG-RANGE MISSIONS"}</p><h1>{archiveView ? "Campaign Archive" : "Campaigns"}</h1><p>{archiveView ? "Completed and archived work stays available without changing earned progression." : "Turn a meaningful outcome into dependent quests and achievable milestones."}</p></div>{!archiveView && <button className="campaign-primary" onClick={() => setEditing(null)}><Plus size={16} /> New campaign</button>}</header><div className="campaign-notice" role="status"><Sparkles size={14} /> {notice}</div><div className="campaign-list">{visible.length ? visible.map((campaign) => { const forecast = forecastCampaign(campaign.quests, campaign.weeklyCapacity, campaign.targetDate); const completed = campaign.quests.filter((quest) => quest.status === "completed").length; const progress = campaign.quests.length ? Math.round(completed / campaign.quests.length * 100) : 0; return <article className="campaign-card" key={campaign.id}><div className="campaign-card-head"><div className="campaign-icon"><Flag size={20} /></div><div><span className={`campaign-status ${campaign.status}`}>{campaign.status}</span><h2>{campaign.title}</h2><p>{campaign.outcome}</p></div><button onClick={() => setEditing(campaign)} aria-label={`Edit ${campaign.title}`}><Edit3 size={16} /></button></div><div className="campaign-progress"><div><span>Campaign progress</span><strong>{progress}%</strong></div><i><b style={{ width: `${progress}%` }} /></i></div><div className="campaign-metrics"><span><CalendarClock size={15} /> Estimate: {forecast.weeks} weeks</span><span><Target size={15} /> {forecast.remainingMinutes} min remaining</span><span className={forecast.atRisk ? "risk" : ""}><TrendingUp size={15} /> {forecast.atRisk ? "At risk — rescope available" : "On course"}</span></div><ol className="milestone-list">{campaign.milestones.map((milestone, index) => <li key={milestone.id} className={milestone.completed ? "complete" : ""}><span>{milestone.completed ? <Check size={13} /> : index + 1}</span><b>{milestone.title}</b>{milestone.completed ? <Shield size={14} /> : <ChevronRight size={14} />}</li>)}</ol><button className="campaign-detail" onClick={() => setSelectedId(campaign.id)}>Open campaign detail <ChevronRight size={15} /></button></article>; }) : <section className="campaign-empty"><Archive size={28} /><h2>{archiveView ? "No archived campaigns" : "No campaigns yet"}</h2><p>{archiveView ? "Archived campaign history will appear here." : "Create a campaign when a goal needs milestones, dependencies, and a forecast."}</p>{!archiveView && <button className="campaign-primary" onClick={() => setEditing(null)}><Plus size={15} /> Create campaign</button>}</section>}</div>{editing !== undefined && <CampaignWizard initial={editing ?? undefined} onClose={() => setEditing(undefined)} onSave={save} />}</section>;
}
