import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";

import { AuthControls } from "./auth-controls";
import { fontVariables } from "./fonts";

import "./globals.css";
import { Geist, Inter } from "next/font/google";
import { cn } from "@/lib/utils";

const inter = Inter({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: { default: "Cartograph", template: "%s · Cartograph" },
  description:
    "A dependency map of any public TypeScript or JavaScript repository, drawn from the code itself.",
  applicationName: "Cartograph",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={cn("h-full", "antialiased", fontVariables, "font-sans", inter.variable)}>
      <body className="flex min-h-full flex-col">
        <ClerkProvider>
          <header className="flex h-10 items-center justify-between border-b border-zinc-200 px-3 dark:border-zinc-800">
            <span className="text-sm font-semibold">Cartograph</span>
            <AuthControls />
          </header>
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
