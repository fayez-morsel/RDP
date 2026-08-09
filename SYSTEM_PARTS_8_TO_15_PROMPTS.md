# SYSTEM — Implementation Prompts for Parts 8–15

Use these prompts in order. Give Codex only one part at a time, allow it to implement and verify that part, then continue to the next part.

Do not ask one coding turn to implement all eight parts simultaneously. These systems depend on each other, and each part includes its own database, security, UI, and test requirements.

## Permanent product rules for every part

- SYSTEM is a serious real-life RPG and personal-growth operating system.
- Progress inside SYSTEM must come from meaningful behavior outside the app. Opening the app, planning, rearranging tasks, chatting with AI, reacting socially, or watching animations awards no XP or currency.
- Preserve the premium futuristic HUD: dark navy surfaces, cyan-blue glow, thin borders, restrained gold highlights, clear typography, and calm cinematic motion.
- Do not imitate copyrighted characters, interfaces, or artwork from existing games or anime.
- Preserve the completed routes and systems: Dashboard, Quests, Habits, Skills, Achievements, Inventory, Leaderboard, Analytics, Settings, Profile, shared navigation, shared player state, progression engine, global notifications, Supabase authentication/database, responsive behavior, accessibility, and automated tests.
- Keep the canonical attributes consistent: Strength, Intelligence, Discipline, Vitality, Wealth, and Charisma.
- XP, levels, ranks, coins, achievements, boss rewards, inventory grants, and leaderboard-impacting events remain server-authoritative, idempotent, and auditable.
- Never implement destructive streak resets, aggressive punishment, party damage for missed work, shame messages, loot boxes, pay-to-win advantages, or invasive verification.
- AI is optional and advisory. It cannot directly award progression or silently modify user data.
- Every persisted table must use proper constraints, indexes, ownership checks, and Supabase Row Level Security.
- Do not use localStorage as the source of truth for authenticated data.
- Every feature needs loading, empty, success, offline/retry, and recoverable-error states where applicable.
- Meet keyboard, screen-reader, contrast, reduced-motion, responsive-layout, and 44×44px touch-target requirements.
- Inspect the repository before editing. Reuse existing components, tokens, services, types, and patterns instead of creating duplicate systems.
- Run the repository's existing lint, type-check, unit/integration tests, end-to-end tests relevant to the change, and production build.
- Do not deploy. Do not change hosting, production domains, or production environment variables.
- Finish each part with a concise implementation report: features completed, migrations, files changed, commands/tests run and results, plus any exact blocker. Never respond only with a generic time-limit or response-window message.

---

## Part 8 — Adaptive Command Center

```text
You are working in the existing SYSTEM real-life RPG application.

Implement Part 8: Adaptive Command Center.

Read and obey the project's existing instructions and architecture. Inspect the current Dashboard, quest model, habit variants, authenticated data layer, progression service, notification system, and tests before editing. Preserve every completed route and shared component. Do not deploy and do not begin Part 9.

OBJECTIVE

Transform the Dashboard into a calm daily execution cockpit that answers:

1. What capacity does the player realistically have today?
2. Which real-world quests matter most?
3. What should the player do now, next, and later?
4. How can the plan adapt without guilt when circumstances change?

REQUIRED FEATURES

1. Daily System Check-In

Create a compact daily calibration flow that appears once per local day unless completed or intentionally skipped.

Collect:
- Available time in minutes
- Energy from 1–5
- Focus from 1–5
- Preferred intensity: Recovery, Balanced, or Push
- Optional private note

The player can skip it, use sensible defaults, or edit it later. Mood and health information must remain optional. Do not make medical claims.

2. Capacity-Aware Daily Plan

Show available, planned, remaining, and exceeded minutes. Display a calm over-capacity warning with actions to reduce scope, split, reschedule, or remove work. Never silently change quests.

3. Prime Quests

Recommend no more than three Prime Quests from existing eligible quests. Build a deterministic, independently testable ranking service. Consider:

- Deadline and urgency
- User-selected importance
- Active goal, campaign, skill, and attribute alignment when available
- Unmet prerequisites
- Estimated duration versus remaining capacity
- Required energy versus today's energy
- Existing scheduled/in-progress status
- Recently dismissed recommendations

Show a short explanation, for example: “Due tomorrow · advances Discipline · fits your 25-minute window.” Add a “Why this plan?” view exposing the factors without pretending the score is objective truth.

Users can accept, replace, pin, dismiss, and reorder recommendations. Record overrides for later preference learning, but do not add machine learning or LLM ranking in this part.

4. Now / Next / Later Board

Organize accepted items into:
- Now: one active quest
- Next: up to two queued quests
- Later: the remaining plan

Support accessible pointer, touch, and keyboard reordering. Planning and reordering grant no progression.

5. Recovery Mode

When Recovery mode is selected, capacity is low, or the player manually enables it, offer minimum viable versions of quests when those variants already exist. Use supportive actions:

- Complete minimum version
- Reduce scope
- Move to another day
- Pause without penalty

Do not erase momentum, XP, mastery, or streak history.

6. Quick Capture Inbox

Add a lightweight global Quick Capture action from the Dashboard header and keyboard shortcut. Capture a title plus optional note in seconds. New captures enter an Inbox and grant no XP.

Allow the player to convert an inbox item into an existing quest type after supplying required fields. Conversion must preserve the original capture timestamp and prevent duplicate quest creation.

DATA MODEL

Add or adapt server-backed structures for:
- daily_checkins
- daily_plans
- daily_plan_items
- recommendation_overrides
- inbox_items

Use authenticated user ownership, local date, timestamps, status constraints, useful indexes, and RLS. Enforce one active check-in and plan per user per local date. Ensure create/update operations are idempotent where retries can occur.

PROGRESSION SAFETY

Creating, checking in, capturing, accepting, moving, splitting, pinning, or rescheduling awards zero XP, coins, rank progress, achievement progress, or leaderboard score. Only genuine completion can call the existing authoritative progression transaction, exactly once.

UI

Create or refine reusable components such as DailyCheckIn, CapacityMeter, PrimeQuestCard, DailyPlanBoard, RecommendationReason, RecoveryModePanel, and QuickCapture.

Keep the Dashboard focused. Use progressive disclosure rather than placing every control on screen. Maintain the existing holographic design without excessive glow or decorative animation.

ACCEPTANCE TESTS

Verify:
- Check-in persists and reloads for the correct local day.
- Only one current daily plan exists per user/day.
- At most three Prime Quests are selected.
- Ineligible and prerequisite-blocked quests are excluded.
- Recommendations adapt to time and energy.
- Recovery Mode prefers minimum variants when available.
- Over-capacity plans expose corrective actions.
- Quick Capture converts once without duplicate quests.
- Planning actions grant no progression.
- Completion still grants progression once through the existing server-authoritative path.
- Cross-user access is denied.
- Mobile, tablet, desktop, keyboard, screen reader, and reduced-motion behavior work.
- Existing routes and tests remain functional.

Run lint, type-check, targeted tests, relevant end-to-end tests, and production build. Report the exact results. Do not deploy.
```

