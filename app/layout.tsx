import { ClerkProvider } from "@clerk/nextjs";
import { shadcn } from "@clerk/ui/themes";
import type { Metadata } from "next";

import { SiteHeader } from "@/components/site-header";
import { ThemeProvider } from "@/components/theme-provider";

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
    // suppressHydrationWarning: next-themes sets the theme class and an inline
    // color-scheme style on <html> before React hydrates, so they differ from
    // the server render.
    <html
      lang="en"
      className={`${fontVariables} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ClerkProvider appearance={{ theme: shadcn }}>
            <SiteHeader />
            {children}
          </ClerkProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
