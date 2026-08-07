import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "SYSTEM — Character Creation", description: "Initialize your real-life RPG character." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
