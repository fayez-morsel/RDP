"use client";
/* eslint-disable react-hooks/set-state-in-effect -- preferences are hydrated from browser storage after SSR. */

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type InterfaceMode = "minimal" | "standard" | "immersive";
export type Locale = "en" | "ar";

export type ExperiencePreferences = {
  mode: InterfaceMode;
  locale: Locale;
  density: "comfortable" | "compact";
  reducedMotion: boolean;
  animation: "minimal" | "reduced" | "standard" | "rich";
  soundVolume: number;
  celebrationVolume: number;
  highContrast: boolean;
  colorSafePatterns: boolean;
  largerText: boolean;
  timeFormat: "12" | "24";
  firstDay: "monday" | "sunday";
  defaultDayMode: "balanced" | "focus" | "recovery";
};

export const defaultExperience: ExperiencePreferences = {
  mode: "standard",
  locale: "en",
  density: "comfortable",
  reducedMotion: false,
  animation: "standard",
  soundVolume: 40,
  celebrationVolume: 55,
  highContrast: false,
  colorSafePatterns: false,
  largerText: false,
  timeFormat: "24",
  firstDay: "monday",
  defaultDayMode: "balanced",
};

const storageKey = "lifequest.experience.v1";
const messages = {
  en: {
    Dashboard: "Today",
    Quests: "Quests",
    Habits: "Habits",
    Skills: "Skills",
    Achievements: "Achievements",
    Inventory: "Inventory",
    Leaderboard: "Leaderboard",
    Analytics: "Analytics",
    Settings: "Settings",
    openNavigation: "Open navigation",
    closeNavigation: "Close navigation",
    collapse: "Collapse",
    expand: "Expand sidebar",
    notifications: "View notifications",
    profile: "Open player profile",
    progressExplanation:
      "Only verified real-world completion creates progress.",
  },
  ar: {
    Dashboard: "اليوم",
    Quests: "المهام",
    Habits: "العادات",
    Skills: "المهارات",
    Achievements: "الإنجازات",
    Inventory: "المخزون",
    Leaderboard: "لوحة التقدّم",
    Analytics: "التحليلات",
    Settings: "الإعدادات",
    openNavigation: "فتح التنقّل",
    closeNavigation: "إغلاق التنقّل",
    collapse: "طي القائمة",
    expand: "توسيع القائمة",
    notifications: "عرض الإشعارات",
    profile: "فتح ملف اللاعب",
    progressExplanation: "لا يتحقق التقدّم إلا بإنجاز واقعي موثّق.",
  },
} as const;

type MessageKey = keyof typeof messages.en;
type ExperienceContextValue = {
  preferences: ExperiencePreferences;
  update: (patch: Partial<ExperiencePreferences>) => void;
  t: (key: MessageKey) => string;
  formatDate: (value: string | Date) => string;
  formatNumber: (value: number) => string;
};

const ExperienceContext = createContext<ExperienceContextValue | null>(null);

export function ExperienceProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState(defaultExperience);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) ?? "{}");
      setPreferences({ ...defaultExperience, ...saved });
    } catch {
      setPreferences(defaultExperience);
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.lang = preferences.locale;
    root.dir = preferences.locale === "ar" ? "rtl" : "ltr";
    root.dataset.mode = preferences.mode;
    root.dataset.density = preferences.density;
    root.dataset.animation = preferences.reducedMotion
      ? "minimal"
      : preferences.animation;
    root.dataset.contrast = preferences.highContrast ? "high" : "standard";
    root.dataset.patterns = preferences.colorSafePatterns ? "safe" : "color";
    root.style.fontSize = preferences.largerText ? "112.5%" : "100%";
    localStorage.setItem(storageKey, JSON.stringify(preferences));
  }, [preferences]);

  const value = useMemo<ExperienceContextValue>(
    () => ({
      preferences,
      update: (patch) =>
        setPreferences((current) => ({ ...current, ...patch })),
      t: (key) => messages[preferences.locale][key],
      formatDate: (value) =>
        new Intl.DateTimeFormat(
          preferences.locale === "ar" ? "ar-LB" : "en-GB",
          {
            dateStyle: "medium",
            timeStyle: "short",
            hour12: preferences.timeFormat === "12",
          },
        ).format(new Date(value)),
      formatNumber: (value) =>
        new Intl.NumberFormat(
          preferences.locale === "ar" ? "ar-LB" : "en-GB",
        ).format(value),
    }),
    [preferences],
  );

  return (
    <ExperienceContext.Provider value={value}>
      {children}
    </ExperienceContext.Provider>
  );
}

export function useExperience() {
  const context = useContext(ExperienceContext);
  if (!context)
    throw new Error("useExperience must be used inside ExperienceProvider");
  return context;
}

export function translateValidation(
  locale: Locale,
  key: "required" | "invalid" | "offline",
) {
  return {
    en: {
      required: "This field is required.",
      invalid: "Check this value and try again.",
      offline: "Saved offline. It will synchronize when you reconnect.",
    },
    ar: {
      required: "هذا الحقل مطلوب.",
      invalid: "تحقّق من القيمة وحاول مرة أخرى.",
      offline: "تم الحفظ دون اتصال، وستتم المزامنة عند عودة الشبكة.",
    },
  }[locale][key];
}
