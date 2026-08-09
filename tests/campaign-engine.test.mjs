import test from "node:test";
import assert from "node:assert/strict";
import { hasDependencyCycle, forecastWeeks } from "../app/campaign-engine.ts";
test("campaign dependencies reject cycles",()=>{assert.equal(hasDependencyCycle([{questId:"b",prerequisiteQuestId:"a"},{questId:"a",prerequisiteQuestId:"b"}]),true)});
test("campaign forecast is an estimate and flags insufficient capacity",()=>{assert.deepEqual(forecastWeeks(300,100,2),{weeks:3,atRisk:true})});
