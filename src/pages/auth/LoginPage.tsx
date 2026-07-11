import React, { useState } from "react"
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Card } from "../../components/ui/Card"
import { Input } from "../../components/ui/Input"
import { Button } from "../../components/ui/Button"
import { useToast } from "../../components/ui/Toast"
import { useAuth } from "../../context/AuthContext"
import { signIn } from "../../lib/auth"
import { loginSchema, type LoginFormValues } from "../../lib/validation/auth"

interface LocationState {
  from?: { pathname: string }
}

export const LoginPage: React.FC = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { showToast } = useToast()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) })

  if (user) {
    const redirectTo = (location.state as LocationState | null)?.from?.pathname ?? "/"
    return <Navigate to={redirectTo} replace />
  }

  const onSubmit = async (values: LoginFormValues) => {
    setServerError(null)
    const { error } = await signIn(values.email, values.password)
    if (error) {
      setServerError(error)
      return
    }
    showToast("Welcome back.", "success")
    const redirectTo = (location.state as LocationState | null)?.from?.pathname ?? "/"
    navigate(redirectTo, { replace: true })
  }

  return (
    <div className="max-w-md mx-auto">
      <Card className="p-6 md:p-8 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-serif text-text">Welcome Back</h1>
          <p className="text-text-muted text-sm">Login to manage your listings and track your mock orders.</p>
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

          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label htmlFor="login-password" className="text-sm font-medium text-text">
                Password
              </label>
              <Link to="/auth/reset-password" className="text-xs text-primary hover:underline">
                Forgot password?
              </Link>
            </div>
            <Input
              id="login-password"
              type="password"
              autoComplete="current-password"
              placeholder="Enter your password"
              error={errors.password?.message}
              {...register("password")}
            />
          </div>

          {serverError && (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400 font-medium">
              {serverError}
            </p>
          )}

          <Button type="submit" variant="primary" className="w-full" isLoading={isSubmitting}>
            Log In
          </Button>

          <p className="text-xs text-center text-text-muted">
            Do not have an account?{" "}
            <Link to="/auth/signup" className="text-primary hover:underline font-semibold">
              Sign Up
            </Link>
          </p>
        </form>
      </Card>
    </div>
  )
}
