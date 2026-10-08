import { Geist, Geist_Mono } from "next/font/google";

// Font definitions file: load each font once and share it between the root
// layout and global-error (which replaces the layout and must load its own fonts).
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const fontVariables = `${geistSans.variable} ${geistMono.variable}`;
