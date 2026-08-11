export type NotificationCategory =
  | "quest_habit"
  | "daily"
  | "campaign"
  | "rewards"
  | "ai"
  | "social"
  | "integrations";

export type NotificationChannel = "inApp" | "push" | "email";

export type NotificationBudgetPreferences = {
  channels: Record<NotificationCategory, Record<NotificationChannel, boolean>>;
  dailyLimit: number;
  quietStart: string;
  quietEnd: string;
  timezone: string;
  bundled: boolean;
  pausedUntil: string | null;
};

export const notificationBudgetStorageKey = "lifequest.notification-budget.v1";

const categoryIds: NotificationCategory[] = [
  "quest_habit",
  "daily",
  "campaign",
  "rewards",
  "ai",
  "social",
  "integrations",
];

export function createDefaultNotificationBudget(
  timezone = "UTC",
): NotificationBudgetPreferences {
  return {
    channels: Object.fromEntries(
      categoryIds.map((category) => [
        category,
        { inApp: true, push: false, email: false },
      ]),
    ) as NotificationBudgetPreferences["channels"],
    dailyLimit: 4,
    quietStart: "22:00",
    quietEnd: "08:00",
    timezone,
    bundled: true,
    pausedUntil: null,
  };
}

export function normalizeNotificationBudget(
  input: Partial<NotificationBudgetPreferences> | null | undefined,
  timezone = "UTC",
): NotificationBudgetPreferences {
  const defaults = createDefaultNotificationBudget(timezone);
  const channels = { ...defaults.channels };
  for (const category of categoryIds) {
    channels[category] = {
      ...defaults.channels[category],
      ...(input?.channels?.[category] ?? {}),
      // Unsupported channels remain off until a delivery service exists.
      push: false,
      email: false,
    };
  }
  return {
    ...defaults,
    ...input,
    channels,
    dailyLimit: Math.max(0, Math.min(12, Number(input?.dailyLimit ?? 4))),
    timezone: input?.timezone || timezone,
  };
}

export function isNotificationPaused(
  preferences: NotificationBudgetPreferences,
  now = new Date(),
) {
  return Boolean(
    preferences.pausedUntil &&
    new Date(preferences.pausedUntil).getTime() > now.getTime(),
  );
}

export function applyDailyNotificationBudget<T extends { createdAt: string }>(
  candidates: T[],
  preferences: NotificationBudgetPreferences,
  now = new Date(),
) {
  if (
    isNotificationPaused(preferences, now) ||
    isWithinQuietHours(preferences, now)
  )
    return [];
  const dateKey = localDateKey(now, preferences.timezone);
  return candidates
    .filter(
      (candidate) =>
        localDateKey(new Date(candidate.createdAt), preferences.timezone) ===
        dateKey,
    )
    .slice(0, preferences.dailyLimit);
}

export function isWithinQuietHours(
  preferences: NotificationBudgetPreferences,
  now = new Date(),
) {
  const minutes = localMinutes(now, preferences.timezone);
  const start = clockMinutes(preferences.quietStart);
  const end = clockMinutes(preferences.quietEnd);
  if (start === end) return false;
  return start < end
    ? minutes >= start && minutes < end
    : minutes >= start || minutes < end;
}

function clockMinutes(value: string) {
  const [hours = "0", minutes = "0"] = value.split(":");
  return Number(hours) * 60 + Number(minutes);
}

function localMinutes(date: Date, timezone: string) {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(date);
    return (
      Number(parts.find((part) => part.type === "hour")?.value ?? 0) * 60 +
      Number(parts.find((part) => part.type === "minute")?.value ?? 0)
    );
  } catch {
    return date.getUTCHours() * 60 + date.getUTCMinutes();
  }
}

function localDateKey(date: Date, timezone: string) {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}
