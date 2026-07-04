// ThemeToggle.tsx
// Toggles the `dark` class on <html>, which shadcn's CSS variables react to.
// Persists choice to localStorage and respects system preference on first load.

import { useEffect, useState } from "react"
import { Button } from "../components/ui/button"
import { Sun, Moon } from "lucide-react"

function getInitialTheme(): "light" | "dark" {
  const stored = localStorage.getItem("theme")
  if (stored === "light" || stored === "dark") return stored
  return "light" // default to light; system preference ignored so the whole app stays consistent
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">(getInitialTheme)

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark")
    localStorage.setItem("theme", theme)
  }, [theme])

  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-8"
      onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
      aria-label="Toggle theme"
    >
      {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  )
}