---

## Part 9 — Campaigns, Quest Chains, and Boss Encounters

```text
You are continuing the existing SYSTEM application after Part 8 has passed its tests.

Implement Part 9: Campaigns, Quest Chains, and Boss Encounters.

Inspect and reuse the current Quests route, quest types, skill/attribute links, Daily Command Center, progression transaction, notifications, and Supabase policies. Do not deploy and do not begin Part 10.

OBJECTIVE

Allow a player to turn a meaningful real-world outcome into a structured campaign of milestones, dependent quest chains, and positive boss encounters. Campaigns should connect long-term goals to today's Prime Quests without turning missed work into punishment.

NAVIGATION

Do not add another sidebar item. Extend the Quests route with clear tabs or subviews:
- Quest Board
- Campaigns
- Archive

Deep links, browser back behavior, mobile navigation, and preserved filters must work.

CAMPAIGN MODEL

Each campaign includes:
- Title and concise desired outcome
- Personal reason or “why”
- Life area
- Linked attributes and skills
- Start date and optional target date
- Priority and status
- Explicit success criteria
- Estimated weekly capacity
- Milestones
- Risks/obstacles and planned responses
- Privacy level for later social features

Support draft, active, paused, completed, abandoned, and archived states. Pausing or abandoning a campaign never removes earned progression.

MILESTONES AND QUEST CHAINS

Allow campaigns to contain ordered milestones and quests. Support prerequisite links as a directed acyclic graph.

Requirements:
- Prevent circular dependencies on both client and server.
- Locked quests clearly explain what prerequisite remains.
- Unlocking occurs automatically after authoritative prerequisite completion.
- A quest may advance a campaign, skill, and attribute without duplicating XP.
- Reordering presentation must not silently rewrite dependency rules.
- Preserve completed history when a campaign is edited.

IMPLEMENTATION INTENTIONS

For important quests, let users create optional if–then plans:
“If [situation/obstacle] happens, then I will [specific response].”

Include time/context cues, anticipated obstacles, and small “power-up” responses such as preparing equipment, asking an ally, or using a five-minute starter step. These actions organize behavior but award no progression by themselves.

FORECASTING AND RESCOPING

Create a deterministic forecast using remaining estimated minutes, dependencies, target date, and the player's declared weekly capacity. Label forecasts as estimates.

When a campaign is at risk, provide actions:
- Extend target date
- Reduce scope
- Split a milestone
- Change weekly capacity
- Pause the campaign

Never label the player a failure or auto-change the campaign.

BOSS ENCOUNTERS

Create optional campaign bosses representing a major milestone or obstacle.

Boss health represents verified real-world effort or completed linked quest value. Bosses can have phases, visible mechanics, and one-time rewards. Missing a day never damages the player, removes earned contribution, or harms future allies.

Boss reward settlement must be server-authoritative, transaction-safe, idempotent, capped against farming, and integrated with the existing notification/celebration system.

DATA MODEL

Add or adapt:
- campaigns
- campaign_milestones
- campaign_quests or campaign links
- quest_dependencies
- implementation_intentions
- campaign_obstacles
- boss_encounters
- boss_phases
- boss_contributions

Use foreign keys, ordering constraints, cycle prevention, ownership checks, indexes, RLS, and safe deletion/archive behavior. Prefer soft archive for entities referenced by progression history.

UI

Build:
- Campaign list with progress, forecast, and status
- Campaign creation/edit wizard with skip/back support
- Campaign detail timeline or map
- Milestone and dependency visualization with a usable list fallback
- Boss encounter panel
- Forecast and rescope panel

Keep graph views usable on mobile and accessible without drag-only interaction.

ACCEPTANCE TESTS

Verify:
- Campaign create/edit/pause/archive flows persist.
- Dependency cycles are rejected server-side.
- Locked quests cannot be completed early.
- Completing prerequisites unlocks dependents.
- Campaign advancement does not duplicate XP.
- Forecasts update when capacity, estimates, dates, or completion changes.
- Rescoping preserves completed history.
- Boss contribution and reward settlement occur exactly once.
- A missed day causes no destructive penalty.
- Cross-user campaign access is denied.
- Part 8 recommendations can prioritize eligible campaign quests.
- Existing standalone quests remain fully supported.

Run lint, type-check, unit/integration tests, end-to-end campaign flows, and production build. Report results. Do not deploy.
```

