"use client";
import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import {
  AlertCircle,
  CalendarDays,
  Check,
  CloudOff,
  DatabaseBackup,
  Download,
  FileClock,
  FileJson,
  FileSpreadsheet,
  Keyboard,
  Link2Off,
  RefreshCcw,
  RotateCcw,
  ShieldCheck,
  Trash2,
  Upload,
  Wifi,
  WifiOff,
} from "lucide-react";
import { usePlayer } from "../player-store";
import {
  createAccountExport,
  exportIcs,
  flushOfflineQueue,
  parseIcs,
  previewImport,
  queueOfflineMutation,
  toCsv,
  type OfflineMutation,
  type ProviderId,
} from "./integration-engine";

type ProviderStatus = {
  configured: boolean;
  state: "unconfigured" | "disconnected";
  setup: string;
};
const providerMeta: Record<
  Exclude<ProviderId, "ics">,
  { name: string; detail: string; scopes: string[] }
> = {
  google_calendar: {
    name: "Google Calendar",
    detail:
      "Import selected calendar events and write only SYSTEM-created time blocks.",
    scopes: ["Read selected calendar", "Create and manage SYSTEM events"],
  },
  microsoft_outlook: {
    name: "Microsoft Outlook",
    detail: "Use least-privilege Microsoft Graph calendar permissions.",
    scopes: ["Read selected calendar", "Create and manage SYSTEM events"],
  },
};
const download = (name: string, content: string, type: string) => {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
};

export function IntegrationHub() {
  const [statuses, setStatuses] = useState<Record<string, ProviderStatus>>({
    google_calendar: {
      configured: false,
      state: "unconfigured",
      setup: "Add server-side Google OAuth credentials.",
    },
    microsoft_outlook: {
      configured: false,
      state: "unconfigured",
      setup: "Add server-side Microsoft OAuth credentials.",
    },
  });
  const [notice, setNotice] = useState(
    "Provider secrets are never sent to this browser.",
  );
  const [syncFrequency, setSyncFrequency] = useState("Manual");
  const [calendar, setCalendar] = useState("No calendar selected");
  useEffect(() => {
    fetch("/api/integrations/status")
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then(setStatuses)
      .catch(() =>
        setNotice(
          "Configuration status is unavailable. Connectors remain safely disabled.",
        ),
      );
  }, []);
  return (
    <section className="integration-module">
      <header className="integration-title">
        <div>
          <p>PORTABILITY MODULE / OPTIONAL</p>
          <h2>Integration Hub</h2>
          <span>
            Connect planning tools without granting them progression authority.
          </span>
        </div>
        <ShieldCheck size={23} />
      </header>
      <div className="connector-grid">
        {(Object.keys(providerMeta) as Array<Exclude<ProviderId, "ics">>).map(
          (id) => {
            const meta = providerMeta[id],
              status = statuses[id];
            return (
              <article className="connector-card" key={id}>
                <header>
                  <span>
                    <CalendarDays size={19} />
                  </span>
                  <div>
                    <small>
                      {status?.configured
                        ? "READY TO AUTHORIZE"
                        : "NOT CONFIGURED"}
                    </small>
                    <h3>{meta.name}</h3>
                  </div>
                  <b className={status?.configured ? "ready" : "disabled"}>
                    {status?.state ?? "checking"}
                  </b>
                </header>
                <p>{meta.detail}</p>
                <dl>
                  <div>
                    <dt>Direction</dt>
                    <dd>Import events ↔ export SYSTEM blocks</dd>
                  </div>
                  <div>
                    <dt>Last sync</dt>
                    <dd>Never</dd>
                  </div>
                  <div>
                    <dt>Last error</dt>
                    <dd>
                      {status?.configured
                        ? "None"
                        : "OAuth credentials missing"}
                    </dd>
                  </div>
                </dl>
                <h4>Requested permissions</h4>
                <ul>
                  {meta.scopes.map((scope) => (
                    <li key={scope}>
                      <Check size={12} />
                      {scope}
                    </li>
                  ))}
                </ul>
                <label>
                  Calendar
                  <select
                    value={calendar}
                    onChange={(event) => setCalendar(event.target.value)}
                    disabled={!status?.configured}
                  >
                    <option>No calendar selected</option>
                  </select>
                </label>
                <label>
                  Sync frequency
                  <select
                    value={syncFrequency}
                    onChange={(event) => setSyncFrequency(event.target.value)}
                    disabled={!status?.configured}
                  >
                    <option>Manual</option>
                    <option>Every 15 minutes</option>
                    <option>Hourly</option>
                  </select>
                </label>
                <div className="connector-actions">
                  <button
                    disabled={!status?.configured}
                    onClick={() =>
                      setNotice(
                        `Authorization for ${meta.name} would open with the two displayed scopes.`,
                      )
                    }
                  >
                    <RefreshCcw size={14} /> Connect
                  </button>
                  <button disabled>
                    <Link2Off size={14} /> Disconnect
                  </button>
                  <button disabled>
                    <Trash2 size={14} /> Delete connection data
                  </button>
                </div>
                <small className="setup-note">
                  <AlertCircle size={13} />
                  {status?.setup}
                </small>
              </article>
            );
          },
        )}
        <article className="connector-card ics-card">
          <header>
            <span>
              <FileClock size={19} />
            </span>
            <div>
              <small>AVAILABLE LOCALLY</small>
              <h3>ICS calendar file</h3>
            </div>
            <b className="ready">ready</b>
          </header>
          <p>
            Standards-based import and export works without an account or
            provider secret.
          </p>
          <dl>
            <div>
              <dt>Direction</dt>
              <dd>Import and export</dd>
            </div>
            <div>
              <dt>Timezone</dt>
              <dd>TZID, UTC, and all-day</dd>
            </div>
          </dl>
          <button
            onClick={() =>
              download(
                "system-plans.ics",
                exportIcs([
                  {
                    externalId: "system-focus-demo",
                    title: "SYSTEM focus block",
                    startsAt: new Date(Date.now() + 86400000).toISOString(),
                    endsAt: new Date(Date.now() + 88200000).toISOString(),
                    allDay: false,
                    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                    source: "ics",
                    systemOwned: true,
                  },
                ]),
                "text/calendar",
              )
            }
          >
            <Download size={14} /> Export sample SYSTEM block
          </button>
          <small className="setup-note">
            <ShieldCheck size={13} />
            Imported events create planning constraints only and grant no XP.
          </small>
        </article>
      </div>
      <div className="integration-notice" role="status">
        <ShieldCheck size={14} />
        {notice}
      </div>
    </section>
  );
}

