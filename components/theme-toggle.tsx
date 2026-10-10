"use client";

import { MonitorIcon, MoonIcon, SunIcon, type LucideIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/shadcn-ui/toggle-group";

const OPTIONS: readonly { value: string; label: string; Icon: LucideIcon }[] = [
  { value: "system", label: "Follow system theme", Icon: MonitorIcon },
  { value: "light", label: "Light theme", Icon: SunIcon },
  { value: "dark", label: "Dark theme", Icon: MoonIcon },
];

const noop = () => () => {};

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  // The stored choice is only known in the browser. Until hydration finishes,
  // show nothing pressed rather than a guess that would mismatch the server.
  const hydrated = useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );

  return (
    <ToggleGroup
      aria-label="Theme"
      variant="outline"
      size="sm"
      spacing={0}
      value={hydrated && theme ? [theme] : []}
      onValueChange={(next) => {
        // Pressing the active item would leave nothing selected; a theme is
        // always chosen, so that click is ignored.
        if (next[0]) setTheme(next[0]);
      }}
    >
      {OPTIONS.map(({ value, label, Icon }) => (
        <ToggleGroupItem
          key={value}
          value={value}
          aria-label={label}
          // The registry's pressed (bg-muted) and 50%-alpha focus ring are
          // ~1.1:1 and ~2:1; WCAG 1.4.11 needs 3:1 for UI state. Blue marks
          // the current choice, as it marks anything selected in this app.
          className="focus-visible:ring-ring aria-pressed:bg-primary aria-pressed:text-primary-foreground"
        >
          <Icon />
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