---

## Part 10 — Review Lab and Personal Experiments

```text
You are continuing the existing SYSTEM application after Parts 8 and 9 have passed verification.

Implement Part 10: Review Lab and Personal Experiments.

Inspect the Analytics route, daily plans, quests, habits, focus/time data, campaigns, progression events, chart library, and notification system. Reuse existing analytics data instead of creating competing metrics. Do not deploy and do not begin Part 11.

OBJECTIVE

Turn Analytics into a reflection and decision system—not a vanity-statistics page. Help the player understand what happened, adjust plans, and improve future estimates without claiming that correlations prove causation.

NAVIGATION

Keep this inside Analytics using subviews such as:
- Overview
- Daily Review
- Weekly Review
- Experiments
- History

DAILY SHUTDOWN

Create an optional end-of-day flow that shows the day's plan and allows the player to:
- Confirm completed items already recorded by the authoritative system
- Carry forward, rescope, schedule, pause, or archive unfinished items
- Record a short win
- Record an obstacle or lesson
- Compare planned and actual time when available
- Preview tomorrow without automatically changing it

Completing a review awards no XP or coins. The value is the improved plan, not app engagement.

WEEKLY REVIEW

Generate a server-backed weekly snapshot containing:
- Meaningful quests and milestones completed
- Time planned versus recorded
- Estimated versus actual duration
- Campaign movement
- Habit consistency and recovery—not only longest streak
- Practice XP versus verified mastery progress
- Attribute and life-area distribution
- Recovery/over-capacity days
- User-written wins, obstacles, and lessons

Allow the player to choose next week's top outcomes and capacity. Suggestions require confirmation before modifying plans.

INSIGHT ENGINE

Build transparent deterministic insights from the user's own data, for example:
- “Your 25-minute quests were completed more often than your 90-minute quests during the last four weeks.”
- “You planned 410 minutes beyond your declared capacity this week.”
- “Morning focus sessions were associated with higher completion in this sample.”

Every insight must show:
- Date range
- Sample size
- Inputs used
- Plain-language calculation
- A caution when the sample is small or the result is correlational

Do not diagnose medical conditions or use manipulative language.

PERSONAL EXPERIMENTS

Allow the player to run a simple, voluntary experiment:
- Name and hypothesis
- One behavior change
- Primary metric
- Baseline period
- Experiment period
- Optional context tags
- Result and reflection

Examples include “Start deep work before noon” or “Use the minimum habit version on low-energy days.”

Show descriptive comparison only. Do not claim scientific proof. The player can stop an experiment at any time without penalty.

VISUALIZATION

Use accessible visualizations:
- Line charts for trends over time
- Compact bullet charts for performance versus a declared target
- Calendar/heatmap only when each cell has accessible text
- Visible values and downloadable/table alternatives

Do not rely only on color. Avoid decorative charts that do not support a decision. Limit the number of simultaneous series.

DATA MODEL

Add or adapt:
- daily_reviews
- weekly_reviews
- review_responses
- weekly_snapshots
- personal_experiments
- experiment_observations
- generated_insights

Snapshots must be reproducible, tied to a timezone/date range, and safe from cross-user access. Derived analytics must not mutate progression history.

ACCEPTANCE TESTS

Verify:
- Daily shutdown actions correctly carry, rescope, schedule, pause, or archive items.
- Review actions grant no progression.
- Weekly boundaries work across timezone and daylight-saving cases.
- Planned-versus-actual calculations are correct.
- Habit recovery is represented without destructive resets.
- Insights expose calculation, range, and sample size.
- Small samples display caution.
- Experiments can start, stop, complete, and compare periods.
- Charts have accessible labels and data-table fallbacks.
- Cross-user review/experiment access is denied.
- Existing Analytics and progression data remain correct.

Run lint, type-check, analytics calculation tests, accessibility tests, relevant end-to-end flows, and production build. Report results. Do not deploy.
```

