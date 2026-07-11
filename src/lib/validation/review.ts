import { z } from "zod"

export const reviewSchema = z.object({
  rating: z.number().min(1, "Select a rating").max(5),
  comment: z.string().max(1000, "Keep it under 1000 characters").optional().or(z.literal("")),
})
export type ReviewFormValues = z.infer<typeof reviewSchema>
