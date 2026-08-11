"use client";

import {
  AlertTriangle,
  Bell,
  ChevronRight,
  Download,
  Menu,
  TrendingUp,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Sidebar } from "../dashboard/page";
import { selectHabitSummary, selectPlayerAnalytics, usePlayer } from "../player-store";
import { skillGrowth, type ActivityKind, type DayRecord, type RangeKey } from "./data";
import { generateInsights } from "./review-engine";
import { ReviewLab, type ReviewView } from "./review-lab";
import { change, filteredRecords, points, total } from "./utils";
import "../dashboard/dashboard.css";
import "./analytics.css";
import "./review-lab.css";

type AnalyticsView = "overview" | ReviewView;
const views: Array<{ key: AnalyticsView; label: string }> = [
  { key: "overview", label: "Overview" },
  { key: "daily", label: "Daily Review" },
  { key: "weekly", label: "Weekly Review" },
  { key: "experiments", label: "Experiments" },
  { key: "history", label: "History" },
];
const ranges: RangeKey[] = ["Last 7 days", "Last 30 days", "Last 90 days", "This year", "Custom date range"];
const activities: ActivityKind[] = ["All activity", "Quests", "Habits", "Skills", "Achievements"];

function DataSummary({ rows, title }: { rows: string[][]; title: string }) {
  return <details className="data-summary"><summary>{title}</summary><table><tbody>{rows.map(([key, value]) => <tr key={key}><th>{key}</th><td>{value}</td></tr>)}</tbody></table></details>;
}

function PanelTitle({ label, title, detail }: { label: string; title: string; detail: string }) {
  return <header className="panel-title"><p>{label}</p><h2>{title}</h2><span>{detail}</span></header>;
}

