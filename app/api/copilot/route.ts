import { getChatGPTUser } from "../../chatgpt-auth";
import { AiSdkCopilotProvider } from "../../copilot/ai-sdk-provider";
import { CopilotRateLimiter, requestCopilotProposal, type CopilotContext, type CopilotMode } from "../../copilot/copilot-engine";

const limiter = new CopilotRateLimiter(6, 60_000);
const modes = new Set<CopilotMode>(["plan", "brief", "rescue", "review", "ask"]);
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
const safeText = (value: unknown, max: number) => typeof value === "string" ? Array.from(value, (character) => { const code = character.charCodeAt(0); return code < 32 || code === 127 ? " " : character; }).join("").trim().slice(0, max) : "";

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return json({ error: "Authentication required." }, 401);
  if (!request.headers.get("content-type")?.includes("application/json")) return json({ error: "JSON required." }, 415);
  const raw = await request.text();
  if (raw.length > 12_000) return json({ error: "Request is too large." }, 413);
  let body: Record<string, unknown>;
  try { body = JSON.parse(raw) as Record<string, unknown>; } catch { return json({ error: "Invalid JSON." }, 400); }
  if (!modes.has(body.mode as CopilotMode)) return json({ error: "Invalid Copilot mode." }, 400);
  const source = body.context && typeof body.context === "object" ? body.context as Record<string, unknown> : {};
  const activeQuests = Array.isArray(source.activeQuests) ? source.activeQuests.slice(0, 8).map((quest) => { const value = quest && typeof quest === "object" ? quest as Record<string, unknown> : {}; return { id: safeText(value.id, 120), title: safeText(value.title, 160), deadline: safeText(value.deadline, 120), progress: Math.max(0, Math.min(100, Number(value.progress) || 0)) }; }).filter((quest) => quest.id && quest.title) : [];
  const context: CopilotContext = { date: safeText(source.date, 10), availableMinutes: Math.max(0, Math.min(960, Number(source.availableMinutes) || 0)), activeQuests, capacityRisk: safeText(source.capacityRisk, 200), reviewInsights: Array.isArray(source.reviewInsights) ? source.reviewInsights.slice(0, 3).map((insight) => safeText(insight, 500)).filter(Boolean) : [] };
  const input = safeText(body.input, 1_500);
  const model = process.env.AI_MODEL;
  if (!model) return json({ error: "No server-side AI model is configured.", recoverable: true }, 503);
  const result = await requestCopilotProposal(new AiSdkCopilotProvider(model, model), { mode: body.mode as CopilotMode, input, context }, { preferences: { enabled: true, consented: true, retention: false, memory: false, analyticsSharing: false }, limiter, actor: user.userId, signal: request.signal, timeoutMs: 12_000 });
  if (!result.ok) return json({ error: result.message, code: result.code, recoverable: true }, result.code === "rate-limit" ? 429 : 422);
  return json({ proposal: result.proposal, notice: result.notice });
}
