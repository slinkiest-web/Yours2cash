import React, { useState } from "react"
import { Link, Navigate, useNavigate } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { MailCheck } from "lucide-react"
import { Card } from "../../components/ui/Card"
import { Input } from "../../components/ui/Input"
import { Button } from "../../components/ui/Button"
import { useToast } from "../../components/ui/Toast"
import { useAuth } from "../../context/AuthContext"
import { signUp } from "../../lib/auth"
import { signupSchema, type SignupFormValues } from "../../lib/validation/auth"

export const SignupPage: React.FC = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [serverError, setServerError] = useState<string | null>(null)
  const [confirmationEmail, setConfirmationEmail] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormValues>({ resolver: zodResolver(signupSchema) })

  if (user) {
    return <Navigate to="/" replace />
  }

  const onSubmit = async (values: SignupFormValues) => {
    setServerError(null)
    const { session, error } = await signUp(values.email, values.password)
    if (error) {
      setServerError(error)
      return
    }
    if (session) {
      showToast("Account created. Let's set up your profile.", "success")
      navigate("/profile", { replace: true })
      return
    }
    setConfirmationEmail(values.email)
  }

  if (confirmationEmail) {
    return (
      <div className="max-w-md mx-auto">
        <Card className="p-6 md:p-8 space-y-4 text-center">
          <div className="flex justify-center">
            <div className="p-3 bg-surface rounded-full border border-border text-primary">
              <MailCheck className="w-8 h-8" aria-hidden="true" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-serif text-text">Check your email</h1>
          <p className="text-text-muted text-sm">
            We sent a confirmation link to{" "}
            <span className="font-semibold text-text">{confirmationEmail}</span>. Click it to
            activate your account, then log in.
          </p>
          <Link to="/auth/login">
            <Button variant="secondary" className="w-full">
              Go to Login
            </Button>
          </Link>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto">
      <Card className="p-6 md:p-8 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-serif text-text">Create Account</h1>
          <p className="text-text-muted text-sm">Join Yours2Cash recommerce marketplace today.</p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <Input
            label="Email Address"
            type="email"
            autoComplete="email"
            placeholder="name@domain.com"
            error={errors.email?.message}
            {...register("email")}
          />

          <Input
            label="Password"
            type="password"
            autoComplete="new-password"
            placeholder="At least 6 characters"
            error={errors.password?.message}
            {...register("password")}
          />

          <Input
            label="Confirm Password"
            type="password"
            autoComplete="new-password"
            placeholder="Re-enter your password"
            error={errors.confirmPassword?.message}
            {...register("confirmPassword")}
          />

          {serverError && (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400 font-medium">
              {serverError}
            </p>
          )}

          <Button type="submit" variant="primary" className="w-full" isLoading={isSubmitting}>
            Sign Up
          </Button>

          <p className="text-xs text-center text-text-muted">
            Already have an account?{" "}
            <Link to="/auth/login" className="text-primary hover:underline font-semibold">
              Log In
            </Link>
          </p>
        </form>
      </Card>
    </div>
  )
}
