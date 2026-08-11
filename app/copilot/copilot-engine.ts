export type CopilotMode = "plan" | "brief" | "rescue" | "review" | "ask";
export type CopilotOperation = "create_quest" | "create_campaign" | "rescope_quest" | "schedule_quest" | "pause_quest" | "reflection_question" | "answer";
export type CopilotContext = {
  date: string;
  availableMinutes: number;
  activeQuests: Array<{ id: string; title: string; deadline: string; progress: number }>;
  capacityRisk: string;
  reviewInsights: string[];
};
export type CopilotRequest = { mode: CopilotMode; input: string; context: CopilotContext };
export type CopilotProposalItem = {
  id: string;
  operation: CopilotOperation;
  title: string;
  before: string;
  after: string;
  reason: string;
  selected: boolean;
  reversible: boolean;
  targetId?: string;
  estimatedMinutes?: number;
};
export type CopilotProposal = {
  id: string;
  mode: CopilotMode;
  summary: string;
  items: CopilotProposalItem[];
  status: "draft" | "confirmed" | "applied" | "rejected" | "undone";
  source: "provider" | "manual-fallback";
  provider?: string;
  model?: string;
};
export type CopilotPreferences = { enabled: boolean; consented: boolean; retention: boolean; memory: boolean; analyticsSharing: boolean };
export type CopilotProvider = { generate(request: CopilotRequest, signal: AbortSignal): Promise<unknown> };

const allowedModes = new Set<CopilotMode>(["plan", "brief", "rescue", "review", "ask"]);
const allowedOperations = new Set<CopilotOperation>(["create_quest", "create_campaign", "rescope_quest", "schedule_quest", "pause_quest", "reflection_question", "answer"]);
const forbiddenKeys = new Set(["xp", "coins", "rank", "mastery", "damage", "bossdamage", "inventory", "achievement", "completequest", "completehabit", "verifyevidence", "leaderboardscore"]);
const record = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const cleanText = (value: unknown, max = 500) => typeof value === "string" ? Array.from(value, (character) => { const code = character.charCodeAt(0); return code < 32 || code === 127 ? " " : character; }).join("").trim().slice(0, max) : "";

export function wrapUntrustedUserContent(value: string) {
  const content = cleanText(value, 1_500).replace(/<\/untrusted-user-content>/gi, "[end tag removed]");
  return `<untrusted-user-content>\n${content}\n</untrusted-user-content>`;
}

function containsForbiddenAuthority(value: unknown, key = ""): boolean {
  const normalized = key.replace(/[^a-z]/gi, "").toLowerCase();
  if (forbiddenKeys.has(normalized)) return true;
  if (Array.isArray(value)) return value.some((item) => containsForbiddenAuthority(item));
  if (record(value)) return Object.entries(value).some(([childKey, child]) => containsForbiddenAuthority(child, childKey));
  return false;
}

export function validateCopilotCandidate(value: unknown): { ok: true; proposal: CopilotProposal } | { ok: false; error: string } {
  if (!record(value) || !allowedModes.has(value.mode as CopilotMode) || !Array.isArray(value.items) || value.items.length > 8) return { ok: false, error: "The provider returned an invalid proposal shape." };
  if (containsForbiddenAuthority(value)) return { ok: false, error: "The proposal attempted a protected progression operation." };
  const items: CopilotProposalItem[] = [];
  for (let index = 0; index < value.items.length; index += 1) {
    const item = value.items[index];
    if (!record(item) || !allowedOperations.has(item.operation as CopilotOperation)) return { ok: false, error: "The proposal included an unsupported operation." };
    const title = cleanText(item.title, 160); const after = cleanText(item.after, 600); const reason = cleanText(item.reason, 400);
    if (!title || !after || !reason) return { ok: false, error: "Each proposal item needs a title, preview, and explanation." };
    const estimated = Number(item.estimatedMinutes);
    items.push({ id: cleanText(item.id, 80) || `proposal-item-${index + 1}`, operation: item.operation as CopilotOperation, title, before: cleanText(item.before, 600) || "No current item", after, reason, selected: item.selected !== false, reversible: item.reversible === true, targetId: cleanText(item.targetId, 120) || undefined, estimatedMinutes: Number.isFinite(estimated) ? Math.max(5, Math.min(480, Math.round(estimated))) : undefined });
  }
  return { ok: true, proposal: { id: cleanText(value.id, 100) || `proposal-${Date.now()}`, mode: value.mode as CopilotMode, summary: cleanText(value.summary, 600) || "A draft proposal is ready for review.", items, status: "draft", source: value.source === "manual-fallback" ? "manual-fallback" : "provider", provider: cleanText(value.provider, 80) || undefined, model: cleanText(value.model, 120) || undefined } };
}

