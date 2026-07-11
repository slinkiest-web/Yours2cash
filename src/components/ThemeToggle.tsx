import React from "react"
import { Sun, Moon } from "lucide-react"
import { useTheme } from "../context/ThemeContext"

export const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
      className="p-2 rounded-lg bg-surface-raised border border-border text-text hover:text-primary transition-all duration-200 hover:scale-105 active:scale-95 flex items-center justify-center"
    >
      {theme === "light" ? (
        <Moon className="w-5 h-5 transition-transform duration-300 rotate-0" />
      ) : (
        <Sun className="w-5 h-5 transition-transform duration-300 rotate-0" />
      )}
    </button>
  )
}
