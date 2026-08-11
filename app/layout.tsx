import type { Metadata } from "next";
import { PlayerProvider } from "./player-store";
import { FeedbackSystem } from "./feedback-system";
import { SkipLink } from "./components/skip-link";
import { Copilot } from "./copilot/copilot";
import { PwaBootstrap } from "./pwa-bootstrap";
import "./globals.css";
import "./accessibility.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://system-character-creation.fayezmorsel6.chatgpt.site"),
  title: "SYSTEM — Character Creation",
  description: "Initialize your real-life RPG character.",
  openGraph: { title: "SYSTEM — Character Creation", description: "Initialize your real-life RPG character.", images: ["/og.png"] },
  twitter: { card: "summary_large_image", title: "SYSTEM — Character Creation", images: ["/og.png"] },
  icons: { icon: "/favicon.svg" },
  manifest: "/manifest.webmanifest",
  applicationName: "SYSTEM",
  appleWebApp: { capable: true, title: "SYSTEM", statusBarStyle: "black-translucent" },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body><SkipLink /><PlayerProvider>{children}<FeedbackSystem /><Copilot /><PwaBootstrap /></PlayerProvider></body></html>; }
