import { BrowserRouter, Routes, Route } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ThemeProvider } from "./context/ThemeContext"
import { AuthProvider } from "./context/AuthContext"
import { ToastProvider } from "./components/ui/Toast"
import { AppShell } from "./components/layout/AppShell"
import { ProtectedRoute } from "./components/auth/ProtectedRoute"
import { LoginPage } from "./pages/auth/LoginPage"
import { SignupPage } from "./pages/auth/SignupPage"
import { ResetPasswordPage } from "./pages/auth/ResetPasswordPage"
import { ProfilePage } from "./pages/ProfilePage"
import { HomePage } from "./pages/HomePage"
import { SearchPage } from "./pages/SearchPage"
import { CategoryPage } from "./pages/CategoryPage"
import { ProductDetailPage } from "./pages/listings/ProductDetailPage"
import { ListingFormPage } from "./pages/listings/ListingFormPage"
import {
  ChatInboxPage,
  ChatThreadPage,
  OrdersPage,
  SellerDashboardPage,
  PublicProfilePage,
  NotFoundPage,
} from "./pages/Placeholders"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <BrowserRouter>
              <AppShell>
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/search" element={<SearchPage />} />
                  <Route path="/category/:slug" element={<CategoryPage />} />
                  <Route path="/product/:id" element={<ProductDetailPage />} />
                  <Route
                    path="/sell"
                    element={
                      <ProtectedRoute>
                        <ListingFormPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/sell/:id"
                    element={
                      <ProtectedRoute>
                        <ListingFormPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/chat"
                    element={
                      <ProtectedRoute>
                        <ChatInboxPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/chat/:id"
                    element={
                      <ProtectedRoute>
                        <ChatThreadPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/orders"
                    element={
                      <ProtectedRoute>
                        <OrdersPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard"
                    element={
                      <ProtectedRoute>
                        <SellerDashboardPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/profile"
                    element={
                      <ProtectedRoute>
                        <ProfilePage />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="/profile/:id" element={<PublicProfilePage />} />
                  <Route path="/auth/login" element={<LoginPage />} />
                  <Route path="/auth/signup" element={<SignupPage />} />
                  <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
              </AppShell>
            </BrowserRouter>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}

export default App
