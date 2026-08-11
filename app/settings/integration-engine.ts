export type ProviderId = "google_calendar" | "microsoft_outlook" | "ics";
export type ConnectionState =
  | "unconfigured"
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";
export type CalendarPermission = "read_events" | "write_system_events";
export type ExternalEvent = {
  externalId: string;
  title: string;
  startsAt: string;
  endsAt: string;
  allDay: boolean;
  timezone?: string;
  source: ProviderId;
  systemOwned: boolean;
  description?: string;
};

export interface ProviderAdapter {
  id: ProviderId;
  authorize(
    permissions: CalendarPermission[],
  ): Promise<{ authorizationUrl: string }>;
  mapExternalEvent(input: Record<string, unknown>): ExternalEvent;
  sync(
    events: ExternalEvent[],
    cursor?: string,
  ): Promise<{ events: ExternalEvent[]; cursor: string }>;
  disconnect(): Promise<{ revoked: boolean; deletedCredentials: boolean }>;
  canMutate(event: ExternalEvent): boolean;
}

export function createCalendarAdapter(
  id: Exclude<ProviderId, "ics">,
  configured: boolean,
): ProviderAdapter {
  const fail = () => {
    throw new Error(
      configured
        ? "Provider authorization is required."
        : `${id} credentials are not configured.`,
    );
  };
  return {
    id,
    async authorize(permissions) {
      if (!configured) return fail();
      const scopes = permissions.map((permission) =>
        permission === "read_events"
          ? "calendar.readonly"
          : "calendar.events.owned",
      );
      return {
        authorizationUrl: `/api/integrations/${id}/authorize?scopes=${encodeURIComponent(scopes.join(" "))}`,
      };
    },
    mapExternalEvent(input) {
      const externalId = String(input.externalId ?? input.id ?? "");
      if (!externalId) throw new Error("Stable external event ID is required.");
      return {
        externalId,
        title: String(input.title ?? "Untitled event").slice(0, 200),
        startsAt: new Date(String(input.startsAt)).toISOString(),
        endsAt: new Date(String(input.endsAt)).toISOString(),
        allDay: Boolean(input.allDay),
        timezone: input.timezone ? String(input.timezone) : undefined,
        source: id,
        systemOwned: Boolean(input.systemOwned),
        description: input.description
          ? String(input.description).slice(0, 1000)
          : undefined,
      };
    },
    async sync(events, cursor = "initial") {
      const deduped = [
        ...new Map(events.map((event) => [event.externalId, event])).values(),
      ];
      return { events: deduped, cursor: `${cursor}:${deduped.length}` };
    },
    async disconnect() {
      return { revoked: configured, deletedCredentials: true };
    },
    canMutate(event) {
      return event.source === id && event.systemOwned;
    },
  };
}

const unfoldIcs = (text: string) =>
  text.replace(/\r?\n[ \t]/g, "").split(/\r?\n/);
const escapeIcs = (value: string) =>
  value
    .replaceAll("\\", "\\\\")
    .replaceAll(";", "\\;")
    .replaceAll(",", "\\,")
    .replaceAll("\n", "\\n");
const unescapeIcs = (value: string) =>
  value
    .replaceAll("\\n", "\n")
    .replaceAll("\\,", ",")
    .replaceAll("\\;", ";")
    .replaceAll("\\\\", "\\");
const parseIcsDate = (value: string, allDay: boolean) => {
  if (allDay) {
    if (!/^\d{8}$/.test(value)) throw new Error("Malformed all-day date.");
    return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
  }
  if (!/^\d{8}T\d{6}Z?$/.test(value)) throw new Error("Malformed event time.");
  const iso = `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}T${value.slice(9, 11)}:${value.slice(11, 13)}:${value.slice(13, 15)}${value.endsWith("Z") ? "Z" : ""}`;
  return value.endsWith("Z") ? new Date(iso).toISOString() : iso;
};
const formatIcsDate = (value: string, allDay: boolean) =>
  allDay
    ? value.slice(0, 10).replaceAll("-", "")
    : new Date(value)
        .toISOString()
        .replaceAll("-", "")
        .replaceAll(":", "")
        .replace(".000", "");