const item = (id: string, operation: CopilotOperation, title: string, before: string, after: string, reason: string, extra: Partial<CopilotProposalItem> = {}): CopilotProposalItem => ({ id, operation, title, before, after, reason, selected: true, reversible: ["create_quest", "rescope_quest", "schedule_quest", "pause_quest"].includes(operation), ...extra });
const goalTitle = (input: string) => cleanText(input, 90) || "Build a meaningful outcome";

export function deterministicProposal(request: CopilotRequest, now = Date.now()): CopilotProposal {
  const goal = goalTitle(request.input);
  const firstQuest = request.context.activeQuests[0];
  const common = { id: `proposal-${now}`, mode: request.mode, status: "draft" as const, source: "manual-fallback" as const, provider: "SYSTEM deterministic planner", model: "rules-v1" };
  if (request.mode === "plan") return { ...common, summary: `A private draft campaign for “${goal}” with milestones small enough to edit before applying.`, items: [item("campaign", "create_campaign", goal, "No campaign", `Draft campaign: ${goal}`, "Creates a planning container only; it awards no progression."), item("milestone-1", "create_quest", "Define the finish line", "No quest", `Write one measurable success criterion for ${goal}.`, "A concrete finish line makes later choices easier.", { estimatedMinutes: 20 }), item("milestone-2", "create_quest", "Build the smallest proof", "No quest", `Complete the smallest useful demonstration of ${goal}.`, "A small proof exposes risk without overcommitting capacity.", { estimatedMinutes: 45 }), item("milestone-3", "create_quest", "Review and choose the next step", "No quest", `Review the result and choose one confirmed next action.`, "A review prevents an automatic expansion of scope.", { estimatedMinutes: 20 })] };
  if (request.mode === "brief") return { ...common, summary: `${request.context.activeQuests.length} active quests, ${request.context.availableMinutes} confirmed minutes, and ${request.context.capacityRisk}.`, items: [item("brief", "answer", "Today’s operating brief", "Scattered planning context", request.context.activeQuests.slice(0, 3).map((quest, index) => `${index + 1}. ${quest.title} — ${quest.progress}% complete`).join("\n") || "No active Prime Quests.", "This summarizes confirmed planning data and changes nothing.", { reversible: false })] };
  if (request.mode === "rescue") return { ...common, summary: "A lower-pressure recovery proposal. Nothing moves until you confirm selected changes.", items: firstQuest ? [item("minimum", "rescope_quest", `Reduce ${firstQuest.title}`, firstQuest.title, `Do the 20-minute minimum version of ${firstQuest.title}.`, "Preserves momentum while respecting current capacity.", { targetId: firstQuest.id, estimatedMinutes: 20 }), item("defer", "schedule_quest", "Defer the next non-urgent item", request.context.activeQuests[1]?.title ?? "No second item", "Move it to the next available planning window.", "Removes overload without marking work complete.", { targetId: request.context.activeQuests[1]?.id })] : [item("rescue-empty", "answer", "No active plan to rescue", "No active quests", "Choose one five-minute next action manually.", "The fallback stays useful without inventing account data.", { reversible: false })] };
  if (request.mode === "review") return { ...common, summary: "A reflection draft based only on existing Review Lab calculations.", items: [...request.context.reviewInsights.slice(0, 2).map((insight, index) => item(`insight-${index}`, "answer", `Observed pattern ${index + 1}`, "Review Lab calculation", insight, "This repeats a deterministic insight without claiming causation.", { reversible: false })), item("question", "reflection_question", "Reflection question", "No response recorded", "What is one planning assumption you would change next week, and what evidence supports that change?", "A question supports reflection without changing plans or progression.", { reversible: false })] };
  return { ...common, summary: "A mechanics answer from the manual SYSTEM guide.", items: [item("answer", "answer", "SYSTEM answer", "Question received as untrusted data", `SYSTEM can explain and propose planning changes for: ${goal}. It cannot complete work, award rewards, verify evidence, or change rankings.`, "This answer is informational and performs no operation.", { reversible: false })] };
}

export class CopilotRateLimiter {
  private requests = new Map<string, number[]>();
  constructor(private limit = 6, private windowMs = 60_000) {}
  take(key: string, now = Date.now()) { const recent = (this.requests.get(key) ?? []).filter((time) => now - time < this.windowMs); if (recent.length >= this.limit) return false; this.requests.set(key, [...recent, now]); return true; }
}