---

## Part 11 — Evidence-Based Skills and Mastery

```text
You are continuing the existing SYSTEM application after Parts 8–10 have passed verification.

Implement Part 11: Evidence-Based Skills and Mastery.

Inspect the Skills page, skill tree, profile, attributes, quest-skill links, progression ledger, storage configuration, authentication, and RLS. Preserve all existing earned XP. Do not deploy and do not begin Part 12.

OBJECTIVE

Make skills represent real development rather than only accumulated points. Separate practice, current readiness, and verified mastery while keeping the system understandable.

MASTERY MODEL

Represent three distinct concepts:

1. Practice XP: earned through validated real-world practice quests.
2. Readiness: a temporary self-reported or recent-activity indicator that may rise or fall without changing mastery.
3. Mastery: demonstrated by explicit criteria and evidence. It cannot be purchased, granted by AI, or lost because of a missed day.

Preserve existing skill levels by migrating or mapping them safely. Do not silently reduce users' earned progress.

SKILL PROFILES

Each skill can include:
- Description and personal reason
- Linked attributes
- Prerequisite skills
- Practice history
- Mastery criteria
- Current mastery tier
- Current readiness
- Evidence items
- Mastery trials
- Optional public/private portfolio visibility

Use clear tier names consistent with the existing design. Do not create a second conflicting rank system if one already exists.

EVIDENCE VAULT

Allow users to attach evidence to a skill or criterion:
- Text reflection
- URL
- File/image/document using the existing object-storage approach
- Measurable result
- Before/after record
- Existing quest, campaign milestone, achievement, or certificate reference

Evidence is private by default. Use signed URLs, file type/size validation, sanitized metadata, secure storage paths, ownership checks, and deletion rules. Never expose private object URLs publicly.

MASTERY CRITERIA AND TRIALS

Users can define or select criteria such as:
- Complete a practical project
- Demonstrate a measurable standard
- Sustain practice across a period
- Pass a self-created mastery trial
- Receive optional mentor confirmation

Mastery trials have an explicit objective, success criteria, allowed evidence, attempt history, and result. Completing a trial can update mastery only through a server-authoritative, idempotent transaction after the required evidence/criteria checks.

Optional mentor confirmation must use a restricted invitation flow. A mentor can review only the evidence specifically shared with them and cannot access the player's unrelated account data, XP ledger, private journal, or other skills.

SKILL GRAPH AND PORTFOLIO

Enhance the skill tree to show prerequisites, practice progress, mastery status, and locked explanations. Provide a fully accessible list/tree fallback.

Add a private portfolio view under Skills/Profile. Users choose which evidence and mastery achievements are shareable. Public sharing must use revocable tokens or an explicit published profile—not predictable IDs.

DATA MODEL

Add or adapt:
- skill_mastery_profiles
- mastery_criteria
- skill_evidence
- evidence_attachments
- mastery_trials
- mastery_attempts
- mentor_invitations
- mentor_reviews
- portfolio_entries

Use constraints, indexes, RLS, signed access, revocation, and immutable references to authoritative progression events where needed.

PROGRESSION RULES

- Practice quests may grant practice XP once through the existing progression engine.
- Uploading evidence, writing reflections, requesting review, or publishing a portfolio grants no XP.
- Mastery unlocks only when configured criteria are satisfied.
- AI cannot approve mastery.
- Inventory purchases and currency cannot increase mastery.
- Readiness changes never erase practice or mastery.

ACCEPTANCE TESTS

Verify:
- Existing skill progress migrates without loss.
- Practice XP, readiness, and mastery remain separate.
- Evidence ownership and private-by-default behavior are enforced.
- Signed file access expires and unauthorized users are denied.
- Mastery criteria and trials settle once.
- AI/user-interface calls cannot bypass mastery validation.
- Mentor links reveal only explicitly shared evidence and can be revoked.
- Portfolio sharing is opt-in and revocable.
- Skill prerequisites and accessible fallbacks work.
- Quest completion does not duplicate practice XP.

Run lint, type-check, storage/security tests, mastery transaction tests, end-to-end skill/evidence flows, and production build. Report results. Do not deploy.
```

---

## Part 12 — SYSTEM Copilot