export function parseIcs(text: string): {
  events: ExternalEvent[];
  rejected: string[];
  duplicates: string[];
} {
  if (!text.includes("BEGIN:VCALENDAR"))
    throw new Error("Malformed ICS calendar.");
  const lines = unfoldIcs(text);
  const events: ExternalEvent[] = [];
  const rejected: string[] = [];
  const duplicates: string[] = [];
  const seen = new Set<string>();
  let block: string[] | null = null;
  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      block = [];
      continue;
    }
    if (line === "END:VEVENT" && block) {
      try {
        const fields = Object.fromEntries(
          block.map((entry) => {
            const split = entry.indexOf(":");
            return [entry.slice(0, split), entry.slice(split + 1)];
          }),
        );
        const uid = fields.UID;
        const startKey = Object.keys(fields).find((key) =>
          key.startsWith("DTSTART"),
        );
        const endKey = Object.keys(fields).find((key) =>
          key.startsWith("DTEND"),
        );
        if (!uid || !startKey || !endKey)
          throw new Error("VEVENT requires UID, DTSTART, and DTEND.");
        if (seen.has(uid)) {
          duplicates.push(uid);
          block = null;
          continue;
        }
        const allDay = startKey.includes("VALUE=DATE");
        const timezone = /TZID=([^;:]+)/.exec(startKey)?.[1];
        events.push({
          externalId: uid,
          title: unescapeIcs(fields.SUMMARY ?? "Untitled event"),
          startsAt: parseIcsDate(fields[startKey], allDay),
          endsAt: parseIcsDate(fields[endKey], allDay),
          allDay,
          timezone,
          source: "ics",
          systemOwned: fields["X-SYSTEM-OWNED"] === "TRUE",
          description: fields.DESCRIPTION
            ? unescapeIcs(fields.DESCRIPTION)
            : undefined,
        });
        seen.add(uid);
      } catch (error) {
        rejected.push((error as Error).message);
      }
      block = null;
      continue;
    }
    if (block) block.push(line);
  }
  return { events, rejected, duplicates };
}

export function exportIcs(events: ExternalEvent[]) {
  const body = events
    .map((event) => {
      const zone =
        !event.allDay && event.timezone
          ? `;TZID=${event.timezone}`
          : event.allDay
            ? ";VALUE=DATE"
            : "";
      return [
        "BEGIN:VEVENT",
        `UID:${escapeIcs(event.externalId)}`,
        `DTSTART${zone}:${formatIcsDate(event.startsAt, event.allDay)}`,
        `DTEND${zone}:${formatIcsDate(event.endsAt, event.allDay)}`,
        `SUMMARY:${escapeIcs(event.title)}`,
        event.description ? `DESCRIPTION:${escapeIcs(event.description)}` : "",
        `X-SYSTEM-OWNED:${event.systemOwned ? "TRUE" : "FALSE"}`,
        "END:VEVENT",
      ]
        .filter(Boolean)
        .join("\r\n");
    })
    .join("\r\n");
  return `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//SYSTEM//Portable Plans 1.0//EN\r\n${body}\r\nEND:VCALENDAR\r\n`;
}

