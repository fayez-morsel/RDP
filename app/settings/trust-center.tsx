"use client";
/* eslint-disable react-hooks/set-state-in-effect, jsx-a11y/label-has-associated-control -- notification preferences are hydrated after SSR; compound setting labels wrap their native controls. */

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  BellRing,
  Bot,
  Check,
  ChevronDown,
  Database,
  Eye,
  FileKey,
  Globe2,
  LockKeyhole,
  Pause,
  ShieldCheck,
  Sparkles,
  Trash2,
  Users,
} from "lucide-react";
import {
  useExperience,
  type ExperiencePreferences,
  type InterfaceMode,
} from "../experience";
import { usePlayer, type ActivityEvent } from "../player-store";
import {
  createDefaultNotificationBudget,
  normalizeNotificationBudget,
  notificationBudgetStorageKey,
  type NotificationBudgetPreferences,
  type NotificationCategory,
  type NotificationChannel,
} from "../notification-budget";

const modes: Array<{ id: InterfaceMode; title: string; detail: string }> = [
  {
    id: "minimal",
    title: "Minimal",
    detail:
      "Today, quests, focus, and essential progress with less visual density.",
  },
  {
    id: "standard",
    title: "Standard",
    detail: "Balanced navigation, feedback, and planning tools.",
  },
  {
    id: "immersive",
    title: "Immersive",
    detail: "Full HUD, richer non-blocking motion, and advanced panels.",
  },
];

export function ExperienceCenter() {
  const { preferences, update } = useExperience();
  const toggle = (
    key: keyof ExperiencePreferences,
    label: string,
    detail: string,
  ) => (
    <label className="trust-toggle">
      <span>
        <b>{label}</b>
        <small>{detail}</small>
      </span>
      <input
        type="checkbox"
        checked={Boolean(preferences[key])}
        onChange={(event) => update({ [key]: event.target.checked })}
      />
    </label>
  );
  return (
    <section className="trust-module">
      <header>
        <p>PERSONALIZATION / PRESENTATION ONLY</p>
        <h2>Experience mode</h2>
        <span>
          Switch at any time. Modes never change XP, rewards, caps, or
          completion rules.
        </span>
      </header>
      <div className="mode-grid">
        {modes.map((mode) => (
          <button
            key={mode.id}
            className={preferences.mode === mode.id ? "active" : ""}
            onClick={() => update({ mode: mode.id })}
          >
            <i>{preferences.mode === mode.id ? <Check size={15} /> : null}</i>
            <b>{mode.title}</b>
            <span>{mode.detail}</span>
          </button>
        ))}
      </div>
      <div className="trust-grid">
        <Select
          label="Language / اللغة"
          value={preferences.locale}
          onChange={(value) => update({ locale: value as "en" | "ar" })}
          options={[
            ["en", "English"],
            ["ar", "العربية"],
          ]}
        />
        <Select
          label="Density"
          value={preferences.density}
          onChange={(value) =>
            update({ density: value as ExperiencePreferences["density"] })
          }
          options={[
            ["comfortable", "Comfortable"],
            ["compact", "Compact"],
          ]}
        />
        <Select
          label="Animation intensity"
          value={preferences.animation}
          onChange={(value) =>
            update({ animation: value as ExperiencePreferences["animation"] })
          }
          options={["minimal", "reduced", "standard", "rich"].map((item) => [
            item,
            item,
          ])}
        />
        <Select
          label="Time format"
          value={preferences.timeFormat}
          onChange={(value) => update({ timeFormat: value as "12" | "24" })}
          options={[
            ["24", "24-hour"],
            ["12", "12-hour"],
          ]}
        />
        <Select
          label="First day of week"
          value={preferences.firstDay}
          onChange={(value) =>
            update({ firstDay: value as "monday" | "sunday" })
          }
          options={[
            ["monday", "Monday"],
            ["sunday", "Sunday"],
          ]}
        />
        <Select
          label="Default day mode"
          value={preferences.defaultDayMode}
          onChange={(value) =>
            update({
              defaultDayMode: value as ExperiencePreferences["defaultDayMode"],
            })
          }
          options={["balanced", "focus", "recovery"].map((item) => [
            item,
            item,
          ])}
        />
      </div>
      {toggle(
        "reducedMotion",
        "Reduced motion",
        "Overrides animation intensity and respects the device preference.",
      )}
      {toggle(
        "highContrast",
        "High contrast",
        "Strengthen borders and secondary text contrast.",
      )}
      {toggle(
        "colorSafePatterns",
        "Color-vision-safe patterns",
        "Add patterns so charts never rely on color alone.",
      )}
      {toggle(
        "largerText",
        "Larger text",
        "Increase text scale without disabling browser zoom.",
      )}
      <div className="volume-grid">
        <Volume
          label="Sound volume"
          value={preferences.soundVolume}
          onChange={(soundVolume) => update({ soundVolume })}
        />
        <Volume
          label="Celebration volume"
          value={preferences.celebrationVolume}
          onChange={(celebrationVolume) => update({ celebrationVolume })}
        />
      </div>
    </section>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[][];
}) {
  return (
    <label className="trust-field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map(([id, text]) => (
          <option value={id} key={id}>
            {text}
          </option>
        ))}
      </select>
    </label>
  );
}
function Volume({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label>
      {label}
      <input
        type="range"
        min="0"
        max="100"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <b>{value}%</b>
    </label>
  );
}