```text
You are continuing the existing SYSTEM application after Parts 8–11 have passed verification.

Implement Part 12: SYSTEM Copilot.

Inspect the existing AI code, if any, plus Daily Command Center, Campaigns, Review Lab, Skills, server actions/API routes, authentication, audit logging, notification system, and environment-variable patterns. Use the provider abstraction already present; if none exists, introduce a small provider-neutral interface. Do not expose secrets, deploy, or begin Part 13.

OBJECTIVE

Create an optional, transparent AI copilot that reduces planning friction while leaving the player in control. The deterministic progression engine remains the authority.

COPILOT MODES

Implement focused entry points rather than an unstructured chatbot:

- Plan: turn a user goal into a draft campaign, milestones, and quest suggestions.
- Brief: summarize today's confirmed capacity, Prime Quests, deadlines, and risks.
- Rescue: help when a day or campaign is over capacity by proposing smaller, deferred, or split actions.
- Review: summarize patterns already calculated by Review Lab and draft reflection questions.
- Ask SYSTEM: answer questions about the user's own plans and explain app mechanics.

All modes must function as proposals. The player can edit, selectively accept, reject, regenerate, or close them.

PROPOSAL WORKFLOW

Every data-changing AI response must use validated structured output and follow:

1. Generate proposal.
2. Show preview/diff against current data.
3. Explain why each change is suggested.
4. Let the player edit/select changes.
5. Require explicit confirmation.
6. Apply through existing validated server services.
7. Record an audit entry.
8. Offer undo when the underlying operation is safely reversible.

The model must never write directly to database tables or progression ledgers.

AI SAFETY AND PRIVACY

- API keys remain server-only.
- Validate all model output against strict schemas.
- Treat user notes, imported text, URLs, and evidence as untrusted data—not instructions.
- Limit the data sent to the minimum needed for the selected mode.
- Show which data categories will be used before first use.
- Add user controls for conversation retention, AI memory, analytics sharing, and deletion.
- Do not send private evidence files, health-related notes, social messages, or journal content unless the user explicitly selects them.
- Add rate limits, timeouts, cancellation, retry, cost/token guardrails, and safe error states.
- Provide a deterministic/manual fallback when AI is disabled, unavailable, or over limit.
- Never make medical, legal, or financial decisions for the player.

NO AI AUTHORITY OVER PROGRESSION

AI cannot:
- Complete quests or habits
- Award XP, coins, ranks, achievements, mastery, items, or boss damage
- Verify evidence
- Change leaderboard scores
- Silently schedule, delete, share, or publish data

It can only propose calls to existing user-confirmed services.

INTERFACE

Add a global Copilot launcher that does not obscure navigation. It should open a responsive panel or dedicated overlay with:
- Mode selector
- Context summary
- Conversation/proposal area
- Visible processing/cancel state
- Preview/diff
- Accept selected, edit, reject, regenerate, explain, and feedback controls

Keep normal app functionality usable without AI. Respect reduced motion and keyboard/focus management.

DATA MODEL

Add or adapt:
- ai_preferences
- ai_threads
- ai_messages, if retention is enabled
- ai_proposals
- ai_proposal_items
- ai_audit_events
- ai_feedback

Retention must follow user settings. Store provider/model metadata and status without logging secrets or unnecessary private prompts.

TESTING

Use a mocked provider for automated tests. Verify:
- Structured output validation rejects malformed or unsafe responses.
- No proposal applies before explicit confirmation.
- Partial acceptance applies only selected changes.
- Undo works for supported operations.
- AI cannot invoke progression settlement.
- Prompt-injection text inside user content is treated as data.
- Authorization and RLS prevent cross-user context access.
- Retention-off mode does not persist conversation content beyond operational needs.
- Rate limits, timeout, cancellation, and provider failure have recoverable UI.
- Manual/deterministic workflows remain functional with AI disabled.

Run lint, type-check, mocked AI tests, security tests, relevant end-to-end flows, and production build. Report results and any provider configuration still required. Do not deploy.
```

---

## Part 13 — Alliances, Guilds, and Positive Social Accountability

