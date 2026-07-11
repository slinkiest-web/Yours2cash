import { z } from "zod"

export const listingSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(120),
  description: z.string().min(10, "Description must be at least 10 characters").max(2000),
  price: z.number("Enter a price in Naira").positive("Price must be greater than 0"),
  category_id: z.string().min(1, "Select a category"),
  condition: z.enum(["new", "like_new", "good", "fair"], "Select a condition"),
  state: z.string().min(1, "Select a state"),
  city: z.string().max(80).optional().or(z.literal("")),
})
export type ListingFormValues = z.infer<typeof listingSchema>
