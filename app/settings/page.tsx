"use client";
/* eslint-disable @next/next/no-img-element, jsx-a11y/label-has-associated-control */
import { ChangeEvent, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Bell,
  ChevronRight,
  KeyRound,
  Menu,
  MonitorCog,
  Save,
  ShieldCheck,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { Sidebar } from "../dashboard/page";
import {
  defaults,
  settingSections,
  storageKey,
  type Preferences,
  type SettingSection,
} from "./data";
import { IntegrationHub, PortabilityPanel } from "./integration-hub";
import {
  ExperienceCenter,
  NotificationPreferenceCenter,
  PrivacyCenter,
  ProgressionLedger,
} from "./trust-center";
import "../dashboard/dashboard.css";
import "./settings.css";
import "./integration-hub.css";
import "./trust-center.css";

type Status = "loading" | "saved" | "unsaved" | "saving" | "error";
export default function SettingsPage() {
  const [section, setSection] = useState<SettingSection>("Profile"),
    [prefs, setPrefs] = useState<Preferences>(defaults),
    [saved, setSaved] = useState<Preferences>(defaults),
    [status, setStatus] = useState<Status>("loading"),
    [collapsed, setCollapsed] = useState(false),
    [mobile, setMobile] = useState(false),
    [avatar, setAvatar] = useState<string | null>(null),
    [dialog, setDialog] = useState<"reset" | "delete" | null>(null),
    [phrase, setPhrase] = useState(""),
    [notice, setNotice] = useState("");
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const raw = localStorage.getItem(storageKey);
        if (raw) {
          const parsed = { ...defaults, ...JSON.parse(raw) };
          setPrefs(parsed);
          setSaved(parsed);
        }
        const image = localStorage.getItem("lifequest.avatar");
        if (image) setAvatar(image);
        setStatus("saved");
      } catch {
        setStatus("error");
        setNotice("Local preferences could not be loaded.");
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  const dirty = useMemo(
    () => JSON.stringify(prefs) !== JSON.stringify(saved),
    [prefs, saved],
  );
  const update = <K extends keyof Preferences>(
    key: K,
    value: Preferences[K],
  ) => {
    setPrefs((p) => ({ ...p, [key]: value }));
    setStatus("unsaved");
  };
  const save = () => {
    setStatus("saving");
    window.setTimeout(() => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(prefs));
        setSaved(prefs);
        setStatus("saved");
        setNotice("System configuration synchronized locally.");
      } catch {
        setStatus("error");
        setNotice("Could not save preferences on this device.");
      }
    }, 350);
  };
  const restore = (keys: (keyof Preferences)[]) => {
    setPrefs(
      (p) =>
        Object.fromEntries(
          Object.entries(p).map(([key, value]) => [
            key,
            keys.includes(key as keyof Preferences)
              ? defaults[key as keyof Preferences]
              : value,
          ]),
        ) as Preferences,
    );
    setStatus("unsaved");
  };
  const uploadAvatar = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 2_000_000) {
      setNotice("Use an image smaller than 2 MB.");
      setStatus("error");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result);
      setAvatar(result);
      localStorage.setItem("lifequest.avatar", result);
      setNotice(
        "Avatar preview updated. Save changes to keep profile settings.",
      );
      setStatus("unsaved");
    };
    reader.readAsDataURL(file);
  };
  const exportData = () => {
    const data = {
      exportedAt: new Date().toISOString(),
      preferences: prefs,
      avatarIncluded: Boolean(avatar),
    };
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "lifequest-settings-backup.json";
    link.click();
    URL.revokeObjectURL(url);
  };
  const importData = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        if (!data.preferences || typeof data.preferences !== "object")
          throw new Error();
        setPrefs({ ...defaults, ...data.preferences });
        setNotice(
          "Backup validated. Review changes, then Save Changes to apply it.",
        );
        setStatus("unsaved");
      } catch {
        setNotice("That backup is invalid or incomplete.");
        setStatus("error");
      }
    };
    reader.readAsText(file);
  };
  return (
    <main
      className={`dashboard-page settings-page ${prefs.highContrast ? "high-contrast" : ""} ${prefs.noParticles ? "no-particles" : ""}`}
      style={{ "--settings-glow": prefs.glow / 100 } as React.CSSProperties}
    >
      <div className="dashboard-atmosphere" />
      <Sidebar
        collapsed={collapsed}
        mobileOpen={mobile}
        active="Settings"
        onSelect={() => setMobile(false)}
        onCollapse={() => setCollapsed(!collapsed)}
        onClose={() => setMobile(false)}
      />
      <section
        className={`dashboard-shell ${collapsed ? "sidebar-collapsed" : ""}`}
      >
        <header className="dashboard-header">
          <button
            className="mobile-menu"
            onClick={() => setMobile(true)}
            aria-label="Open navigation"
          >
            <Menu size={20} />
          </button>
          <div className="breadcrumb">
            <span>SYSTEM /</span> SETTINGS
          </div>
          <div className="settings-status">
            <i className={status} />
            {status === "saving"
              ? "SAVING"
              : status === "unsaved"
                ? "UNSAVED CHANGES"
                : status === "error"
                  ? "SYNC ERROR"
                  : "SYSTEM ONLINE"}
          </div>
          <div className="header-actions">
            <button className="header-icon" aria-label="Notifications">
              <Bell size={16} />
              <b>3</b>
            </button>
            <button className="profile-button" aria-label="Open player profile">
              {avatar ? (
                <img src={avatar} alt="Player avatar" />
              ) : (
                <span>F</span>
              )}
              <ChevronRight size={15} />
            </button>
          </div>
        </header>
        <div className="settings-content">
          <section className="settings-hero">
            <div>
              <p>SYSTEM TERMINAL / PERSONAL</p>
              <h1>
                SYSTEM <em>CONFIGURATION</em>
              </h1>
              <span>Customize how your personal System operates.</span>
            </div>
            <div className="save-state">
              <ShieldCheck size={18} />
              <span>
                {dirty
                  ? "Changes waiting to synchronize"
                  : "All local preferences synchronized"}
              </span>
            </div>
          </section>
          <div className="settings-layout">
            <nav className="settings-nav" aria-label="Settings sections">
              <select
                value={section}
                onChange={(e) => setSection(e.target.value as SettingSection)}
                aria-label="Choose settings section"
              >
                {settingSections.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
              {settingSections.map((item) => (
                <button
                  key={item}
                  className={section === item ? "active" : ""}
                  onClick={() => setSection(item)}
                >
                  {item}
                </button>
              ))}
            </nav>
            <section className="settings-workspace game-panel">
              {status === "loading" ? (
                <div className="settings-empty">
                  Loading local configuration…
                </div>
              ) : (
                <SettingsSection
                  section={section}
                  prefs={prefs}
                  update={update}
                  avatar={avatar}
                  onAvatar={uploadAvatar}
                  onRemoveAvatar={() => {
                    setAvatar(null);
                    localStorage.removeItem("lifequest.avatar");
                    setStatus("unsaved");
                  }}
                  restore={restore}
                  exportData={exportData}
                  importData={importData}
                  openDanger={setDialog}
                />
              )}
            </section>
          </div>
        </div>
      </section>
      {dirty ? (
        <div className="save-bar">
          <span>{notice || "You have unsaved configuration changes."}</span>
          <div>
            <button
              onClick={() => {
                setPrefs(saved);
                setStatus("saved");
                setNotice("Changes discarded.");
              }}
            >
              Cancel
            </button>
            <button onClick={save}>
              <Save size={15} /> Save Changes
            </button>
          </div>
        </div>
      ) : null}
      {dialog ? (
        <ConfirmDialog
          mode={dialog}
          phrase={phrase}
          setPhrase={setPhrase}
          close={() => {
            setDialog(null);
            setPhrase("");
          }}
        />
      ) : null}
    </main>
  );
}
function SettingsSection({
  section,
  prefs,
  update,
  avatar,
  onAvatar,
  onRemoveAvatar,
  restore,
  openDanger,
}: {
  section: SettingSection;
  prefs: Preferences;
  update: <K extends keyof Preferences>(key: K, value: Preferences[K]) => void;
  avatar: string | null;
  onAvatar: (e: ChangeEvent<HTMLInputElement>) => void;
  onRemoveAvatar: () => void;
  restore: (keys: (keyof Preferences)[]) => void;
  exportData: () => void;
  importData: (e: ChangeEvent<HTMLInputElement>) => void;
  openDanger: (mode: "reset" | "delete") => void;
}) {
  if (section === "Experience") return <ExperienceCenter />;
  if (section === "Notifications") return <NotificationPreferenceCenter />;
  if (section === "Privacy") return <PrivacyCenter />;
  if (section === "Progress Ledger") return <ProgressionLedger />;
  if (section === "Integrations") return <IntegrationHub />;
  if (section === "Data") return <PortabilityPanel />;
  const field = (key: keyof Preferences, label: string, type = "text") => (
    <label className="field">
      <span>{label}</span>
      <input
        type={type}
        value={String(prefs[key])}
        onChange={(e) => update(key, e.target.value as never)}
      />
    </label>
  );
  const toggle = (
    key: keyof Preferences,
    label: string,
    description: string,
  ) => (
    <label className="toggle-row">
      <span>
        <b>{label}</b>
        <small>{description}</small>
      </span>
      <input
        type="checkbox"
        checked={Boolean(prefs[key])}
        onChange={(e) => update(key, e.target.checked as never)}
      />
    </label>
  );
  const select = (key: keyof Preferences, label: string, items: string[]) => (
    <label className="field">
      <span>{label}</span>
      <select
        value={String(prefs[key])}
        onChange={(e) => update(key, e.target.value as never)}
      >
        {items.map((i) => (
          <option key={i}>{i}</option>
        ))}
      </select>
    </label>
  );
  if (section === "Profile")
    return (
      <Section
        title="Profile identity"
        detail="Your private profile stays private unless you enable a specific public sharing option."
      >
        <div className="avatar-editor">
          <div>{avatar ? <img src={avatar} alt="Avatar preview" /> : "F"}</div>
          <section>
            <b>Player avatar</b>
            <small>PNG, JPG, or WebP up to 2 MB.</small>
            <label className="action-button">
              <Upload size={14} /> Replace avatar
              <input type="file" accept="image/*" onChange={onAvatar} />
            </label>
            <button onClick={onRemoveAvatar}>Remove</button>
          </section>
        </div>
        <div className="form-grid">
          {field("displayName", "Display name")}
          {field("username", "Username")}
          {field("email", "Email", "email")}
          {select("title", "Equipped title", [
            "Awakened Developer",
            "Pathfinder",
            "Disciplined Hunter",
          ])}
          {select("language", "Preferred language", [
            "English",
            "Arabic",
            "French",
          ])}
          {field("region", "General region (optional)")}
        </div>
        <label className="field full">
          <span>Short biography</span>
          <textarea
            value={prefs.bio}
            maxLength={160}
            onChange={(e) => update("bio", e.target.value)}
          />
        </label>
        <button className="section-save" onClick={() => restore([])}>
          Restore profile defaults
        </button>
      </Section>
    );
  if (section === "System")
    return (
      <Section
        title="System preferences"
        detail="Timezone, dates, resets, and activity windows are stored for your local System."
      >
        <div className="form-grid">
          {select("language", "Language", ["English", "Arabic", "French"])}
          {field("timezone", "Timezone")}
          {select("dateFormat", "Date format", [
            "DD MMM YYYY",
            "MM/DD/YYYY",
            "YYYY-MM-DD",
          ])}
          {select("timeFormat", "Time format", ["24-hour", "12-hour"])}
          {select("firstDay", "First day of week", ["Monday", "Sunday"])}
          {select("units", "Measurement units", ["Metric", "Imperial"])}
          {field("resetTime", "Daily reset time", "time")}
          {select("landing", "Default landing page", [
            "Dashboard",
            "Quests",
            "Habits",
          ])}
          {select("density", "Interface density", ["Comfortable", "Compact"])}
        </div>
        <button
          className="section-save"
          onClick={() =>
            restore([
              "language",
              "timezone",
              "dateFormat",
              "timeFormat",
              "firstDay",
              "units",
              "resetTime",
              "landing",
              "density",
            ])
          }
        >
          Restore system defaults
        </button>
      </Section>
    );
  if (section === "Appearance")
    return (
      <Section
        title="Interface appearance"
        detail="Preview changes instantly; your device motion preference is always respected."
      >
        <div className="form-grid">
          {select("theme", "System theme", [
            "System Dark",
            "Deep Black",
            "High Contrast",
          ])}
          {select("animation", "Animation intensity", [
            "Standard",
            "Reduced",
            "Minimal",
          ])}
          {select("textSize", "Text size", ["Default", "Large", "Extra large"])}
        </div>
        <label className="range-field">
          Glow intensity{" "}
          <input
            type="range"
            min="0"
            max="100"
            value={prefs.glow}
            onChange={(e) => update("glow", Number(e.target.value))}
          />
          <b>{prefs.glow}%</b>
        </label>
        {toggle(
          "particles",
          "Particle effects",
          "Subtle background signal particles.",
        )}
        {toggle(
          "scans",
          "Holographic scan effects",
          "Fine scanning lines on active panels.",
        )}
        {toggle(
          "compact",
          "Compact mode",
          "Reduce nonessential vertical spacing.",
        )}
        <div className="appearance-preview">
          <MonitorCog size={18} />
          <span>LIVE INTERFACE PREVIEW</span>
          <b>System Dark · {prefs.glow}% glow</b>
        </div>
        <button
          className="section-save"
          onClick={() =>
            restore([
              "theme",
              "glow",
              "particles",
              "scans",
              "animation",
              "textSize",
              "compact",
            ])
          }
        >
          Restore appearance defaults
        </button>
      </Section>
    );
  if (section === "RPG Preferences")
    return (
      <Section
        title="RPG preferences"
        detail="Core XP rates, achievement requirements, and ranking scoring remain protected by the System."
      >
        {[
          ["xpAnimations", "Show XP animations"],
          ["celebrations", "Show level-up celebrations"],
          ["rewardReveals", "Show reward reveals"],
          ["autoClaim", "Automatically claim simple rewards"],
          ["confirmConsumables", "Confirm before using consumables"],
          ["confirmPoints", "Confirm before spending skill points"],
          ["suggestions", "Show quest difficulty suggestions"],
          ["habitQuests", "Automatically create quests from habits"],
        ].map(([key, label]) =>
          toggle(
            key as keyof Preferences,
            label,
            "Personal display and workflow preference.",
          ),
        )}
      </Section>
    );
  if (section === "Accessibility")
    return (
      <Section
        title="Accessibility controls"
        detail="These preferences apply visually across the interface when supported."
      >
        {[
          ["reducedMotion", "Reduced motion"],
          ["highContrast", "High contrast"],
          ["largerText", "Larger text"],
          ["largeControls", "Increased control size"],
          ["focus", "Stronger focus indicators"],
          ["noParticles", "Disable background particles"],
          ["noFlash", "Disable flashing effects"],
          ["chartSummaries", "Screen-reader chart summaries"],
          ["simpleMode", "Simplified interface mode"],
        ].map(([key, label]) =>
          toggle(key as keyof Preferences, label, "Accessibility preference."),
        )}
      </Section>
    );
  return (
    <Section
      title="Security and account actions"
      detail="Secure account actions require a connected backend and are unavailable in this local application."
    >
      <div className="unsupported">
        <KeyRound size={17} /> Password changes, two-factor setup,
        active-session management, and sign-out-from-other-devices need the
        secure authentication service.
      </div>
      <div className="security-log">
        <b>Recent security activity</b>
        <span>Current browser session · active now</span>
        <span>No other sessions available locally</span>
      </div>
      <div className="danger-zone">
        <p>
          <AlertTriangle size={17} /> DANGER ZONE
        </p>
        <span>
          These requests are blocked until a real backend is connected. They
          never run from this interface.
        </span>
        <div>
          <button onClick={() => openDanger("reset")}>
            Reset game progress
          </button>
          <button onClick={() => openDanger("delete")}>
            <Trash2 size={14} /> Delete account
          </button>
        </div>
      </div>
    </Section>
  );
}
function Section({
  title,
  detail,
  children,
}: {
  title: string;
  detail: string;
  children: React.ReactNode;
}) {
  return (
    <section className="settings-section">
      <header>
        <p>CONFIGURATION MODULE</p>
        <h2>{title}</h2>
        <span>{detail}</span>
      </header>
      {children}
    </section>
  );
}
function ConfirmDialog({
  mode,
  phrase,
  setPhrase,
  close,
}: {
  mode: "reset" | "delete";
  phrase: string;
  setPhrase: (value: string) => void;
  close: () => void;
}) {
  const word = mode === "delete" ? "DELETE ACCOUNT" : "RESET PROGRESS";
  return (
    <div className="confirm-scrim">
      <section
        className="confirm-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Dangerous action confirmation"
      >
        <button onClick={close} aria-label="Close">
          <X size={17} />
        </button>
        <AlertTriangle size={26} />
        <h2>{mode === "delete" ? "Delete account" : "Reset game progress"}</h2>
        <p>
          No data will be changed: this local build has no backend operation.
          Type <b>{word}</b> to acknowledge the request.
        </p>
        <input
          value={phrase}
          onChange={(e) => setPhrase(e.target.value)}
          placeholder={word}
        />
        <div>
          <button onClick={close}>Cancel</button>
          <button
            disabled={phrase !== word}
            title="Unavailable without a secure backend"
          >
            Final confirmation unavailable
          </button>
        </div>
      </section>
    </div>
  );
}
