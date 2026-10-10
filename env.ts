import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

/**
 * Clerk's Frontend API host is encoded in the publishable key:
 * pk_test_|pk_live_ + base64(host + "$"). Returns the bare host, or null if
 * the key doesn't decode to one. Only a plain hostname is accepted because
 * next.config.ts writes it into the CSP header, where spaces, ';' or quotes
 * could inject directives.
 */
export function clerkFrontendApiHost(publishableKey: string): string | null {
  const encoded = /^pk_(?:test|live)_([A-Za-z0-9+/=]+)$/.exec(
    publishableKey,
  )?.[1];
  if (!encoded) return null;
  let decoded: string;
  try {
    decoded = atob(encoded);
  } catch {
    return null;
  }
  return /^[a-z0-9-]+(?:\.[a-z0-9-]+)+\$$/i.test(decoded)
    ? decoded.slice(0, -1)
    : null;
}

// An in-app path: starts with "/" but not "//", which browsers treat as a
// protocol-relative URL to another host.
const appPath = z.string().regex(/^\/(?!\/)/);

// Validated when next.config.ts imports this file, i.e. on every build and
// dev start. Clerk's SDK reads process.env itself; this schema guarantees the
// values are present and well-formed. CLERK_SECRET_KEY stays out of the
// browser because Next.js only inlines NEXT_PUBLIC_* variables; createEnv
// additionally throws if client code reads a server variable through `env`.
// CI sets SKIP_ENV_VALIDATION=1 because it holds no keys; Vercel and local
// builds always validate.
export const env = createEnv({
  server: {
    CLERK_SECRET_KEY: z.string().regex(/^sk_(?:test|live)_/),
  },
  client: {
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z
      .string()
      .refine((key) => clerkFrontendApiHost(key) !== null, {
        error: "not a valid Clerk publishable key",
      }),
    NEXT_PUBLIC_CLERK_SIGN_IN_URL: appPath,
    NEXT_PUBLIC_CLERK_SIGN_UP_URL: appPath,
    NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL: appPath,
    NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL: appPath,
  },
  // Client variables must be listed explicitly so Next.js can inline them.
  runtimeEnv: {
    CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    NEXT_PUBLIC_CLERK_SIGN_IN_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL,
    NEXT_PUBLIC_CLERK_SIGN_UP_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL,
    NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL:
      process.env.NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL,
    NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL:
      process.env.NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL,
  },
  emptyStringAsUndefined: true,
  // Only an explicit "1" skips; "0" or "false" must not.
  skipValidation: process.env.SKIP_ENV_VALIDATION === "1",
});
