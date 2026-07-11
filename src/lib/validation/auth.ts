import { z } from "zod"

export const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
})
export type LoginFormValues = z.infer<typeof loginSchema>

export const signupSchema = z
  .object({
    email: z.string().min(1, "Email is required").email("Enter a valid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
export type SignupFormValues = z.infer<typeof signupSchema>

export const resetRequestSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email address"),
})
export type ResetRequestFormValues = z.infer<typeof resetRequestSchema>

export const newPasswordSchema = z
  .object({
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
export type NewPasswordFormValues = z.infer<typeof newPasswordSchema>

export const profileSchema = z.object({
  display_name: z.string().min(2, "Display name must be at least 2 characters").max(60),
  state: z.string().min(1, "Select your state"),
  city: z.string().max(80).optional().or(z.literal("")),
  bio: z.string().max(280, "Bio must be 280 characters or fewer").optional().or(z.literal("")),
})
export type ProfileFormValues = z.infer<typeof profileSchema>
