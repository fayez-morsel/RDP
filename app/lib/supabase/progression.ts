"use client";

import { createSupabaseBrowserClient } from "./browser";

const idempotencyKey = (operation: string) => `${operation}:${crypto.randomUUID()}`;
type RpcResult = { duplicate?: boolean } & Record<string, unknown>;

async function run<T extends RpcResult>(name: "complete_quest" | "complete_habit_occurrence" | "claim_achievement_reward" | "equip_owned_item" | "allocate_attribute_points", args: Record<string, string | number>) {
  const { data, error } = await createSupabaseBrowserClient().rpc(name, args as never);
  if (error) throw new Error(error.message);
  return data as T;
}

/** Commands intentionally send no XP, rank, currency, or player ID. PostgreSQL derives those values from owned records. */
export const authoritativeProgression = {
  completeQuest: (questId: string) => run("complete_quest", { p_quest_id: questId, p_idempotency_key: idempotencyKey("quest") }),
  completeHabit: (habitId: string, occurredOn: string) => run("complete_habit_occurrence", { p_habit_id: habitId, p_occurred_on: occurredOn, p_idempotency_key: idempotencyKey("habit") }),
  claimAchievementReward: (achievementId: string) => run("claim_achievement_reward", { p_achievement_id: achievementId, p_idempotency_key: idempotencyKey("achievement") }),
  equipOwnedItem: (playerItemId: string) => run("equip_owned_item", { p_player_item_id: playerItemId }),
  allocateAttributePoints: (attributeId: string, points: number) => run("allocate_attribute_points", { p_attribute_id: attributeId, p_points: points, p_idempotency_key: idempotencyKey("attribute") }),
};