const categories: Record<NotificationCategory, string> = {
  quest_habit: "Quest & habit reminders",
  daily: "Daily planning & shutdown",
  campaign: "Campaign risk",
  rewards: "Achievements & rewards",
  ai: "AI proposals",
  social: "Allies, guilds & focus",
  integrations: "Integration errors",
};

export function NotificationPreferenceCenter() {
  const [prefs, setPrefs] = useState<NotificationBudgetPreferences>(() =>
    createDefaultNotificationBudget(),
  );
  const [hydrated, setHydrated] = useState(false);
  const [renderedAt] = useState(() => Date.now());
  useEffect(() => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    try {
      setPrefs(
        normalizeNotificationBudget(
          JSON.parse(
            localStorage.getItem(notificationBudgetStorageKey) ?? "null",
          ),
          timezone,
        ),
      );
    } catch {
      setPrefs(createDefaultNotificationBudget(timezone));
    } finally {
      setHydrated(true);
    }
  }, []);
  useEffect(() => {
    if (hydrated)
      localStorage.setItem(notificationBudgetStorageKey, JSON.stringify(prefs));
  }, [hydrated, prefs]);
  const paused = Boolean(
    prefs.pausedUntil && new Date(prefs.pausedUntil).getTime() > renderedAt,
  );
  return (
    <section className="trust-module">
      <header>
        <p>NOTIFICATION BUDGET / CALM BY DEFAULT</p>
        <h2>Notification comfort</h2>
        <span>
          Non-critical motivation is bundled and capped. Security and account
          messages remain separate.
        </span>
      </header>
      <div className="notification-matrix">
        <div className="matrix-head">
          <b>Category</b>
          <b>In app</b>
          <b>Push</b>
          <b>Email</b>
        </div>
        {(Object.keys(categories) as NotificationCategory[]).map((category) => (
          <div className="matrix-row" key={category}>
            <span>{categories[category]}</span>
            {(["inApp", "push", "email"] as NotificationChannel[]).map(
              (channel) => (
                <label
                  key={channel}
                  aria-label={`${categories[category]} ${channel}`}
                >
                  <input
                    type="checkbox"
                    checked={prefs.channels[category][channel]}
                    disabled={channel !== "inApp"}
                    onChange={(event) =>
                      setPrefs((current) => ({
                        ...current,
                        channels: {
                          ...current.channels,
                          [category]: {
                            ...current.channels[category],
                            [channel]: event.target.checked,
                          },
                        },
                      }))
                    }
                  />
                </label>
              ),
            )}
          </div>
        ))}
      </div>
      <div className="notification-budget">
        <label>
          Maximum non-critical notifications per day
          <input
            type="number"
            min="0"
            max="12"
            value={prefs.dailyLimit}
            onChange={(event) =>
              setPrefs((current) => ({
                ...current,
                dailyLimit: Math.max(
                  0,
                  Math.min(12, Number(event.target.value)),
                ),
              }))
            }
          />
        </label>
        <label>
          Quiet hours
          <input
            type="text"
            value={`${prefs.quietStart}–${prefs.quietEnd}`}
            readOnly
          />
        </label>
        <label>
          Timezone
          <input type="text" value={prefs.timezone} readOnly />
        </label>
      </div>
      <div className="trust-toggle">
        <span>
          <b>Bundled summaries</b>
          <small>Combine lower-priority updates into one calm digest.</small>
        </span>
        <input
          type="checkbox"
          checked={prefs.bundled}
          onChange={(event) =>
            setPrefs((current) => ({
              ...current,
              bundled: event.target.checked,
            }))
          }
        />
      </div>
      <button
        className={paused ? "paused" : ""}
        onClick={() =>
          setPrefs((current) => ({
            ...current,
            pausedUntil: paused
              ? null
              : new Date(Date.now() + 86_400_000).toISOString(),
          }))
        }
      >
        <Pause size={14} />
        {paused ? "Resume motivational notifications" : "Pause for 24 hours"}
      </button>
      <aside className="trust-callout">
        <BellRing size={16} />
        <span>
          No guilt, fake urgency, streak threats, or repeated nagging. Push and
          email remain disabled until supported.
        </span>
      </aside>
    </section>
  );
}