export async function requestCopilotProposal(provider: CopilotProvider | null, request: CopilotRequest, options: { preferences: CopilotPreferences; signal?: AbortSignal; timeoutMs?: number; limiter?: CopilotRateLimiter; actor?: string } ) {
  if (!options.preferences.enabled) return { ok: true as const, proposal: deterministicProposal(request), notice: "AI is disabled. Manual deterministic planning is active." };
  if (!options.preferences.consented) return { ok: false as const, code: "consent", message: "Review and confirm the data categories before using Copilot." };
  if (options.limiter && !options.limiter.take(options.actor ?? "local")) return { ok: false as const, code: "rate-limit", message: "Copilot is cooling down. Your manual planning tools still work." };
  if (!provider) return { ok: true as const, proposal: deterministicProposal(request), notice: "Provider unavailable. Manual deterministic planning is active." };
  const controller = new AbortController();
  const onAbort = () => controller.abort(); options.signal?.addEventListener("abort", onAbort, { once: true });
  const timer = setTimeout(() => controller.abort(), Math.max(250, Math.min(options.timeoutMs ?? 12_000, 30_000)));
  try {
    const raw = await provider.generate({ ...request, input: wrapUntrustedUserContent(request.input) }, controller.signal);
    const validated = validateCopilotCandidate(raw);
    if (!validated.ok) return { ok: false as const, code: "validation", message: validated.error };
    return { ok: true as const, proposal: validated.proposal, notice: "Provider proposal validated. Review every selected change before confirmation." };
  } catch (error) {
    if (controller.signal.aborted && options.signal?.aborted) return { ok: false as const, code: "cancelled", message: "Generation cancelled. Nothing was changed." };
    const reason = controller.signal.aborted ? "The provider timed out." : error instanceof Error ? error.message : "The provider failed.";
    return { ok: true as const, proposal: deterministicProposal(request), notice: `${reason} Manual deterministic planning is active.` };
  } finally { clearTimeout(timer); options.signal?.removeEventListener("abort", onAbort); }
}

export type CopilotApplyServices = {
  createQuest(input: { title: string; description: string; estimatedMinutes: number }): string;
  createCampaign?(input: { title: string }): string;
  rescopeQuest?(id: string, description: string): boolean;
  scheduleQuest?(id: string, schedule: string): boolean;
  pauseQuest?(id: string): boolean;
  undo?(receipt: CopilotApplyReceipt): boolean;
};
export type CopilotApplyReceipt = { proposalId: string; appliedItemIds: string[]; createdIds: string[]; reversible: boolean; progressionDelta: 0 };

export function applyConfirmedProposal(proposal: CopilotProposal, selectedIds: string[], confirmed: boolean, services: CopilotApplyServices): CopilotApplyReceipt {
  if (!confirmed) return { proposalId: proposal.id, appliedItemIds: [], createdIds: [], reversible: false, progressionDelta: 0 };
  const selected = new Set(selectedIds); const appliedItemIds: string[] = []; const createdIds: string[] = [];
  for (const proposalItem of proposal.items.filter((entry) => selected.has(entry.id))) {
    let applied = false;
    if (proposalItem.operation === "create_quest") { createdIds.push(services.createQuest({ title: proposalItem.title, description: proposalItem.after, estimatedMinutes: proposalItem.estimatedMinutes ?? 25 })); applied = true; }
    else if (proposalItem.operation === "create_campaign" && services.createCampaign) { createdIds.push(services.createCampaign({ title: proposalItem.title })); applied = true; }
    else if (proposalItem.operation === "rescope_quest" && proposalItem.targetId && services.rescopeQuest) applied = services.rescopeQuest(proposalItem.targetId, proposalItem.after);
    else if (proposalItem.operation === "schedule_quest" && proposalItem.targetId && services.scheduleQuest) applied = services.scheduleQuest(proposalItem.targetId, proposalItem.after);
    else if (proposalItem.operation === "pause_quest" && proposalItem.targetId && services.pauseQuest) applied = services.pauseQuest(proposalItem.targetId);
    else if (["answer", "reflection_question"].includes(proposalItem.operation)) applied = true;
    if (applied) appliedItemIds.push(proposalItem.id);
  }
  return { proposalId: proposal.id, appliedItemIds, createdIds, reversible: createdIds.length > 0 && appliedItemIds.every((id) => proposal.items.find((entry) => entry.id === id)?.reversible !== false), progressionDelta: 0 };
}

export function undoAppliedProposal(receipt: CopilotApplyReceipt, services: CopilotApplyServices) {
  if (!receipt.reversible || !services.undo) return false;
  return services.undo(receipt);
}

export const retainedConversation = <T>(preferences: CopilotPreferences, messages: T[]) => preferences.retention ? messages : [];
