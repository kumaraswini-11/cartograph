import type { Metadata } from "next";

import { fontVariables } from "./fonts";

import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Cartograph", template: "%s · Cartograph" },
  description:
    "Turn any GitHub repo into an interactive dependency map: trace imports, calculate blast radius, and explain modules from real parsed code.",
  applicationName: "Cartograph",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${fontVariables} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