```text
You are continuing the existing SYSTEM application after Parts 8–12 have passed verification.

Implement Part 13: Alliances, Guilds, and Positive Social Accountability.

Inspect Profile, Leaderboard, notifications, campaigns, focus/timer features, progression ledger, privacy settings, authentication, and RLS. Social data must be private by default. Do not deploy and do not begin Part 14.

OBJECTIVE

Add supportive accountability without toxic competition. Players should be able to work alongside trusted people, celebrate progress, and defeat cooperative bosses. Missing a task must never punish another person.

NAVIGATION

Do not add a new sidebar route. Extend Leaderboard into scoped subviews:
- Progress
- Allies
- Guilds
- Cooperative Bosses

Keep the existing leaderboard available, but make social participation opt-in.

ALLY CONNECTIONS

Allow invite-based connections with pending, accepted, declined, blocked, and removed states.

Privacy requirements:
- Profiles and goals are private by default.
- For each ally, the player controls which habits, campaigns, milestones, focus sessions, achievements, or summary metrics are visible.
- Never expose private notes, journal entries, evidence files, exact calendar events, energy check-ins, or AI conversations.
- Blocking immediately removes mutual visibility and future notifications.

ACCOUNTABILITY PACTS

Allow two or more trusted allies to create an optional pact containing:
- Shared purpose
- Date range
- Individual commitments
- Check-in cadence
- Visibility settings
- Encouragement preferences

Each participant remains responsible for only their own actions. A missed commitment may trigger a private recovery prompt for that player, but it cannot reduce anyone's XP, health, rank, rewards, or boss contribution.

PRIVATE GUILDS

Create invitation-only guilds with owner/admin/member roles, member limits, description, shared rules, and privacy settings.

Start with trusted private groups. Do not implement public stranger discovery or unrestricted direct messages in this part.

POSITIVE COOPERATIVE BOSSES

Guilds or pacts can activate a cooperative boss linked to a shared real-world objective. Members contribute through eligible verified quest completions.

Rules:
- Contribution is additive and permanent for the encounter.
- Missing work causes no damage or loss.
- Rewards settle once and may depend on individual contribution thresholds without humiliating lower contributors.
- Contribution caps prevent farming.
- A member leaving preserves accurate historical attribution but removes future access.
- Server-authoritative settlement and audit events are mandatory.

SHARED FOCUS SESSIONS

Allow allies to schedule 25-, 50-, or 75-minute focus sessions. Participants state an intention at the start and optionally share a result at the end.

Do not build stranger video matching. Implement scheduling, attendance, a quiet session state/timer, and text-based start/end check-ins using existing focus components. Joining or attending grants no XP; only independently completed eligible work can grant progression.

ENCOURAGEMENT

Add a small set of positive reactions/messages such as cheer, respect, and well done. Apply notification controls, rate limits, blocking, and report tools. Avoid public negative reactions, downvotes, or spammy engagement loops.

LEADERBOARDS

Provide opt-in scopes:
- Personal best
- Allies
- Guild
- Season

Default to personal progress. Explain scoring. Prefer constructive comparison such as consistency, contribution, or improvement rather than only lifetime XP. Provide a hide-rank option. Never rank private health, mood, or journal data.

DATA MODEL

Add or adapt:
- ally_connections
- social_visibility_rules
- accountability_pacts
- pact_members
- pact_commitments
- guilds
- guild_members
- cooperative_bosses
- cooperative_contributions
- focus_sessions
- focus_participants
- encouragement_events
- blocks
- reports

Use strict ownership/membership policies, RLS, rate limits, role validation, and immutable contribution references.

ACCEPTANCE TESTS

Verify:
- Private-by-default behavior for every social entity.
- Per-ally visibility rules are enforced server-side.
- Invite, accept, decline, remove, leave, and block flows work.
- Blocked users cannot view or contact each other.
- Missing commitments never harm another player.
- Cooperative contributions and rewards settle exactly once.
- Focus sessions work across timezones and grant no attendance XP.
- Notifications honor user preferences and rate limits.
- Leaderboard opt-in/hide controls work.
- Cross-guild and cross-user data leakage is denied.

Run lint, type-check, RLS/authorization tests, social interaction tests, end-to-end ally/guild/boss flows, and production build. Report results. Do not deploy.
```

---

## Part 14 — Integration Hub, Portability, and Offline Reliability

