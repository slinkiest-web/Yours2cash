import React, { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Search, ShoppingBag, MessageSquare, User, PlusCircle, Menu, X, LogOut } from "lucide-react"
import { ThemeToggle } from "../ThemeToggle"
import { Avatar } from "../ui/Avatar"
import { useAuth } from "../../context/AuthContext"
import { getAvatarPublicUrl } from "../../lib/queries/profiles"

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const navigate = useNavigate()
  const { user, profile, signOut } = useAuth()

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setIsMobileMenuOpen(false)
    navigate("/search")
  }

  const handleLogout = async () => {
    await signOut()
    setIsMobileMenuOpen(false)
    navigate("/")
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <header className="sticky top-0 z-40 bg-surface/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <span className="text-2xl font-black text-serif text-primary tracking-tight">
              Yours2Cash
            </span>
          </Link>

          <form onSubmit={handleSearchSubmit} className="hidden md:flex flex-1 max-w-md relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              placeholder="Search pre owned items"
              className="w-full pl-9 pr-4 py-1.5 bg-surface-raised border border-border rounded-lg text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            />
          </form>

          <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-text">
            <Link to="/search" className="hover:text-primary transition-colors flex items-center gap-1.5">
              <Search className="w-4 h-4" /> Browse
            </Link>
            <Link to="/sell" className="hover:text-primary transition-colors flex items-center gap-1.5">
              <PlusCircle className="w-4 h-4" /> Sell
            </Link>
            <Link to="/chat" className="hover:text-primary transition-colors flex items-center gap-1.5 relative">
              <MessageSquare className="w-4 h-4" /> Inbox
            </Link>
            <Link to="/orders" className="hover:text-primary transition-colors flex items-center gap-1.5">
              <ShoppingBag className="w-4 h-4" /> Orders
            </Link>
            <Link to="/dashboard" className="hover:text-primary transition-colors flex items-center gap-1.5">
              Dashboard
            </Link>
            <Link to="/profile" className="hover:text-primary transition-colors flex items-center gap-1.5">
              <User className="w-4 h-4" /> Profile
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            <ThemeToggle />

            {user ? (
              <div className="hidden md:flex items-center gap-3">
                <Link to="/profile" aria-label="Profile settings">
                  <Avatar
                    name={profile?.display_name ?? user.email ?? "User"}
                    src={getAvatarPublicUrl(profile?.avatar_url)}
                    size="sm"
                  />
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-sm font-semibold text-text hover:text-primary transition-colors flex items-center gap-1.5"
                >
                  <LogOut className="w-4 h-4" /> Log out
                </button>
              </div>
            ) : (
              <Link to="/auth/login" className="hidden md:inline-block">
                <span className="text-sm font-semibold text-text hover:text-primary transition-colors">
                  Login
                </span>
              </Link>
            )}

            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle navigation menu"
              className="md:hidden p-2 rounded-lg text-text hover:bg-surface-raised border border-border"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-30 bg-black/50 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}>
          <div className="absolute top-16 right-0 left-0 bg-surface border-b border-border p-4 space-y-4 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleSearchSubmit} className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type="text"
                placeholder="Search pre owned items"
                className="w-full pl-9 pr-4 py-2 bg-surface-raised border border-border rounded-lg text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </form>
            <nav className="flex flex-col gap-3 font-semibold text-text text-base">
              <Link to="/search" onClick={() => setIsMobileMenuOpen(false)} className="py-1 hover:text-primary">
                Browse Listings
              </Link>
              <Link to="/sell" onClick={() => setIsMobileMenuOpen(false)} className="py-1 hover:text-primary">
                List an Item
              </Link>
              <Link to="/chat" onClick={() => setIsMobileMenuOpen(false)} className="py-1 hover:text-primary">
                Chat Inbox
              </Link>
              <Link to="/orders" onClick={() => setIsMobileMenuOpen(false)} className="py-1 hover:text-primary">
                My Orders
              </Link>
              <Link to="/dashboard" onClick={() => setIsMobileMenuOpen(false)} className="py-1 hover:text-primary">
                Seller Dashboard
              </Link>
              <Link to="/profile" onClick={() => setIsMobileMenuOpen(false)} className="py-1 hover:text-primary">
                Profile Settings
              </Link>
              <hr className="border-border" />
              {user ? (
                <button
                  onClick={handleLogout}
                  className="py-1 text-left text-primary flex items-center gap-1.5"
                >
                  <LogOut className="w-4 h-4" /> Log out
                </button>
              ) : (
                <Link to="/auth/login" onClick={() => setIsMobileMenuOpen(false)} className="py-1 text-primary">
                  Login
                </Link>
              )}
            </nav>
          </div>
        </div>
      )}

      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      <footer className="bg-surface-raised border-t border-border py-8 text-center text-xs text-text-muted">
        <div className="max-w-7xl mx-auto px-4">
          <p>© 2026 Yours2Cash, Nigeria. Mock recommerce platform.</p>
        </div>
      </footer>
    </div>
  )
}