export function PortabilityPanel() {
  const { state, addQuest } = usePlayer();
  const [preview, setPreview] = useState<ReturnType<
    typeof previewImport
  > | null>(null);
  const [previewName, setPreviewName] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [queue, setQueue] = useState<OfflineMutation[]>([]);
  const [online, setOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  const [capture, setCapture] = useState("");
  const [restoreNotice, setRestoreNotice] = useState("");
  useEffect(() => {
    const on = () => setOnline(true),
      off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  const accountExport = useMemo(
    () =>
      createAccountExport({
        profile: state.profile,
        preferences: state.preferences,
        quests: state.quests,
        habits: state.habits,
        skills: state.skills,
        activity: state.activity,
      }),
    [state],
  );
  const inspect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setPreviewName(file.name);
    setConfirmed(false);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        if (file.name.toLowerCase().endsWith(".ics")) {
          const ics = parseIcs(String(reader.result));
          setPreview({
            valid: ics.rejected.length === 0,
            accepted: ics.events,
            duplicates: ics.duplicates,
            rejected: ics.rejected,
          });
        } else setPreview(previewImport(JSON.parse(String(reader.result))));
      } catch (error) {
        setPreview({
          valid: false,
          accepted: [],
          duplicates: [],
          rejected: [(error as Error).message],
        });
      }
    };
    reader.readAsText(file);
  };
  const quickCapture = () => {
    if (!capture.trim()) return;
    setQueue((current) =>
      queueOfflineMutation(current, {
        requestId: crypto.randomUUID(),
        accountId: "local-player",
        kind: "quick_capture",
        payload: { text: capture.trim().slice(0, 500) },
      }),
    );
    setCapture("");
  };
  const sync = async () =>
    setQueue(
      await flushOfflineQueue(queue, async () =>
        online ? "synced" : "conflict",
      ),
    );
  const applyRestore = () => {
    if (!preview || !confirmed) return;
    let applied = 0;
    for (const record of preview.accepted) {
      const item = record as Record<string, unknown>;
      if (typeof item.title !== "string" || !item.title.trim()) continue;
      addQuest({
        title: item.title.slice(0, 160),
        description:
          typeof item.description === "string"
            ? item.description.slice(0, 600)
            : "Imported planning reference",
        category:
          typeof item.category === "string"
            ? item.category.slice(0, 80)
            : "Imported",
        type: "Side Quests",
        difficulty: "Easy",
        xp: 0,
        coins: 0,
        progress: 0,
        deadline:
          typeof item.deadline === "string" ? item.deadline : "Unscheduled",
        objectives: [
          {
            id: `objective:${crypto.randomUUID()}`,
            label: "Review this imported planning reference",
            done: false,
          },
        ],
        status: "draft",
      });
      applied += 1;
    }
    setRestoreNotice(
      `${applied} planning record${applied === 1 ? "" : "s"} restored as drafts. Progression history was preserved.`,
    );
    setPreview(null);
    setConfirmed(false);
  };
  return (
    <section className="portability-module">
      <header className="integration-title">
        <div>
          <p>DATA PORTABILITY / VERSION 1</p>
          <h2>Export, preview, restore</h2>
          <span>
            Your data remains readable, selective, and protected from fabricated
            progression.
          </span>
        </div>
        <DatabaseBackup size={23} />
      </header>
      <div className="export-grid">
        <button
          onClick={() =>
            download(
              "system-account-v1.json",
              JSON.stringify(accountExport, null, 2),
              "application/json",
            )
          }
        >
          <FileJson size={19} />
          <span>
            <b>Full account JSON</b>
            <small>
              Versioned profile, planning, and authoritative history
            </small>
          </span>
          <Download size={14} />
        </button>
        <button
          onClick={() =>
            download(
              "system-quests.csv",
              toCsv(state.quests as unknown as Array<Record<string, unknown>>),
              "text/csv",
            )
          }
        >
          <FileSpreadsheet size={19} />
          <span>
            <b>Quests CSV</b>
            <small>Portable planning and completion columns</small>
          </span>
          <Download size={14} />
        </button>
        <button
          onClick={() =>
            download(
              "system-habits.csv",
              toCsv(state.habits as unknown as Array<Record<string, unknown>>),
              "text/csv",
            )
          }
        >
          <FileSpreadsheet size={19} />
          <span>
            <b>Habits CSV</b>
            <small>Habit definitions and check-in summaries</small>
          </span>
          <Download size={14} />
        </button>
        <button
          onClick={() =>
            download(
              "system-progression-history.csv",
              toCsv(
                state.activity as unknown as Array<Record<string, unknown>>,
              ),
              "text/csv",
            )
          }
        >
          <FileSpreadsheet size={19} />
          <span>
            <b>Progression history CSV</b>
            <small>Read-only authoritative event history</small>
          </span>
          <Download size={14} />
        </button>
      </div>
      <section className="import-panel">
        <header>
          <Upload size={18} />
          <div>
            <h3>Import or restore preview</h3>
            <p>
              JSON backup or ICS calendar · no changes before explicit
              confirmation
            </p>
          </div>
        </header>
        <label className="import-drop">
          Choose a JSON or ICS file
          <input
            type="file"
            accept="application/json,.json,text/calendar,.ics"
            onChange={inspect}
          />
        </label>
        {preview && (
          <div
            className={`preview-report ${preview.valid ? "valid" : "invalid"}`}
          >
            <header>
              <div>
                <small>{previewName}</small>
                <h4>{preview.valid ? "Preview ready" : "Import rejected"}</h4>
              </div>
              <b>
                {preview.accepted.length} accepted · {preview.duplicates.length}{" "}
                duplicates · {preview.rejected.length} rejected
              </b>
            </header>
            {preview.rejected.map((error) => (
              <p key={error}>
                <AlertCircle size={13} />
                {error}
              </p>
            ))}
            <label>
              <input
                type="checkbox"
                checked={confirmed}
                disabled={!preview.valid}
                onChange={(event) => setConfirmed(event.target.checked)}
              />{" "}
              I reviewed the mapping and selected records
            </label>
            <button
              disabled={!confirmed}
              onClick={applyRestore}
            >
              <RotateCcw size={14} /> Confirm planning-data restore
            </button>
            <small>
              Authoritative XP, coins, mastery, achievements, and boss rewards
              are never imported.
            </small>
          </div>
        )}
        {restoreNotice && (
          <div className="integration-notice" role="status">
            <ShieldCheck size={14} />
            {restoreNotice}
          </div>
        )}
      </section>
      <section className="offline-panel">
        <header>
          <div>
            {online ? <Wifi size={18} /> : <WifiOff size={18} />}
            <span>
              <b>{online ? "Online" : "Offline mode"}</b>
              <small>
                {queue.filter((item) => item.status !== "synced").length}{" "}
                mutations waiting
              </small>
            </span>
          </div>
          <button onClick={sync} disabled={!queue.length}>
            <RefreshCcw size={14} /> Sync queue
          </button>
        </header>
        <div className="capture-row">
          <input
            value={capture}
            onChange={(event) => setCapture(event.target.value)}
            placeholder="Quick-capture an inbox item"
            maxLength={500}
          />
          <button onClick={quickCapture}>Capture</button>
        </div>
        <div className="queue-list">
          {queue.length ? (
            queue.map((item) => (
              <article key={item.requestId}>
                <CloudOff size={14} />
                <span>
                  <b>{String(item.payload.text ?? item.kind)}</b>
                  <small>
                    {item.status} · stable request {item.requestId.slice(0, 8)}
                  </small>
                </span>
                {item.error && <em>{item.error}</em>}
              </article>
            ))
          ) : (
            <p>
              No offline actions waiting. Replayed request IDs settle at most
              once.
            </p>
          )}
        </div>
      </section>
      <aside className="quick-access">
        <Keyboard size={18} />
        <div>
          <b>Quick access</b>
          <span>
            <kbd>Ctrl</kbd> + <kbd>K</kbd> command center · <kbd>N</kbd> quick
            capture · <kbd>?</kbd> shortcut reference
          </span>
          <small>
            PWA shortcuts: Quick Capture, Today, and Focus. Native health
            widgets are intentionally unavailable in this web app.
          </small>
        </div>
      </aside>
    </section>
  );
}
