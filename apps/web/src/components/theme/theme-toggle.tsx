import { MoonIcon, SunIcon } from "lucide-react"
import { Button } from "@workspace/ui/components/shadcn-ui/button"

import { useTheme } from "@/components/theme/theme-provider"

/**
 * One click flips between light and dark. Which icon shows is decided by the
 * `dark` class on <html> in CSS, not by React state, so the server render and
 * the first client render always match.
 */
export function ThemeToggle() {
  const { setTheme } = useTheme()

  // Read the theme actually on screen, which also resolves "system".
  const toggleTheme = () => {
    const isDark = document.documentElement.classList.contains("dark")
    setTheme(isDark ? "light" : "dark")
  }

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={toggleTheme}
      aria-label="Toggle theme"
    >
      <SunIcon className="dark:hidden" />
      <MoonIcon className="hidden dark:block" />
    </Button>
  )
}
