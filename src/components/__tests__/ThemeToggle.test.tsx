import { render, screen } from "@testing-library/react"
import { ThemeToggle } from "../ThemeToggle"
import { ThemeProvider } from "../../context/ThemeContext"
import { describe, it, expect } from "vitest"
import userEvent from "@testing-library/user-event"

describe("ThemeToggle component", () => {
  it("renders the toggle button", () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    )
    const button = screen.getByRole("button", { name: /switch to/i })
    expect(button).toBeInTheDocument()
  })

  it("toggles the dark class on root document when clicked", async () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    )
    const button = screen.getByRole("button", { name: /switch to/i })
    const initialTheme = document.documentElement.classList.contains("dark")

    await userEvent.click(button)

    const toggledTheme = document.documentElement.classList.contains("dark")
    expect(toggledTheme).toBe(!initialTheme)
  })
})
