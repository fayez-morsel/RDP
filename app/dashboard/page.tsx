"use client";
/* eslint-disable @next/next/no-img-element */

import {
  Activity,
  Award,
  Backpack,
  BarChart3,
  BookOpen,
  Brain,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Crosshair,
  Dumbbell,
  Flame,
  Focus,
  Gem,
  LayoutDashboard,
  Menu,
  Plus,
  ShieldCheck,
  Sparkles,
  Swords,
  Target,
  Trophy,
  Users,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import "./dashboard.css";
import "./dashboard-overrides.css";
import "./dashboard-rebuild.css";
import "./dashboard-mobile.css";
import "./sidebar-fix.css";
import "./navigation-fix.css";
import "./daily-command.css";
import { routes } from "../navigation";
import { usePlayer } from "../player-store";
import { DailyCommandCenter } from "./daily-command-center";
import { useExperience } from "../experience";

type NavItem = { label: string; icon: LucideIcon; advanced?: boolean };
type Quest = {
  id: string;
  title: string;
  category: string;
  difficulty: string;
  xp: number;
  progress: number;
  icon: LucideIcon;
  tone: string;
  completed: boolean;
};

const navItems: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "Quests", icon: Swords },
  { label: "Habits", icon: Activity },
  { label: "Skills", icon: Brain },
  { label: "Achievements", icon: Trophy, advanced: true },
  { label: "Inventory", icon: Backpack, advanced: true },
  { label: "Leaderboard", icon: Users, advanced: true },
  { label: "Analytics", icon: BarChart3, advanced: true },
  { label: "Settings", icon: ShieldCheck },
];

const questIcons: Record<string, { icon: LucideIcon; tone: string }> = {
  Fitness: { icon: Dumbbell, tone: "violet" },
  Learning: { icon: BookOpen, tone: "gold" },
  Career: { icon: Focus, tone: "azure" },
  Health: { icon: Activity, tone: "mint" },
  "Personal Growth": { icon: Sparkles, tone: "rose" },
};

const attributeBlueprints = [
  { label: "Strength", value: 72, icon: Dumbbell, tone: "azure" },
  { label: "Intelligence", value: 86, icon: Brain, tone: "violet" },
  { label: "Discipline", value: 79, icon: Target, tone: "gold" },
  { label: "Creativity", value: 68, icon: Sparkles, tone: "rose" },
  { label: "Focus", value: 82, icon: Focus, tone: "mint" },
  { label: "Communication", value: 61, icon: Users, tone: "azure" },
];

const achievementBlueprints = [
  {
    title: "Dawnforged",
    detail: "Complete 21 morning rituals",
    rarity: "Legendary",
    progress: 100,
    icon: Flame,
  },
  {
    title: "Mind Cartographer",
    detail: "Read for 10 hours",
    rarity: "Epic",
    progress: 100,
    icon: Brain,
  },
  {
    title: "Unbroken Chain",
    detail: "Maintain a 14-day streak",
    rarity: "Rare",
    progress: 86,
    icon: LinkIcon,
  },
  {
    title: "The Consistent",
    detail: "Complete 100 quests",
    rarity: "Common",
    progress: 64,
    icon: Award,
  },
];

function LinkIcon(props: React.ComponentProps<typeof Gem>) {
  return <Gem {...props} />;
}

