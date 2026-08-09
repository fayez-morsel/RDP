import { BookOpen, Brain, Code2, Dumbbell, Droplets, Moon, type LucideIcon } from "lucide-react";
export type HabitStatus = "Pending" | "In Progress" | "Completed" | "Skipped" | "Missed";
export type Habit = { id:number; name:string; goal:string; period:"Morning"|"Afternoon"|"Evening"|"Anytime"; attribute:string; difficulty:"Easy"|"Medium"|"Hard"; xp:number; streak:number; progress:number; status:HabitStatus; icon:LucideIcon; description:string };
export const starterHabits:Habit[]=[
 {id:1,name:"Morning Hydration",goal:"Drink 2 glasses of water",period:"Morning",attribute:"Vitality",difficulty:"Easy",xp:40,streak:12,progress:100,status:"Completed",icon:Droplets,description:"Start the day by restoring your energy reserves."},
 {id:2,name:"Focused Coding",goal:"Complete 60 minutes of coding",period:"Morning",attribute:"Intelligence",difficulty:"Hard",xp:200,streak:8,progress:50,status:"In Progress",icon:Code2,description:"Build real capability through uninterrupted technical practice."},
 {id:3,name:"Daily Movement",goal:"Exercise for 30 minutes",period:"Afternoon",attribute:"Strength",difficulty:"Medium",xp:150,streak:5,progress:100,status:"Completed",icon:Dumbbell,description:"Keep the physical system active and resilient."},
 {id:4,name:"Knowledge Acquisition",goal:"Read 15 pages",period:"Afternoon",attribute:"Intelligence",difficulty:"Medium",xp:100,streak:9,progress:100,status:"Completed",icon:BookOpen,description:"Turn consistent reading into lasting knowledge."},
 {id:5,name:"Deep Work Protocol",goal:"Complete one 45-minute distraction-free session",period:"Evening",attribute:"Focus",difficulty:"Hard",xp:180,streak:6,progress:35,status:"In Progress",icon:Brain,description:"Defend a focused block for meaningful work."},
 {id:6,name:"Sleep Recovery",goal:"Sleep for at least 7 hours",period:"Anytime",attribute:"Vitality",difficulty:"Medium",xp:120,streak:11,progress:0,status:"Pending",icon:Moon,description:"Close the day with a complete recovery protocol."}
];
