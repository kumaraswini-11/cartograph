import type { Metadata } from "next";

import { fontVariables } from "./fonts";

import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Cartograph", template: "%s · Cartograph" },
  description:
    "A dependency map of any public TypeScript or JavaScript repository, drawn from the code itself.",
  applicationName: "Cartograph",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${fontVariables} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