export function PrivacyCenter() {
  const { state, updatePreferences } = usePlayer();
  const [confirming, setConfirming] = useState(false);
  const [phrase, setPhrase] = useState("");
  const [requested, setRequested] = useState(false);
  const confirmationInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!confirming) return;
    confirmationInputRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setConfirming(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [confirming]);
  const rows = [
    {
      icon: Eye,
      title: "Profile visibility",
      detail: state.preferences.publicRanking
        ? "Opted into public rankings"
        : "Private by default",
      action: (
        <input
          aria-label="Public profile visibility"
          type="checkbox"
          checked={state.preferences.publicRanking}
          onChange={(event) =>
            updatePreferences({ publicRanking: event.target.checked })
          }
        />
      ),
    },
    {
      icon: Users,
      title: "Allies and guilds",
      detail: "Per-person rules · guilds invitation-only",
    },
    {
      icon: FileKey,
      title: "Evidence and portfolio",
      detail: "Private unless explicitly published",
    },
    {
      icon: Bot,
      title: "AI data access",
      detail: "Retention, memory, and context separately controlled",
    },
    {
      icon: Globe2,
      title: "Connected integrations",
      detail: "Google and Microsoft unconfigured · ICS local",
    },
    {
      icon: BellRing,
      title: "Notification channels",
      detail: "In-app supported · push/email unavailable",
    },
    {
      icon: Database,
      title: "Data portability",
      detail: "Versioned export and dry-run restore available",
    },
    {
      icon: LockKeyhole,
      title: "Active sessions",
      detail: "Current browser only; remote list requires backend",
    },
  ];
  return (
    <section className="trust-module">
      <header>
        <p>PRIVACY CENTER / SENSITIVE DATA PRIVATE</p>
        <h2>One place for control</h2>
        <span>
          Publishing, connector permissions, and deletion always require
          explicit confirmation.
        </span>
      </header>
      <div className="privacy-index">
        {rows.map((row) => {
          const Icon = row.icon;
          return (
            <article key={row.title}>
              <Icon size={17} />
              <div>
                <b>{row.title}</b>
                <span>{row.detail}</span>
              </div>
              {row.action ?? <ChevronDown size={15} />}
            </article>
          );
        })}
      </div>
      <section className="deletion-card">
        <AlertTriangle size={18} />
        <div>
          <b>Request account deletion</b>
          <span>
            Requires recent re-authentication. The server policy provides a
            recoverable 14-day grace period.
          </span>
        </div>
        <button onClick={() => setConfirming(true)}>
          <Trash2 size={14} />
          Start request
        </button>
      </section>
      {confirming && (
        <div
          className="trust-confirm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-request-title"
        >
          <ShieldCheck size={22} />
          <h3 id="delete-request-title">Confirm deletion request</h3>
          <p>
            This local preview changes nothing. Type DELETE MY DATA to review
            the protected workflow.
          </p>
          <input
            ref={confirmationInputRef}
            value={phrase}
            onChange={(event) => setPhrase(event.target.value)}
            placeholder="DELETE MY DATA"
          />
          <div>
            <button onClick={() => setConfirming(false)}>Cancel</button>
            <button
              disabled={phrase !== "DELETE MY DATA"}
              onClick={() => {
                setRequested(true);
                setConfirming(false);
              }}
            >
              Prepare 14-day request
            </button>
          </div>
        </div>
      )}
      {requested && (
        <div className="trust-callout" role="status">
          <Check size={15} />
          <span>
            Deletion workflow prepared. No account data changed in this local
            build.
          </span>
        </div>
      )}
    </section>
  );
}

