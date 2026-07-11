import React from "react"
import { Navigate, useLocation } from "react-router-dom"
import { useAuth } from "../../context/AuthContext"
import { Spinner } from "../ui/Spinner"

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading, profileComplete } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />
  }

  if (!profileComplete && location.pathname !== "/profile") {
    return <Navigate to="/profile" replace />
  }

  return <>{children}</>
}
