import { FileStack, LogOut, Menu, User, X } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useAuth } from '../../context/AuthContext'

const ROLE_LABELS: Record<string, string> = {
  EMPLOYEE: 'Employee',
  FIRST_RECEIVER: 'First Receiver',
  SECOND_APPROVER: 'Second Approver',
  THIRD_APPROVER: 'Third Approver',
  FINAL_PAYMENT_OFFICER: 'Payment Officer',
  ADMIN: 'Administrator',
  SUPERVISOR: 'Supervisor / Boss',
}

export function AppShell({ children }: { children: ReactNode }) {
  const { profile, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <header className="sticky top-0 z-30 border-b border-slate-200/60 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white shadow-lg shadow-brand-200">
              <FileStack className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-bold tracking-tight text-slate-900 sm:text-base">
                AG Voucher
              </span>
              <span className="text-[10px] font-medium uppercase tracking-widest text-slate-400">
                Management System
              </span>
            </div>
          </div>

          <div className="hidden items-center gap-6 sm:flex">
            {profile && (
              <div className="flex items-center gap-3 border-r border-slate-200 pr-6">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                  <User className="h-4 w-4" aria-hidden="true" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-slate-800 leading-none">{profile.name}</span>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-[10px] font-medium text-slate-400">{profile.user_number}</span>
                    {profile.roles.length > 0 && (
                      <span className="inline-flex rounded-full bg-brand-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-brand-600">
                        {ROLE_LABELS[profile.roles[0]] ?? profile.roles[0]}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
            <button
              onClick={logout}
              className="btn-ghost text-slate-500 hover:text-red-600 hover:bg-red-50"
              type="button"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Sign out
            </button>
          </div>

          <button
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 sm:hidden"
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <div className="border-t border-slate-100 bg-white px-4 py-4 shadow-xl sm:hidden animate-in fade-in slide-in-from-top-2">
            {profile && (
              <div className="mb-6 flex items-center gap-4 px-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                  <User className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="flex flex-col">
                  <p className="font-bold text-slate-900">{profile.name}</p>
                  <p className="text-xs text-slate-500">{profile.user_number}</p>
                </div>
              </div>
            )}
            <div className="space-y-1">
               {profile?.roles.map((r) => (
                <div key={r} className="px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Role: {ROLE_LABELS[r] ?? r}
                </div>
              ))}
            </div>
            <button onClick={logout} className="mt-4 btn-danger w-full" type="button">
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Sign out
            </button>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="animate-in fade-in duration-500">
          {children}
        </div>
      </main>
    </div>
  )
}