export function Sidebar({
  collapsed,
  mobileOpen,
  active,
  onSelect,
  onCollapse,
  onClose,
}: {
  collapsed: boolean;
  mobileOpen: boolean;
  active: string;
  onSelect: (label: string) => void;
  onCollapse: () => void;
  onClose: () => void;
}) {
  const { state } = usePlayer();
  const { t } = useExperience();
  useEffect(() => {
    const openProfile = (event: MouseEvent) => {
      if (
        (event.target as HTMLElement).closest(".profile-button, .player-mini")
      )
        window.location.assign("/profile");
    };
    document.addEventListener("click", openProfile);
    return () => document.removeEventListener("click", openProfile);
  }, []);
  const sidebarRoutes: Partial<Record<string, string>> = routes;
  const selectNav = (label: string) => {
    onSelect(label);
    const destination = sidebarRoutes[label];
    if (destination && window.location.pathname !== destination)
      window.location.assign(destination);
  };
  return (
    <>
      <button
        className={`dashboard-scrim ${mobileOpen ? "is-visible" : ""}`}
        onClick={onClose}
        aria-label={t("closeNavigation")}
      />
      <aside
        className={`game-sidebar ${collapsed ? "is-collapsed" : ""} ${mobileOpen ? "is-open" : ""}`}
        aria-label="Player navigation"
      >
        <div className="sidebar-topline">
          <button
            className="brand-mark"
            onClick={() => selectNav("Dashboard")}
            aria-label="Open Dashboard"
          >
            <Sparkles size={17} />
          </button>
          <button className="brand-name" onClick={() => selectNav("Dashboard")}>
            LIFE<span>QUEST</span>
          </button>
          <button
            className="sidebar-close"
            onClick={onClose}
            aria-label="Close navigation"
          >
            <X size={18} />
          </button>
        </div>
        <div className="player-mini">
          <div className="avatar-orb">
            {state.profile.avatar ? (
              <img src={state.profile.avatar} alt="" />
            ) : (
              <span>{state.profile.displayName.slice(0, 1).toUpperCase()}</span>
            )}
            <i />
          </div>
          <div className="player-mini-copy">
            <strong>{state.profile.displayName}</strong>
            <span>
              {state.profile.title} <b>•</b> Lv. {state.progression.level}
            </span>
          </div>
        </div>
        <nav className="game-nav">
          {navItems.map(({ label, icon: Icon, advanced }) => (
            <button
              key={label}
              data-advanced={advanced || undefined}
              className={active === label ? "active" : ""}
              onClick={() => selectNav(label)}
              aria-current={active === label ? "page" : undefined}
              title={
                collapsed
                  ? t(
                      label as
                        | "Dashboard"
                        | "Quests"
                        | "Habits"
                        | "Skills"
                        | "Achievements"
                        | "Inventory"
                        | "Leaderboard"
                        | "Analytics"
                        | "Settings",
                    )
                  : undefined
              }
            >
              <Icon size={18} />
              <span>
                {t(
                  label as
                    | "Dashboard"
                    | "Quests"
                    | "Habits"
                    | "Skills"
                    | "Achievements"
                    | "Inventory"
                    | "Leaderboard"
                    | "Analytics"
                    | "Settings",
                )}
              </span>
              {active === label && <i />}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button
            className="season-chip"
            onClick={() => selectNav("Leaderboard")}
            aria-label="Open Season 04 leaderboard"
          >
            <Gem size={14} />
            <span>Season 04</span>
            <b>19d</b>
          </button>
          <button
            className="collapse-toggle"
            onClick={onCollapse}
            aria-label={collapsed ? t("expand") : t("collapse")}
          >
            {collapsed ? (
              <ChevronRight size={17} />
            ) : (
              <>
                <ChevronLeft size={17} />
                <span>{t("collapse")}</span>
              </>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}

function CharacterPortal() {
  return (
    <div className="character-portal" aria-label="3D avatar placeholder">
      <div className="portal-rings">
        <i />
        <i />
        <i />
      </div>
      <div className="portal-glow" />
      <div className="avatar-silhouette">
        <div className="silhouette-head" />
        <div className="silhouette-core">
          <i />
          <b />
        </div>
        <div className="silhouette-arms">
          <i />
          <i />
        </div>
        <div className="silhouette-legs">
          <i />
          <i />
        </div>
      </div>
      <div className="portal-label">
        <span>AVATAR LINK</span>
        <strong>READY</strong>
      </div>
      <div className="portal-corners">
        <i />
        <i />
        <i />
        <i />
      </div>
    </div>
  );
}

function ProgressChart() {
  return (
    <div className="activity-chart" aria-label="Weekly activity chart">
      <div className="chart-grid" />
      <svg
        viewBox="0 0 520 165"
        preserveAspectRatio="none"
        role="img"
        aria-label="Weekly XP activity rising to 790 XP on Saturday"
      >
        <defs>
          <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#8f6bff" stopOpacity=".38" />
            <stop offset="1" stopColor="#8f6bff" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d="M0 136 C35 128 45 92 78 102 S121 136 154 116 S198 61 231 79 S275 112 308 91 S352 35 385 55 S429 103 462 32 S495 36 520 17 L520 165 L0 165Z"
          fill="url(#chartFill)"
        />
        <path
          d="M0 136 C35 128 45 92 78 102 S121 136 154 116 S198 61 231 79 S275 112 308 91 S352 35 385 55 S429 103 462 32 S495 36 520 17"
          fill="none"
          stroke="#ad9aff"
          strokeWidth="3"
          vectorEffect="non-scaling-stroke"
        />
        <circle cx="462" cy="32" r="6" fill="#e3d8ff" />
        <circle cx="462" cy="32" r="12" fill="#9c80ff" opacity=".22" />
      </svg>
      <div className="chart-days">
        <span>Mon</span>
        <span>Tue</span>
        <span>Wed</span>
        <span>Thu</span>
        <span>Fri</span>
        <span className="current">Sat</span>
        <span>Sun</span>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { state, completeQuest } = usePlayer();
  const xpPercent = Math.min(
    100,
    Math.round((state.progression.xp / state.progression.nextLevelXp) * 1000) /
      10,
  );
  const dashboardQuests: Quest[] = state.quests
    .slice(0, 4)
    .map((quest) => ({
      id: quest.id,
      title: quest.title,
      category: quest.category,
      difficulty: quest.difficulty,
      xp: quest.xp,
      progress: quest.progress,
      ...(questIcons[quest.category] ?? { icon: Target, tone: "azure" }),
      completed: quest.status === "completed",
    }));
  const attributes = attributeBlueprints.map((attribute) => ({
    ...attribute,
    value:
      state.attributes.find((item) => item.name === attribute.label)?.value ??
      attribute.value,
  }));
  const achievements = state.achievements
    .slice(0, 4)
    .map((achievement, index) => ({
      title: achievement.name,
      detail: `${achievement.category} progression milestone`,
      rarity: achievement.rarity,
      progress: achievement.progress,
      icon: achievementBlueprints[index]?.icon ?? Award,
    }));
  const [activeNav, setActiveNav] = useState("Dashboard");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notice, setNotice] = useState("Your next evolution is within reach.");
  const toggleQuest = (quest: Quest) => {
    if (quest.completed) {
      setNotice(
        `${quest.title} is already recorded. Reopen it from the Quest Log to create a new attempt.`,
      );
      return;
    }
    const result = completeQuest(quest.id);
    setNotice(
      result.ok
        ? `${quest.title} complete. +${quest.xp} XP added to your path.`
        : result.message,
    );
  };
  const quickAction = (action: string) => {
    if (action === "New Quest") {
      window.location.assign("/quests");
      return;
    }
    setNotice(`${action} initiated. Your command has been added to the queue.`);
  };
  return (
    <main className="dashboard-page system-dashboard">
      <div className="dashboard-atmosphere" aria-hidden="true">
        <i className="star star-one" />
        <i className="star star-two" />
        <i className="star star-three" />
        <div className="aurora aurora-one" />
        <div className="aurora aurora-two" />
      </div>
      <Sidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        active={activeNav}
        onSelect={(label) => {
          setActiveNav(label);
          setMobileOpen(false);
          setNotice(
            `${label} selected. This view will unlock as your realm expands.`,
          );
        }}
        onCollapse={() => setCollapsed(!collapsed)}
        onClose={() => setMobileOpen(false)}
      />
      <section
        className={`dashboard-shell ${collapsed ? "sidebar-collapsed" : ""}`}
      >
        <header className="dashboard-header">
          <button
            className="mobile-menu"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
          >
            <Menu size={20} />
          </button>
          <div className="breadcrumb">
            <span>SYSTEM /</span> DASHBOARD
          </div>
          <div className="system-time">
            SYSTEM ONLINE <i /> 14 JUN 2026 • 21:48
          </div>
          <div className="header-actions">
            <button className="header-icon" aria-label="View notifications">
              <Zap size={17} />
              <b>3</b>
            </button>
            <button className="profile-button" aria-label="Open player profile">
              <span>F</span>
              <ChevronRight size={15} />
            </button>
          </div>
        </header>
        <div className="dashboard-content">
          <section className="hero-panel game-panel">
            <div className="hero-copy">
              <p className="eyebrow">
                <span /> PLAYER STATUS / ACTIVE
              </p>
              <h1>
                WELCOME BACK, <em>{state.profile.displayName.toUpperCase()}</em>
              </h1>
              <p className="hero-subtitle">
                {state.profile.title} <b>•</b> Rank{" "}
                <strong>{state.progression.rank}</strong>
              </p>
              <h2 className="evolution-line">YOUR NEXT EVOLUTION STARTS NOW</h2>
              <div className="xp-rail">
                <div className="xp-copy">
                  <span>LEVEL {state.progression.level}</span>
                  <strong>
                    {state.progression.xp.toLocaleString()}{" "}
                    <small>
                      / {state.progression.nextLevelXp.toLocaleString()} XP
                    </small>
                  </strong>
                  <span>LEVEL {state.progression.level + 1}</span>
                </div>
                <div
                  className="xp-track"
                  aria-label={`${state.progression.xp} of ${state.progression.nextLevelXp} experience`}
                >
                  <i style={{ width: `${xpPercent}%` }} />
                  <b />
                </div>
                <p>
                  {(
                    state.progression.nextLevelXp - state.progression.xp
                  ).toLocaleString()}{" "}
                  XP until the next evolution
                </p>
              </div>
              <div className="hero-stats">
                <div>
                  <small>LEVEL</small>
                  <strong>{state.progression.level}</strong>
                </div>
                <div>
                  <small>RANK</small>
                  <strong>{state.progression.rank}</strong>
                </div>
                <div>
                  <small>STREAK</small>
                  <strong>
                    <Flame size={16} /> 8d
                  </strong>
                </div>
                <div>
                  <small>QUESTS</small>
                  <strong>
                    {state.quests.filter(
                      (quest) => quest.status === "completed",
                    ).length || 84}
                  </strong>
                </div>
              </div>
              <button
                className="journey-button"
                onClick={() => quickAction("Continue journey")}
              >
                <Crosshair size={16} /> Continue journey
              </button>
            </div>
            <CharacterPortal />
          </section>
          <div className="command-strip">
            <div className="command-message">
              <Sparkles size={16} />
              <span>{notice}</span>
            </div>
            <div className="daily-chest">
              <Gem size={16} />
              <span>DAILY REWARD</span>
              <b>3 / 4 complete</b>
            </div>
            <div className="quick-actions">
              {[
                { label: "New Quest", icon: Plus },
                { label: "Focus Session", icon: Focus },
                { label: "View Character", icon: Crosshair },
              ].map(({ label, icon: Icon }) => (
                <button key={label} onClick={() => quickAction(label)}>
                  <Icon size={16} />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="dashboard-grid">
            <DailyCommandCenter quests={state.quests} />
            <section className="quests-panel game-panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">
                    <span /> DAILY QUESTS
                  </p>
                  <h2>Today&apos;s expedition</h2>
                </div>
                <button
                  className="text-action"
                  onClick={() => window.location.assign("/quests")}
                >
                  View all <ChevronRight size={16} />
                </button>
              </div>
              <div className="quest-list">
                {dashboardQuests.map((quest) => {
                  const done = quest.completed;
                  const Icon = quest.icon;
                  return (
                    <article
                      className={`quest-row ${done ? "is-complete" : ""}`}
                      key={quest.id}
                    >
                      <div className={`quest-icon ${quest.tone}`}>
                        <Icon size={19} />
                      </div>
                      <div className="quest-info">
                        <div>
                          <h3>{quest.title}</h3>
                          <span>
                            {quest.category} <i /> {quest.difficulty}{" "}
                            <b>+{quest.xp} XP</b>
                          </span>
                        </div>
                        <div className="quest-progress">
                          <i>
                            <b
                              style={{
                                width: `${done ? 100 : quest.progress}%`,
                              }}
                            />
                          </i>
                          <span>
                            {done ? "Complete" : `${quest.progress}%`}
                          </span>
                        </div>
                      </div>
                      <button
                        className="quest-complete"
                        onClick={() => toggleQuest(quest)}
                        aria-label={`${done ? "Completed" : "Complete"} ${quest.title}`}
                      >
                        {done ? <Check size={18} /> : <span />}
                      </button>
                    </article>
                  );
                })}
              </div>
            </section>
            <section className="attributes-panel game-panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">
                    <span /> STATUS MATRIX
                  </p>
                  <h2>Player attributes</h2>
                </div>
                <span className="matrix-label">SYNCED</span>
              </div>
              <div className="attribute-grid">
                {attributes.map(({ label, value, icon: Icon, tone }) => (
                  <div className={`attribute ${tone}`} key={label}>
                    <div
                      className="attribute-ring"
                      style={
                        {
                          "--meter": `${value * 3.6}deg`,
                        } as React.CSSProperties
                      }
                    >
                      <Icon size={18} />
                      <strong>{value}</strong>
                    </div>
                    <span>{label}</span>
                  </div>
                ))}
              </div>
              <div className="matrix-footer">
                <span>
                  <i /> Optimal growth window
                </span>
                <b>+14% this cycle</b>
              </div>
            </section>
            <section className="skills-panel game-panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">
                    <span /> ACTIVE SPECIALIZATIONS
                  </p>
                  <h2>Skills progression</h2>
                </div>
                <button
                  className="text-action"
                  onClick={() => window.location.assign("/skills")}
                >
                  View all <ChevronRight size={16} />
                </button>
              </div>
              <div className="active-skills">
                {[
                  {
                    label: "Front-End Development",
                    level: 8,
                    xp: 76,
                    icon: Brain,
                  },
                  { label: "UI/UX Design", level: 7, xp: 64, icon: Sparkles },
                  {
                    label: "Project Management",
                    level: 5,
                    xp: 48,
                    icon: Target,
                  },
                ].map(({ label, level, xp, icon: Icon }) => (
                  <div key={label}>
                    <span>
                      <Icon size={16} />
                    </span>
                    <section>
                      <strong>
                        {label} <b>Lv. {level}</b>
                      </strong>
                      <i>
                        <b style={{ width: `${xp}%` }} />
                      </i>
                    </section>
                    <em>+{Math.round(xp * 2.4)} XP</em>
                  </div>
                ))}
              </div>
            </section>
            <section className="progress-panel game-panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">
                    <span /> PROGRESS SIGNAL
                  </p>
                  <h2>Today&apos;s momentum</h2>
                </div>
                <button className="period-chip">
                  This week <ChevronRight size={14} />
                </button>
              </div>
              <div className="progress-counters">
                <div>
                  <span className="counter-icon">
                    <Check size={17} />
                  </span>
                  <p>Tasks done</p>
                  <strong>
                    8 <small>/ 12</small>
                  </strong>
                </div>
                <div>
                  <span className="counter-icon violet">
                    <Zap size={17} />
                  </span>
                  <p>XP earned</p>
                  <strong>680</strong>
                </div>
                <div>
                  <span className="counter-icon gold">
                    <Clock3 size={17} />
                  </span>
                  <p>Focus time</p>
                  <strong>
                    3h <small>40m</small>
                  </strong>
                </div>
                <div>
                  <span className="counter-icon rose">
                    <Flame size={17} />
                  </span>
                  <p>Current streak</p>
                  <strong>
                    12 <small>days</small>
                  </strong>
                </div>
              </div>
              <ProgressChart />
            </section>
            <section className="achievements-panel game-panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">
                    <span /> HALL OF FAME
                  </p>
                  <h2>Recent achievements</h2>
                </div>
                <button
                  className="text-action"
                  onClick={() => quickAction("Achievement archive")}
                >
                  View all <ChevronRight size={16} />
                </button>
              </div>
              <div className="achievement-list">
                {achievements.map(
                  ({ title, detail, rarity, progress, icon: Icon }) => (
                    <article
                      className={`achievement ${rarity.toLowerCase()}`}
                      key={title}
                    >
                      <div className="achievement-badge">
                        <Icon size={19} />
                      </div>
                      <div>
                        <h3>{title}</h3>
                        <p>{detail}</p>
                        {progress < 100 && (
                          <div className="achievement-progress">
                            <i>
                              <b style={{ width: `${progress}%` }} />
                            </i>
                            <span>{progress}%</span>
                          </div>
                        )}
                      </div>
                      <span className="rarity">{rarity}</span>
                    </article>
                  ),
                )}
              </div>
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}