const eventLabels: Record<string, string> = {
  xp_awarded: "XP awarded",
  quest_completed: "Quest completed",
  habit_completed: "Habit completed",
  level_up: "Level increased",
  rank_up: "Rank increased",
  achievement_unlocked: "Achievement unlocked",
  reward_claimed: "Reward claimed",
  attribute_milestone: "Attribute changed",
  skill_xp_awarded: "Skill XP awarded",
  progression_adjustment: "Authorized adjustment",
  progression_reversal: "Authorized reversal",
};
function describe(event: ActivityEvent) {
  const metadata = event.metadata ?? {};
  return {
    label: eventLabels[event.type] ?? event.type.replaceAll("_", " "),
    source: event.sourceId ?? String(metadata.source ?? "SYSTEM rule"),
    xp: Number(metadata.amount ?? metadata.xp ?? 0),
    coins: Number(metadata.coins ?? 0),
    cap: String(
      metadata.cap ??
        metadata.capRule ??
        "Standard idempotency and daily caps applied",
    ),
    reference: String(metadata.idempotencyKey ?? event.id),
  };
}

export function ProgressionLedger() {
  const { state } = usePlayer();
  const { formatDate, formatNumber } = useExperience();
  const events = useMemo(
    () => state.activity.map((event) => ({ event, ...describe(event) })),
    [state.activity],
  );
  const [expanded, setExpanded] = useState<string | null>(null);
  return (
    <section className="trust-module ledger-module">
      <header>
        <p>IMMUTABLE PROGRESSION AUDIT</p>
        <h2>Why your progress changed</h2>
        <span>
          Rows cannot be edited. Corrections require authorized linked
          adjustment or reversal events with a reason.
        </span>
      </header>
      <aside className="trust-callout">
        <Sparkles size={16} />
        <span>
          Caps prevent accidental farming and duplicate settlement. Unusual
          activity is reviewed neutrally—it is not proof of wrongdoing.
        </span>
      </aside>
      <div className="ledger-list">
        {events.length ? (
          events.map(({ event, label, source, xp, coins, cap, reference }) => (
            <article key={event.id}>
              <button
                onClick={() =>
                  setExpanded(expanded === event.id ? null : event.id)
                }
                aria-expanded={expanded === event.id}
              >
                <span>
                  <b>{label}</b>
                  <small>
                    {source} · {formatDate(event.occurredAt)}
                  </small>
                </span>
                <strong>
                  {xp
                    ? `${xp > 0 ? "+" : ""}${formatNumber(xp)} XP`
                    : coins
                      ? `${coins > 0 ? "+" : ""}${formatNumber(coins)} coins`
                      : "Recorded"}
                </strong>
                <ChevronDown size={15} />
              </button>
              {expanded === event.id && (
                <div>
                  <dl>
                    <dt>Related source</dt>
                    <dd>{source}</dd>
                    <dt>Applied cap</dt>
                    <dd>{cap}</dd>
                    <dt>Reference ID</dt>
                    <dd>{reference}</dd>
                    <dt>Route</dt>
                    <dd>{event.route}</dd>
                  </dl>
                  <small>Read-only permanent record</small>
                </div>
              )}
            </article>
          ))
        ) : (
          <div className="ledger-empty">
            <Database size={24} />
            <b>No progression changes yet</b>
            <span>
              Complete a real-world quest or habit to create the first
              authoritative entry.
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
