"use client";

import {
  AlertTriangle,
  Archive,
  CalendarDays,
  Check,
  ChevronRight,
  Clock3,
  FlaskConical,
  Forward,
  Gauge,
  Lightbulb,
  Play,
  Plus,
  RotateCcw,
  Save,
  Sparkles,
  Square,
  Target,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { usePlayer } from "../player-store";
import { dailyRecords } from "./data";
import {
  applyReviewAction,
  compareExperiment,
  generateInsights,
  plannedVsActual,
  recoverySummary,
  weekRange,
  type ExperimentObservation,
  type ReviewAction,
  type ReviewItem,
} from "./review-engine";

export type ReviewView = "daily" | "weekly" | "experiments" | "history";
type SavedReview = {
  id: string;
  kind: "daily" | "weekly";
  date: string;
  win: string;
  lesson: string;
  items: ReviewItem[];
  progressionBefore: number;
  progressionAfter: number;
};
type Experiment = {
  id: string;
  name: string;
  hypothesis: string;
  behavior: string;
  metric: string;
  baselineDays: number;
  experimentDays: number;
  contextTags: string[];
  status: "draft" | "active" | "stopped" | "completed";
  startedAt: string;
  reflection: string;
  observations: ExperimentObservation[];
};

const reviewStorageKey = "lifequest.reviews.v1";
const experimentStorageKey = "lifequest.experiments.v1";
const actionLabels: Record<ReviewAction, string> = {
  carry: "Carry forward",
  rescope: "Reduce scope",
  schedule: "Schedule",
  pause: "Pause",
  archive: "Archive",
};

function DailyReview({ onSaved }: { onSaved: (review: SavedReview) => void }) {
  const { state } = usePlayer();
  const initialItems = useMemo<ReviewItem[]>(() => [
    ...state.quests.slice(0, 4).map((quest) => ({ id: `quest:${quest.id}`, title: quest.title, plannedMinutes: ({ Easy: 20, Medium: 35, Hard: 60, Legendary: 90 })[quest.difficulty], actualMinutes: quest.status === "completed" ? 25 : Math.round(quest.progress / 100 * 60), status: quest.status === "completed" ? "completed" as const : "unfinished" as const })),
    ...state.habits.slice(0, 2).map((habit) => ({ id: `habit:${habit.id}`, title: habit.name, plannedMinutes: habit.difficulty === "Hard" ? 45 : 20, actualMinutes: habit.status === "Completed" ? 30 : Math.round(habit.progress / 100 * 30), status: habit.status === "Completed" ? "completed" as const : "unfinished" as const })),
  ], [state.habits, state.quests]);
  const [items, setItems] = useState(initialItems);
  const [win, setWin] = useState("");
  const [lesson, setLesson] = useState("");
  const [tomorrowOpen, setTomorrowOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const time = plannedVsActual(items);
  const save = () => {
    const xp = state.progression.xp;
    onSaved({ id: `daily-${Date.now()}`, kind: "daily", date: new Date().toISOString(), win, lesson, items, progressionBefore: xp, progressionAfter: xp });
    setSaved(true);
  };
  return <section className="review-view"><header className="review-hero"><div><p>DAILY SHUTDOWN / OPTIONAL</p><h1>Close the loop</h1><span>Confirm what happened, preserve recorded progress, and make tomorrow easier to enter.</span></div><div className="no-reward"><Sparkles size={16} /><span>Reflection awards no XP or coins.</span></div></header><section className="review-summary-grid"><article><span>Planned</span><strong>{time.planned} min</strong></article><article><span>Recorded</span><strong>{time.actual} min</strong></article><article><span>Difference</span><strong>{time.difference > 0 ? "+" : ""}{time.difference} min</strong></article><article><span>Estimate accuracy</span><strong>{time.accuracyPercent}%</strong></article></section><div className="review-columns"><section className="review-panel"><header><div><p>TODAY&apos;S PLAN</p><h2>Recorded and unfinished work</h2></div><small>Completed items come from the progression ledger.</small></header><div className="shutdown-list">{items.map((item) => <article key={item.id} className={item.status}><span className="shutdown-state">{item.status === "completed" ? <Check size={15} /> : <Clock3 size={15} />}</span><div><h3>{item.title}</h3><p>{item.actualMinutes} of {item.plannedMinutes} minutes recorded</p></div>{item.status === "completed" ? <b>Confirmed</b> : <label>Next action<select value={item.action ?? ""} onChange={(event) => setItems(applyReviewAction(items, item.id, event.target.value as ReviewAction))}><option value="" disabled>Choose</option>{Object.entries(actionLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>}</article>)}</div></section><aside className="review-panel reflection-panel"><header><div><p>REFLECTION</p><h2>Keep what is useful</h2></div><Lightbulb size={20} /></header><label>One win<textarea value={win} onChange={(event) => setWin(event.target.value)} placeholder="What moved in the right direction?" /></label><label>Obstacle or lesson<textarea value={lesson} onChange={(event) => setLesson(event.target.value)} placeholder="What should tomorrow's plan account for?" /></label><button className="review-secondary" onClick={() => setTomorrowOpen(!tomorrowOpen)} aria-expanded={tomorrowOpen}><Forward size={15} /> Preview tomorrow <ChevronRight size={14} /></button>{tomorrowOpen && <div className="tomorrow-preview"><b>Preview only</b><span>2 Prime Quests · 120 min capacity</span><p>No plan changes will be made until you confirm them tomorrow.</p></div>}<button className="review-primary" onClick={save}><Save size={15} /> {saved ? "Review saved" : "Save daily review"}</button></aside></div></section>;
}

function WeeklyReview({ onSaved }: { onSaved: (review: SavedReview) => void }) {
  const { state } = usePlayer();
  const [capacity, setCapacity] = useState(420);
  const [outcomes, setOutcomes] = useState(["Publish portfolio evidence pass", "Protect three recovery windows"]);
  const [suggested, setSuggested] = useState(false);
  const range = weekRange(new Date(), "Asia/Beirut");
  const records = dailyRecords.slice(-7);
  const time = plannedVsActual(records.map((record) => ({ id: record.date, title: record.date, plannedMinutes: 120, actualMinutes: record.productiveMinutes, status: "completed" })));
  const recovery = recoverySummary(records);
  const insights = generateInsights(records, capacity);
  const save = () => onSaved({ id: `weekly-${Date.now()}`, kind: "weekly", date: new Date().toISOString(), win: outcomes.join(" · "), lesson: `Capacity confirmed at ${capacity} minutes`, items: [], progressionBefore: state.progression.xp, progressionAfter: state.progression.xp });
  return <section className="review-view"><header className="review-hero"><div><p>WEEKLY REVIEW / {range.start}—{range.end}</p><h1>Plan from evidence</h1><span>A reproducible snapshot in Asia/Beirut, built from the same progression and activity records as Analytics.</span></div><button className="review-primary" onClick={save}><Save size={15} /> Save weekly snapshot</button></header><section className="weekly-scorecard"><article><span>Meaningful quests</span><strong>{state.quests.filter((quest) => quest.status === "completed").length}</strong><small>verified completions</small></article><article><span>Planned / recorded</span><strong>{time.planned} / {time.actual}</strong><small>minutes</small></article><article><span>Habit recovery</span><strong>{recovery.recoveryDays}</strong><small>lower-load days, no reset</small></article><article><span>Practice / mastery</span><strong>{state.skills.reduce((sum, skill) => sum + skill.xp, 0)} XP</strong><small>practice; mastery tracked separately</small></article></section><div className="review-columns"><section className="review-panel"><header><div><p>TRANSPARENT INSIGHTS</p><h2>Patterns worth considering</h2></div><Gauge size={20} /></header><div className="insight-list">{insights.map((insight) => <article key={insight.id}><h3>{insight.statement}</h3><dl><div><dt>Date range</dt><dd>{insight.dateRange}</dd></div><div><dt>Sample</dt><dd>{insight.sampleSize} days</dd></div><div><dt>Inputs</dt><dd>{insight.inputs.join(" + ")}</dd></div><div><dt>Calculation</dt><dd>{insight.calculation}</dd></div></dl><p><AlertTriangle size={14} /> {insight.caution}</p></article>)}</div></section><aside className="review-panel next-week-panel"><header><div><p>NEXT WEEK</p><h2>Confirm direction</h2></div><Target size={20} /></header><label>Capacity in minutes<input type="number" min="60" max="10080" value={capacity} onChange={(event) => setCapacity(Number(event.target.value))} /></label><fieldset><legend>Top outcomes</legend>{outcomes.map((outcome, index) => <div key={index}><input value={outcome} onChange={(event) => setOutcomes(outcomes.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} /><button aria-label={`Remove outcome ${index + 1}`} onClick={() => setOutcomes(outcomes.filter((_, itemIndex) => itemIndex !== index))}><X size={14} /></button></div>)}<button className="review-secondary" onClick={() => setOutcomes([...outcomes, ""])}><Plus size={14} /> Add outcome</button></fieldset><div className="suggestion-box"><Sparkles size={17} /><div><b>Suggestion</b><p>Keep one recovery window after the highest-load day.</p></div><button className={suggested ? "confirmed" : ""} onClick={() => setSuggested(!suggested)}>{suggested ? "Confirmed" : "Confirm"}</button></div><small>Suggestions never modify plans without confirmation.</small></aside></div><section className="review-panel distribution-panel"><header><div><p>LIFE-AREA DISTRIBUTION</p><h2>Where verified effort went</h2></div></header><div className="bullet-list" role="img" aria-label="Bullet charts comparing activity to declared weekly target">{[["Career", 190, 180], ["Learning", 115, 120], ["Health & recovery", 90, 120]].map(([label, value, target]) => <div key={label}><span>{label}</span><i><b style={{ width: `${Math.min(100, Number(value) / Number(target) * 100)}%` }} /><em style={{ left: "100%" }} /></i><strong>{value} / {target} min</strong></div>)}</div><details className="review-data-table"><summary>Life-area data table</summary><table><thead><tr><th>Area</th><th>Recorded</th><th>Target</th></tr></thead><tbody><tr><th>Career</th><td>190 min</td><td>180 min</td></tr><tr><th>Learning</th><td>115 min</td><td>120 min</td></tr><tr><th>Health &amp; recovery</th><td>90 min</td><td>120 min</td></tr></tbody></table></details></section></section>;
}

function Experiments({ experiments, setExperiments }: { experiments: Experiment[]; setExperiments: React.Dispatch<React.SetStateAction<Experiment[]>> }) {
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState({ name: "", hypothesis: "", behavior: "", metric: "Completion rate", baselineDays: 7, experimentDays: 14, tags: "morning, deep work" });
  const create = () => {
    if (!draft.name.trim() || !draft.hypothesis.trim()) return;
    const observations: ExperimentObservation[] = [
      ...[62, 66, 58, 71, 64, 69, 61].map((value, index) => ({ date: `Baseline ${index + 1}`, phase: "baseline" as const, value })),
      ...[72, 76, 68, 81, 74].map((value, index) => ({ date: `Experiment ${index + 1}`, phase: "experiment" as const, value })),
    ];
    setExperiments((current) => [{ id: `experiment-${Date.now()}`, ...draft, contextTags: draft.tags.split(",").map((tag) => tag.trim()).filter(Boolean), status: "active", startedAt: new Date().toISOString(), reflection: "", observations }, ...current]);
    setCreating(false);
  };
  return <section className="review-view"><header className="review-hero"><div><p>PERSONAL EXPERIMENTS / VOLUNTARY</p><h1>Try one change</h1><span>Compare periods descriptively. Stop at any time, with no penalty and no claim of scientific proof.</span></div><button className="review-primary" onClick={() => setCreating(true)}><Plus size={15} /> New experiment</button></header><div className="experiment-grid">{experiments.length ? experiments.map((experiment) => { const comparison = compareExperiment(experiment.observations); return <article className="experiment-card" key={experiment.id}><header><div><span className={`experiment-status ${experiment.status}`}>{experiment.status}</span><h2>{experiment.name}</h2></div><FlaskConical size={21} /></header><p><b>Hypothesis:</b> {experiment.hypothesis}</p><p><b>Behavior:</b> {experiment.behavior}</p><div className="experiment-comparison"><span>Baseline<strong>{comparison.baseline.average}</strong><small>{comparison.baseline.count} observations</small></span><ChevronRight size={18} /><span>Experiment<strong>{comparison.experiment.average}</strong><small>{comparison.experiment.count} observations</small></span><em className={comparison.difference >= 0 ? "positive" : "negative"}>{comparison.difference >= 0 ? "+" : ""}{comparison.difference}</em></div><div className="mini-trend" role="img" aria-label={`${experiment.name}: baseline average ${comparison.baseline.average}, experiment average ${comparison.experiment.average}`}><i style={{ height: `${comparison.baseline.average}%` }} /><i className="experiment" style={{ height: `${comparison.experiment.average}%` }} /></div><p className="experiment-caution"><AlertTriangle size={14} /> {comparison.caution}</p><div className="experiment-actions">{experiment.status === "active" && <><button onClick={() => setExperiments((current) => current.map((item) => item.id === experiment.id ? { ...item, status: "stopped" } : item))}><Square size={13} /> Stop</button><button onClick={() => setExperiments((current) => current.map((item) => item.id === experiment.id ? { ...item, status: "completed" } : item))}><Check size={13} /> Complete</button></>}{experiment.status === "stopped" && <button onClick={() => setExperiments((current) => current.map((item) => item.id === experiment.id ? { ...item, status: "active" } : item))}><Play size={13} /> Resume</button>}</div><details className="review-data-table"><summary>Observation table</summary><table><thead><tr><th>Period</th><th>Date</th><th>{experiment.metric}</th></tr></thead><tbody>{experiment.observations.map((observation) => <tr key={`${observation.phase}-${observation.date}`}><td>{observation.phase}</td><td>{observation.date}</td><td>{observation.value}</td></tr>)}</tbody></table></details></article>; }) : <section className="review-empty"><FlaskConical size={28} /><h2>No experiments running</h2><p>Start when one small behavior change feels worth observing.</p></section>}</div>{creating && <div className="review-dialog-backdrop"><section className="review-dialog" role="dialog" aria-modal="true" aria-labelledby="experiment-title"><header><h2 id="experiment-title">New personal experiment</h2><button onClick={() => setCreating(false)} aria-label="Close experiment creator"><X size={19} /></button></header><div><label>Name<input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="Start deep work before noon" /></label><label>Hypothesis<textarea value={draft.hypothesis} onChange={(event) => setDraft({ ...draft, hypothesis: event.target.value })} placeholder="I expect earlier sessions to be completed more often." /></label><label>One behavior change<input value={draft.behavior} onChange={(event) => setDraft({ ...draft, behavior: event.target.value })} placeholder="Begin the first focus block before 12:00" /></label><div className="dialog-row"><label>Primary metric<select value={draft.metric} onChange={(event) => setDraft({ ...draft, metric: event.target.value })}><option>Completion rate</option><option>Focused minutes</option><option>Energy rating</option><option>Estimate accuracy</option></select></label><label>Context tags<input value={draft.tags} onChange={(event) => setDraft({ ...draft, tags: event.target.value })} /></label></div><div className="dialog-row"><label>Baseline days<input type="number" min="3" value={draft.baselineDays} onChange={(event) => setDraft({ ...draft, baselineDays: Number(event.target.value) })} /></label><label>Experiment days<input type="number" min="3" value={draft.experimentDays} onChange={(event) => setDraft({ ...draft, experimentDays: Number(event.target.value) })} /></label></div></div><footer><button className="review-secondary" onClick={() => setCreating(false)}>Cancel</button><button className="review-primary" onClick={create}><Play size={14} /> Start experiment</button></footer></section></div>}</section>;
}

function History({ reviews, experiments }: { reviews: SavedReview[]; experiments: Experiment[] }) {
  return <section className="review-view"><header className="review-hero"><div><p>REFLECTION HISTORY / READ-ONLY</p><h1>Decisions over time</h1><span>Reviews preserve context without rewriting progression events.</span></div></header><div className="history-list">{reviews.map((review) => <article key={review.id}><span>{review.kind === "daily" ? <CalendarDays size={18} /> : <RotateCcw size={18} />}</span><div><small>{review.kind} review · {new Date(review.date).toLocaleString()}</small><h2>{review.win || "Review completed"}</h2><p>{review.lesson || "No lesson recorded."}</p></div><b>{review.progressionBefore === review.progressionAfter ? "0 XP awarded" : "Ledger mismatch"}</b></article>)}{experiments.filter((experiment) => experiment.status !== "active").map((experiment) => <article key={experiment.id}><span><FlaskConical size={18} /></span><div><small>experiment · {experiment.status}</small><h2>{experiment.name}</h2><p>{experiment.reflection || "Descriptive comparison preserved."}</p></div><b>No penalty</b></article>)}{reviews.length === 0 && experiments.filter((experiment) => experiment.status !== "active").length === 0 && <section className="review-empty"><Archive size={28} /><h2>No review history yet</h2><p>Saved daily and weekly reviews will appear here.</p></section>}</div></section>;
}

export function ReviewLab({ view }: { view: ReviewView }) {
  const [reviews, setReviews] = useState<SavedReview[]>([]);
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => { const timer = window.setTimeout(() => { try { const savedReviews = window.localStorage.getItem(reviewStorageKey); const savedExperiments = window.localStorage.getItem(experimentStorageKey); if (savedReviews) setReviews(JSON.parse(savedReviews) as SavedReview[]); if (savedExperiments) setExperiments(JSON.parse(savedExperiments) as Experiment[]); } finally { setHydrated(true); } }, 0); return () => window.clearTimeout(timer); }, []);
  useEffect(() => { if (!hydrated) return; window.localStorage.setItem(reviewStorageKey, JSON.stringify(reviews)); window.localStorage.setItem(experimentStorageKey, JSON.stringify(experiments)); }, [experiments, hydrated, reviews]);
  const saveReview = (review: SavedReview) => setReviews((current) => [review, ...current]);
  if (view === "daily") return <DailyReview onSaved={saveReview} />;
  if (view === "weekly") return <WeeklyReview onSaved={saveReview} />;
  if (view === "experiments") return <Experiments experiments={experiments} setExperiments={setExperiments} />;
  return <History reviews={reviews} experiments={experiments} />;
}
