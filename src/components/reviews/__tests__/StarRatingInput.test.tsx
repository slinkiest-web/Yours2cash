import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { StarRatingInput } from "../StarRatingInput"

// PRD §7.12: "Accessible star input (keyboard operable, not color only,
// with text equivalent)."

describe("StarRatingInput", () => {
  it("renders 5 stars as accessible buttons with clear names", () => {
    render(<StarRatingInput value={0} onChange={vi.fn()} />)

    for (const n of [1, 2, 3, 4, 5]) {
      expect(screen.getByRole("button", { name: `${n} star${n > 1 ? "s" : ""}` })).toBeInTheDocument()
    }
  })

  it("groups the stars under a labelled group, not a bare row of buttons", () => {
    render(<StarRatingInput value={0} onChange={vi.fn()} label="Rating" />)
    expect(screen.getByRole("group", { name: "Rating" })).toBeInTheDocument()
  })

  it("marks the correct stars as pressed for the current value, not just by color", () => {
    render(<StarRatingInput value={3} onChange={vi.fn()} />)

    expect(screen.getByRole("button", { name: "1 star" })).toHaveAttribute("aria-pressed", "true")
    expect(screen.getByRole("button", { name: "3 stars" })).toHaveAttribute("aria-pressed", "true")
    expect(screen.getByRole("button", { name: "4 stars" })).toHaveAttribute("aria-pressed", "false")
    expect(screen.getByRole("button", { name: "5 stars" })).toHaveAttribute("aria-pressed", "false")
  })

  it("shows a visible text equivalent of the current rating, not just icons", () => {
    const { rerender } = render(<StarRatingInput value={0} onChange={vi.fn()} />)
    expect(screen.getByText("Not rated")).toBeInTheDocument()

    rerender(<StarRatingInput value={4} onChange={vi.fn()} />)
    expect(screen.getByText("4 out of 5")).toBeInTheDocument()
  })

  it("is keyboard operable: tabbing to a star and pressing Enter selects it", async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()
    render(<StarRatingInput value={0} onChange={handleChange} />)

    await user.tab() // focus the "1 star" button (first focusable element)
    await user.tab() // focus the "2 stars" button
    await user.tab() // focus the "3 stars" button
    expect(screen.getByRole("button", { name: "3 stars" })).toHaveFocus()

    await user.keyboard("{Enter}")
    expect(handleChange).toHaveBeenCalledWith(3)
  })

  it("is keyboard operable via Space as well as Enter", async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()
    render(<StarRatingInput value={0} onChange={handleChange} />)

    screen.getByRole("button", { name: "5 stars" }).focus()
    await user.keyboard(" ")
    expect(handleChange).toHaveBeenCalledWith(5)
  })

  it("renders the error message and associates it with the group", () => {
    render(<StarRatingInput value={0} onChange={vi.fn()} error="Select a rating" />)

    const message = screen.getByRole("alert")
    expect(message).toHaveTextContent("Select a rating")
    expect(screen.getByRole("group")).toHaveAttribute("aria-describedby", message.id)
  })

  it("disables all stars when disabled", () => {
    render(<StarRatingInput value={0} onChange={vi.fn()} disabled />)
    for (const n of [1, 2, 3, 4, 5]) {
      expect(screen.getByRole("button", { name: `${n} star${n > 1 ? "s" : ""}` })).toBeDisabled()
    }
  })
})