function Overview({ records, activity, setActivity, range, setRange }: { records: DayRecord[]; activity: ActivityKind; setActivity: (activity: ActivityKind) => void; range: RangeKey; setRange: (range: RangeKey) => void }) {
  const { state } = usePlayer();
  const ledger = selectPlayerAnalytics(state);
  const habits = selectHabitSummary(state);
  const values = {
    xp: ledger.events.length ? ledger.xpAwarded : total(records, "xp"),
    quests: ledger.events.length ? ledger.questsCompleted : total(records, "quests"),
    consistency: ledger.events.length ? habits.consistency : Math.round(total(records, "habits") / Math.max(records.length * 4, 1) * 100),
    practice: ledger.events.length ? state.activity.filter((event) => event.type === "attribute_milestone").length * 180 : total(records, "skills") * 180,
    time: Math.round(total(records, "productiveMinutes") / 60 * 10) / 10,
  };
  const previous = records.slice(0, Math.max(1, Math.floor(records.length / 2)));
  const insights = generateInsights(records, 420);
  const exportReport = (format: "json" | "csv") => {
    const content = format === "json" ? JSON.stringify({ range, activity, overview: values, records, insights }, null, 2) : ["date,xp,quests,habits,skills,productiveMinutes", ...records.map((record) => `${record.date},${record.xp},${record.quests},${record.habits},${record.skills},${record.productiveMinutes}`)].join("\n");
    const url = URL.createObjectURL(new Blob([content], { type: format === "json" ? "application/json" : "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `lifequest-analytics-${range.toLowerCase().replaceAll(" ", "-")}.${format}`;
    link.click();
    URL.revokeObjectURL(url);
  };
  const metrics = [
    ["Verified XP", values.xp, total(previous, "xp"), "XP from authoritative progression events."],
    ["Quests completed", values.quests, total(previous, "quests"), "Recorded quest completion events."],
    ["Habit consistency", values.consistency, 68, "Completed scheduled habits divided by planned habits."],
    ["Practice XP", values.practice, total(previous, "skills") * 180, "Focused practice; this is not the same as verified mastery."],
    ["Recorded time", values.time, Math.round(total(previous, "productiveMinutes") / 60 * 10) / 10, "Tracked productive minutes converted to hours."],
  ] as const;
  return <div className="analytics-content"><section className="analytics-hero"><div><p>ANALYTICAL CORE / DECISION SUPPORT</p><h1>PROGRESS <em>INTELLIGENCE</em></h1><span>Understand what happened, then decide what to adjust.</span></div><div className="export-actions"><button onClick={() => exportReport("csv")}><Download size={16} /> Export CSV</button><button onClick={() => exportReport("json")}><Download size={16} /> Export JSON</button></div></section><section className="analytics-filters" aria-label="Analytics filters"><div>{ranges.map((item) => <button className={range === item ? "active" : ""} onClick={() => setRange(item)} key={item}>{item}</button>)}</div><div>{activities.map((item) => <button className={activity === item ? "active" : ""} onClick={() => setActivity(item)} key={item}>{item}</button>)}</div></section><section className="metric-grid review-metric-grid">{metrics.map(([label, current, prior, description]) => { const delta = change(Number(current), Number(prior)); return <article className="metric game-panel" key={label}><p>{label}</p><strong>{current}{label.includes("time") ? "h" : label.includes("consistency") ? "%" : ""}</strong><span className={delta.trend}>{delta.text} <small>vs comparison</small></span><i>{description}</i></article>; })}</section><section className="analytics-grid review-overview-grid"><section className="chart-panel xp-chart game-panel"><PanelTitle label="VERIFIED TREND" title="XP over time" detail="One series only; exact values remain available below." /><svg viewBox="0 0 100 108" preserveAspectRatio="none" role="img" aria-label="Line chart of verified daily experience points"><line x1="0" y1="20" x2="100" y2="20" /><line x1="0" y1="50" x2="100" y2="50" /><line x1="0" y1="80" x2="100" y2="80" /><polyline points={points(records)} /></svg><div className="chart-labels">{records.map((record, index) => <button title={`${record.date}: ${record.xp} XP`} aria-label={`${record.date}: ${record.xp} XP`} key={record.date}>{index % Math.max(1, Math.ceil(records.length / 6)) === 0 ? record.date : ""}</button>)}</div><DataSummary rows={records.map((record) => [record.date, `${record.xp} XP`])} title="Daily XP data table" /></section><section className="chart-panel game-panel decision-chart"><PanelTitle label="CAPACITY SIGNAL" title="Recorded time versus target" detail="Bullet charts compare visible values with a declared target." /><div className="overview-bullets" role="img" aria-label="Recorded productive time compared with a 120 minute daily target">{records.slice(-7).map((record) => <div key={record.date}><span>{record.date}</span><i><b style={{ width: `${Math.min(100, record.productiveMinutes / 120 * 100)}%` }} /><em style={{ left: "80%" }} /></i><strong>{record.productiveMinutes} / 120 min</strong></div>)}</div><DataSummary rows={records.slice(-7).map((record) => [record.date, `${record.productiveMinutes} recorded / 120 target minutes`])} title="Capacity data table" /></section></section><section className="lower-grid review-lower-grid"><section className="game-panel insight-overview"><PanelTitle label="TRANSPARENT INSIGHTS" title="Patterns, not proof" detail="Every insight names its range, sample, inputs, and calculation." /><div>{insights.map((insight) => <article key={insight.id}><TrendingUp size={17} /><h3>{insight.statement}</h3><span>{insight.dateRange} · n={insight.sampleSize}</span><p><b>Inputs:</b> {insight.inputs.join(" + ")}</p><p><b>Calculation:</b> {insight.calculation}</p><small><AlertTriangle size={13} /> {insight.caution}</small></article>)}</div></section><section className="game-panel practice-panel"><PanelTitle label="PRACTICE DISTRIBUTION" title="Where skill effort went" detail="Practice XP is displayed separately from mastery evidence." />{skillGrowth.slice(0, 4).map((skill) => <div className="skill-bar" key={skill.name}><span>{skill.name}</span><i><b style={{ width: `${skill.xp / 12}%` }} /></i><strong>{skill.xp} XP</strong></div>)}<DataSummary rows={skillGrowth.map((skill) => [skill.name, `${skill.xp} practice XP`])} title="Practice XP data table" /></section></section></div>;
}

export default function AnalyticsPage() {
  const { state, setAnalyticsRange } = usePlayer();
  const [view, setView] = useState<AnalyticsView>("overview");
  const [activity, setActivity] = useState<ActivityKind>("All activity");
  const [collapsed, setCollapsed] = useState(false);
  const [mobile, setMobile] = useState(false);
  const range = state.analyticsRange as RangeKey;
  const records = useMemo(() => filteredRecords(range, activity), [activity, range]);
  return <main className="dashboard-page analytics-page"><div className="dashboard-atmosphere" aria-hidden="true"><i className="an-particle a" /><i className="an-particle b" /></div><Sidebar collapsed={collapsed} mobileOpen={mobile} active="Analytics" onSelect={() => setMobile(false)} onCollapse={() => setCollapsed(!collapsed)} onClose={() => setMobile(false)} /><section className={`dashboard-shell ${collapsed ? "sidebar-collapsed" : ""}`}><header className="dashboard-header"><button className="mobile-menu" onClick={() => setMobile(true)} aria-label="Open navigation"><Menu size={20} /></button><div className="breadcrumb"><span>SYSTEM /</span> REVIEW LAB</div><div className="analytics-online">SYSTEM ONLINE <i /> LOCAL TIME</div><div className="header-actions"><button className="header-icon" aria-label="Notifications"><Bell size={16} /><b>3</b></button><button className="profile-button" aria-label="Open player profile"><span>F</span><ChevronRight size={15} /></button></div></header><nav className="analytics-subviews" aria-label="Analytics views">{views.map((item) => <button key={item.key} className={view === item.key ? "active" : ""} aria-current={view === item.key ? "page" : undefined} onClick={() => setView(item.key)}>{item.label}</button>)}</nav>{view === "overview" ? <Overview records={records} activity={activity} setActivity={setActivity} range={range} setRange={setAnalyticsRange} /> : <div className="analytics-content review-lab-content"><ReviewLab view={view} /></div>}</section></main>;
}
