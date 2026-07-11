import React, { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Card } from "../../components/ui/Card"
import { Input } from "../../components/ui/Input"
import { Button } from "../../components/ui/Button"
import { useToast } from "../../components/ui/Toast"
import { onAuthStateChange, resetPassword, updatePassword } from "../../lib/auth"
import {
  newPasswordSchema,
  resetRequestSchema,
  type NewPasswordFormValues,
  type ResetRequestFormValues,
} from "../../lib/validation/auth"

/**
 * This route is dual purpose: it also serves as the redirectTo target Supabase
 * emails for password recovery, arriving with a #type=recovery hash. Detect
 * that up front (hash) and via the PASSWORD_RECOVERY auth event (belt and
 * braces, since the hash may already be consumed by the time we subscribe).
 */
export const ResetPasswordPage: React.FC = () => {
  const [mode, setMode] = useState<"request" | "recovery">(() =>
    window.location.hash.includes("type=recovery") ? "recovery" : "request"
  )

  useEffect(() => {
    const { data } = onAuthStateChange((_user, _session, event) => {
      if (event === "PASSWORD_RECOVERY") {
        setMode("recovery")
      }
    })
    return () => data.subscription.unsubscribe()
  }, [])

  return mode === "recovery" ? <NewPasswordForm /> : <RequestLinkForm />
}

const RequestLinkForm: React.FC = () => {
  const { showToast } = useToast()
  const [serverError, setServerError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetRequestFormValues>({ resolver: zodResolver(resetRequestSchema) })

  const onSubmit = async (values: ResetRequestFormValues) => {
    setServerError(null)
    const { error } = await resetPassword(values.email)
    if (error) {
      setServerError(error)
      return
    }
    setSent(true)
    showToast("Reset link sent.", "success")
  }

  if (sent) {
    return (
      <div className="max-w-md mx-auto">
        <Card className="p-6 md:p-8 space-y-4 text-center">
          <h1 className="text-2xl font-bold text-serif text-text">Check your email</h1>
          <p className="text-text-muted text-sm">
            If an account exists for that address, a password reset link is on its way.
          </p>
          <Link to="/auth/login">
            <Button variant="secondary" className="w-full">
              Back to Login
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
          <h1 className="text-2xl font-bold text-serif text-text">Reset Password</h1>
          <p className="text-text-muted text-sm">Enter your email and we will send a password reset link.</p>
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

          {serverError && (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400 font-medium">
              {serverError}
            </p>
          )}

          <Button type="submit" variant="primary" className="w-full" isLoading={isSubmitting}>
            Send Link
          </Button>

          <p className="text-xs text-center text-text-muted">
            Go back to{" "}
            <Link to="/auth/login" className="text-primary hover:underline font-semibold">
              Log In
            </Link>
          </p>
        </form>
      </Card>
    </div>
  )
}

const NewPasswordForm: React.FC = () => {
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<NewPasswordFormValues>({ resolver: zodResolver(newPasswordSchema) })

  const onSubmit = async (values: NewPasswordFormValues) => {
    setServerError(null)
    const { error } = await updatePassword(values.password)
    if (error) {
      setServerError(error)
      return
    }
    showToast("Password updated.", "success")
    navigate("/", { replace: true })
  }

  return (
    <div className="max-w-md mx-auto">
      <Card className="p-6 md:p-8 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-serif text-text">Set a New Password</h1>
          <p className="text-text-muted text-sm">Choose a new password for your account.</p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <Input
            label="New Password"
            type="password"
            autoComplete="new-password"
            placeholder="At least 6 characters"
            error={errors.password?.message}
            {...register("password")}
          />
          <Input
            label="Confirm New Password"
            type="password"
            autoComplete="new-password"
            placeholder="Re-enter your new password"
            error={errors.confirmPassword?.message}
            {...register("confirmPassword")}
          />

          {serverError && (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400 font-medium">
              {serverError}
            </p>
          )}

          <Button type="submit" variant="primary" className="w-full" isLoading={isSubmitting}>
            Update Password
          </Button>
        </form>
      </Card>
    </div>
  )
}
