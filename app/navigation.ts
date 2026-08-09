export const routes = { Dashboard:"/dashboard", Quests:"/quests", Habits:"/habits", Skills:"/skills", Achievements:"/achievements", Inventory:"/inventory", Leaderboard:"/leaderboard", Analytics:"/analytics", Settings:"/settings", Profile:"/profile" } as const;
export type AppRoute = keyof typeof routes;
export const navigate = (target: AppRoute) => { if (typeof window !== "undefined" && window.location.pathname !== routes[target]) window.location.assign(routes[target]); };
