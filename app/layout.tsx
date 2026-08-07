import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://system-character-creation.fayezmorsel6.chatgpt.site"),
  title: "SYSTEM — Character Creation",
  description: "Initialize your real-life RPG character.",
  openGraph: { title: "SYSTEM — Character Creation", description: "Initialize your real-life RPG character.", images: ["/og.png"] },
  twitter: { card: "summary_large_image", title: "SYSTEM — Character Creation", images: ["/og.png"] },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