```text
You are continuing the existing SYSTEM application after Parts 8–13 have passed verification.

Implement Part 14: Integration Hub, Portability, and Offline Reliability.

Inspect the Settings route, PWA/service-worker setup, data layer, sync strategy, authentication, background jobs, existing integrations, and environment-variable conventions. Never fabricate a successful provider connection when credentials are unavailable. Do not deploy and do not begin Part 15.

OBJECTIVE

Make SYSTEM useful throughout the day without trapping user data. Add a secure Integration Hub, calendar interoperability, import/export, backup/restore, offline-safe actions, and quick access.

INTEGRATION HUB

Add a Settings subview showing every connector with:
- Connection state
- Requested permissions/scopes
- Last successful sync
- Last error and recovery action
- Import/export direction
- Sync frequency
- Disconnect and delete-connection-data actions

Use a provider-adapter interface so integrations share consistent authorization, mapping, sync, logging, retry, and disconnect behavior.

CALENDAR INTEROPERABILITY

Implement a safe foundation for Google Calendar and Microsoft Outlook Calendar plus standards-based ICS import/export.

Separate permissions:
- Read/import events
- Create SYSTEM time blocks in a selected calendar
- Update/delete only events created by SYSTEM

Requirements:
- Least-privilege OAuth scopes
- Server-side encrypted token storage
- Refresh/revocation handling
- Explicit calendar selection
- Clear field mapping
- Timezone and all-day event support
- Stable external IDs
- Idempotent sync
- Conflict policy and sync log
- Never delete or rewrite non-SYSTEM events

If OAuth credentials are not configured, fully implement and test the adapter contract, ICS import/export, setup instructions, and honest disabled state. Do not place fake connected data in production UI.

Calendar import creates planning references/time constraints, not automatically completed quests. Calendar events grant no progression.

IMPORT, EXPORT, AND BACKUP

Support:
- Full account export in a documented versioned JSON format
- Useful CSV exports for quests, habits, skills, and progression history
- ICS export for scheduled plans/focus sessions
- Import preview with validation, duplicate detection, mapping, and selective confirmation
- Backup restore as a dry-run preview followed by explicit confirmation
- Clear error reports identifying rejected records

Never overwrite current data blindly. Preserve authoritative progression history and reject attempts to import fabricated XP, coins, mastery, achievements, or boss rewards. Imported planning data must earn progression only through future legitimate completion.

OFFLINE RELIABILITY

Improve the PWA so users can safely:
- Open recently used pages
- View cached current-day plan
- Quick-capture inbox items
- Mark eligible actions for later synchronization

Use an explicit offline mutation queue with stable client request IDs, retry/backoff, status visibility, conflict handling, and deduplication. On reconnection, the server-authoritative progression transaction must ensure queued completion settles at most once.

Do not cache private data in a way that leaks between accounts on shared devices. Clear user-specific caches on sign-out.

QUICK ACCESS

Add:
- Installable PWA metadata and icons if missing
- App shortcuts for Quick Capture, Today, and Focus
- Keyboard shortcut reference
- Share-target/URL-based capture only when supported safely

Do not pretend that native iOS/Android widgets, Apple Health, or Health Connect are available from a web-only PWA. Create documented adapter boundaries for a later native app, but collect no sensitive health data in this part.

DATA MODEL

Add or adapt:
- integration_connections
- encrypted_provider_credentials or secure provider token references
- integration_sync_cursors
- integration_sync_events
- external_entity_mappings
- import_jobs
- export_jobs
- offline_mutation_receipts

Never expose provider secrets or refresh tokens to the browser or logs.

ACCEPTANCE TESTS

Verify:
- ICS import/export handles timezone, all-day, duplicate, and malformed records.
- Import preview changes nothing before confirmation.
- Imported data cannot inject progression.
- Adapter sync is idempotent.
- SYSTEM modifies only its own external events.
- Disconnect revokes/cleans tokens according to policy.
- Offline Quick Capture syncs once.
- Replayed completion requests award progression once.
- Conflicts have a visible recovery path.
- Account switching/sign-out clears private caches.
- Export is complete, versioned, and restorable through preview.
- No secret appears in client bundles or logs.

Run lint, type-check, adapter/import/export tests, offline/replay tests, security checks, relevant end-to-end flows, and production build. Report exact configured and unconfigured integrations. Do not deploy.
```

---

## Part 15 — Personalization, Accessibility, Privacy, and Trust

