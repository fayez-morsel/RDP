import test from "node:test";
import assert from "node:assert/strict";
import { rankPrimeQuests, capacitySummary } from "../app/daily-engine.ts";

const quests = [{id:"urgent",title:"Urgent",difficulty:"Easy",deadline:"Today",progress:20,status:"active",objectives:[{done:false}]},{id:"heavy",title:"Heavy",difficulty:"Legendary",deadline:"5 days",progress:0,status:"active",objectives:[{done:false}]},{id:"done",title:"Done",difficulty:"Easy",deadline:"Today",progress:100,status:"completed",objectives:[{done:true}]}];
test("daily engine returns at most three eligible quests and excludes completed quests",()=>{const ranked=rankPrimeQuests(quests,{minutes:45,energy:2,focus:3,mode:"Balanced"});assert.equal(ranked.length,1);assert.equal(ranked[0].quest.id,"urgent")});
test("capacity calculations do not award or mutate progression",()=>{assert.deepEqual(capacitySummary([{estimatedMinutes:20},{estimatedMinutes:35}],45),{planned:55,remaining:-10,exceeded:true})});
