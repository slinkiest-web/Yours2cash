import { render, screen } from "@testing-library/react"
import { Button } from "../Button"
import { describe, it, expect, vi } from "vitest"
import userEvent from "@testing-library/user-event"

describe("Button component", () => {
  it("renders correctly with default styles", () => {
    render(<Button>Click me</Button>)
    const button = screen.getByRole("button", { name: /click me/i })
    expect(button).toBeInTheDocument()
    expect(button).toHaveClass("bg-primary")
  })

  it("handles click events", async () => {
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>Click me</Button>)
    const button = screen.getByRole("button", { name: /click me/i })
    await userEvent.click(button)
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it("shows loading spinner when isLoading is true", () => {
    render(<Button isLoading>Click me</Button>)
    const spinner = screen.getByLabelText("loading")
    expect(spinner).toBeInTheDocument()
  })

  it("is disabled when disabled prop is provided", () => {
    render(<Button disabled>Click me</Button>)
    const button = screen.getByRole("button", { name: /click me/i })
    expect(button).toBeDisabled()
  })
})