const forbiddenImportKeys = new Set([
  "xp",
  "coins",
  "rank",
  "mastery",
  "achievements",
  "bossRewards",
  "boss_rewards",
  "progression",
  "inventory",
]);
export type AccountExport = {
  format: "system-account-export";
  version: 1;
  exportedAt: string;
  data: {
    profile?: unknown;
    preferences?: unknown;
    quests: unknown[];
    habits: unknown[];
    skills: unknown[];
    activity: unknown[];
    focusSessions?: unknown[];
  };
};
export function createAccountExport(
  data: AccountExport["data"],
): AccountExport {
  return {
    format: "system-account-export",
    version: 1,
    exportedAt: new Date().toISOString(),
    data,
  };
}
export function previewImport(input: unknown) {
  const rejected: string[] = [];
  if (!input || typeof input !== "object")
    return {
      valid: false,
      accepted: [],
      duplicates: [],
      rejected: ["Import must be an object."],
    };
  const object = input as Record<string, unknown>;
  const isSystemExport =
    object.format === "system-account-export" && object.version === 1;
  const walk = (value: unknown, path = "root") => {
    if (!value || typeof value !== "object") return;
    for (const [key, child] of Object.entries(
      value as Record<string, unknown>,
    )) {
      if (forbiddenImportKeys.has(key))
        rejected.push(
          `${path}.${key}: authoritative progression cannot be imported`,
        );
      else walk(child, `${path}.${key}`);
    }
  };
  if (!isSystemExport) walk(object);
  const rawRecords = Array.isArray(object.records)
    ? object.records
    : isSystemExport &&
        (object.data as Record<string, unknown>)?.quests instanceof Array
      ? ((object.data as Record<string, unknown>).quests as unknown[])
      : [];
  const records = isSystemExport
    ? rawRecords.map((record) => {
        const source = record as Record<string, unknown>;
        return {
          id: source.id,
          title: source.title,
          description: source.description,
          category: source.category,
          type: source.type,
          difficulty: source.difficulty,
          deadline: source.deadline,
          objectives: source.objectives,
          status: "draft",
        };
      })
    : rawRecords;
  const ids = new Set<string>();
  const accepted: unknown[] = [];
  const duplicates: string[] = [];
  records.forEach((record, index) => {
    const id = String(
      (record as Record<string, unknown>)?.id ?? `row-${index}`,
    );
    if (ids.has(id)) duplicates.push(id);
    else {
      ids.add(id);
      accepted.push(record);
    }
  });
  return { valid: rejected.length === 0, accepted, duplicates, rejected };
}
export function toCsv(rows: Array<Record<string, unknown>>) {
  if (!rows.length) return "";
  const columns = [...new Set(rows.flatMap(Object.keys))];
  const cell = (value: unknown) =>
    `"${String(value ?? "").replaceAll('"', '""')}"`;
  return [
    columns.map(cell).join(","),
    ...rows.map((row) => columns.map((column) => cell(row[column])).join(",")),
  ].join("\r\n");
}

export type OfflineMutation = {
  requestId: string;
  accountId: string;
  kind: "quick_capture" | "quest_completion";
  payload: Record<string, unknown>;
  status: "queued" | "syncing" | "conflict" | "synced";
  attempts: number;
  nextAttemptAt: string;
  error?: string;
};
export function queueOfflineMutation(
  queue: OfflineMutation[],
  input: Omit<OfflineMutation, "status" | "attempts" | "nextAttemptAt">,
): OfflineMutation[] {
  if (queue.some((item) => item.requestId === input.requestId)) return queue;
  return [
    ...queue,
    {
      ...input,
      status: "queued",
      attempts: 0,
      nextAttemptAt: new Date(0).toISOString(),
    },
  ];
}
export async function flushOfflineQueue(
  queue: OfflineMutation[],
  sync: (mutation: OfflineMutation) => Promise<"synced" | "conflict">,
  now = new Date(),
) {
  const result: OfflineMutation[] = [];
  for (const mutation of queue) {
    if (
      mutation.status === "synced" ||
      new Date(mutation.nextAttemptAt) > now
    ) {
      result.push(mutation);
      continue;
    }
    try {
      const status = await sync({ ...mutation, status: "syncing" });
      result.push({
        ...mutation,
        status,
        error:
          status === "conflict"
            ? "Review the server version before retrying."
            : undefined,
      });
    } catch (error) {
      const attempts = mutation.attempts + 1;
      result.push({
        ...mutation,
        status: "queued",
        attempts,
        nextAttemptAt: new Date(
          now.getTime() + Math.min(3600000, 1000 * 2 ** attempts),
        ).toISOString(),
        error: (error as Error).message,
      });
    }
  }
  return result;
}
export function clearAccountQueue(queue: OfflineMutation[], accountId: string) {
  return queue.filter((mutation) => mutation.accountId !== accountId);
}