```text
You are continuing the existing SYSTEM application after Parts 8–14 have passed verification.

Implement Part 15: Personalization, Accessibility, Privacy, and Trust.

This is the final product-expansion and hardening phase before any future deployment phase. Inspect the complete application, design tokens, Settings, onboarding, notifications, progression ledger, AI preferences, social visibility, integrations, internationalization, accessibility tests, and performance tooling. Do not deploy.

OBJECTIVE

Let players shape SYSTEM around their needs while making every important automated, social, AI, and progression decision understandable and controllable.

PROGRESSIVE FEATURE MODES

Add user-selectable interface modes:
- Minimal: Today, Quests, Focus, and essential progress with reduced visual density
- Standard: the balanced default experience
- Immersive: full HUD presentation, richer non-blocking animations, and advanced panels

Feature modes change presentation, not progression rules. A user can switch at any time without losing data.

Add optional controls for:
- Density
- Reduced motion
- Animation intensity
- Sound and celebration volume
- High contrast
- Color-vision-safe chart patterns
- Larger text support
- 12/24-hour time
- First day of week
- Default day mode

Do not remove focus outlines or browser zoom.

ONBOARDING AND DISCLOSURE

Create a skippable onboarding/calibration flow for new users:
- Choose one meaningful starting goal
- Choose initial attributes/skills without locking permanent identity
- Set realistic weekly capacity
- Choose reward preferences
- Choose notification comfort
- Select Minimal, Standard, or Immersive mode
- Explain that real-world completion—not app usage—creates progress

Do not overwhelm new users with every module. Use progressive disclosure and allow advanced systems to be enabled later from Settings.

ENGLISH, ARABIC, AND RTL

Introduce or complete an internationalization architecture with English and Arabic as the first supported locales.

Requirements:
- Translate navigation, shared actions, validation, empty/error states, notifications, dates, and progression explanations
- Use locale-aware dates, numbers, pluralization, and week settings
- Support full RTL mirroring for Arabic while keeping charts, numeric data, and icons semantically correct
- Avoid concatenated strings that cannot translate correctly
- Ensure layouts survive longer translations and mixed Arabic/English content
- Provide a visible language switcher and persist the preference server-side for authenticated users

Use professional connected Arabic typography and test clipping, line height, and icon direction.

NOTIFICATION BUDGET

Create a unified notification preference center covering:
- Quest/habit reminders
- Daily planning and shutdown
- Campaign risk
- Achievements and rewards
- AI proposals
- Allies/guilds/focus sessions
- Integration errors

Allow per-category in-app/push/email choices when supported, quiet hours, timezone, maximum non-critical notifications per day, bundled summaries, and temporary pause.

Critical security/account messages must remain distinct from motivational notifications. Never use guilt, fake urgency, or repeated nagging.

PRIVACY CENTER

Add one clear place where users can inspect and control:
- Profile visibility
- Per-ally sharing
- Guild visibility
- Evidence/portfolio publishing
- AI data access, memory, and retention
- Connected integrations and scopes
- Notification channels
- Active sessions/devices if supported
- Data export
- Account-deletion request

Default sensitive data to private. Use explicit confirmation for publishing, connector permissions, and deletion. Account deletion should use the project's safe confirmation/re-authentication process and provide a recoverable grace period if architecture supports it.

PROGRESSION AUDIT LEDGER

Add a player-facing audit view explaining every progression change:
- Event type and source
- Related quest/habit/campaign/boss/achievement
- XP, attribute XP, skill XP, coins, items, rank or mastery change
- Timestamp
- Applied cap or anti-farming rule
- Idempotency/reference ID in a user-friendly expandable detail

Do not allow direct editing of ledger rows. Corrections use linked reversal/adjustment events with authorization and reason, preserving history.

Explain anti-farming caps clearly. Do not accuse players of cheating based only on unusual behavior.

ACCESSIBILITY HARDENING

Audit every route and shared component for:
- Logical heading structure
- Landmarks and skip links
- Keyboard navigation and focus order
- Modal focus trapping/restoration
- Accessible names and descriptions
- Form labels and inline errors
- Live-region restraint
- Contrast in every theme/state
- Touch targets
- Reduced motion
- Screen-reader alternatives for charts, skill graphs, campaign maps, drag/drop, and timers

Add automated accessibility checks plus a documented manual test matrix. Fix regressions found rather than only producing a report.

PERFORMANCE AND RELIABILITY

Establish and verify realistic budgets for:
- Initial route JavaScript
- Largest Contentful Paint
- Cumulative Layout Shift
- Interaction responsiveness
- Image/font loading
- Long list/chart rendering

Lazy-load non-critical immersive effects and advanced analytics. Reserve layout space, virtualize only when needed, avoid hydration mismatch, and keep Minimal mode especially lightweight.

FINAL PARTS 8–15 VERIFICATION

Run end-to-end journeys for:

1. New user onboarding to first real quest completion.
2. Daily check-in to Prime Quest to authoritative progression.
3. Campaign creation through dependency unlock and boss settlement.
4. Daily/weekly review and personal experiment.
5. Evidence upload through mastery trial and private portfolio.
6. AI proposal preview, selective acceptance, audit, and undo.
7. Ally invite, privacy rule, focus session, block, and co-op contribution.
8. Offline capture/completion replay and integration import/export.
9. English/Arabic and LTR/RTL navigation.
10. Privacy export, audit-ledger inspection, and safe deletion request.

Verify no flow grants duplicate or app-engagement-only progression.

DATA MODEL

Add or adapt only what is necessary, such as:
- user_experience_preferences
- user_locale_preferences
- notification_preferences
- notification_delivery_log
- privacy_consents
- data_deletion_requests
- progression_adjustment_events

Use RLS, explicit defaults, audit timestamps, and safe migrations for existing users.

COMPLETION REQUIREMENTS

Run lint, type-check, all unit/integration tests, accessibility checks, full relevant end-to-end suite, production build, bundle/performance analysis available in the project, and database/RLS tests.

Report:
- Features implemented
- Accessibility issues found and fixed
- English/Arabic/RTL coverage
- Privacy/security changes
- Performance results against budgets
- Full test/build results
- Any exact remaining blocker or credential-dependent item

Do not deploy or modify production infrastructure. Deployment remains a separate future part requested explicitly by the user.
```

---

## Recommended execution checkpoint after each part

Before sending the next prompt, require the coding agent to confirm:

1. The requested part is implemented rather than merely planned.
2. Migrations and RLS policies were applied or clearly prepared.
3. Tests, type-check, lint, and build passed—or exact failures are shown.
4. No existing route or progression behavior regressed.
5. No deployment occurred.

