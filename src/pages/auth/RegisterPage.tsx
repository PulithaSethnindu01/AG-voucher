import { Eye, EyeOff, FileStack, Loader2, ArrowRight } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Alert } from '../../components/ui/Alert'
import { useAuth } from '../../context/AuthContext'
import { validateRegistration, type FieldError } from '../../lib/validation'

function fieldMessage(errors: FieldError[], field: string): string | undefined {
  return errors.find((e) => e.field === field)?.message
}

export default function RegisterPage() {
  const { register, login } = useAuth()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [userNumber, setUserNumber] = useState('')
  const [mobileNumber, setMobileNumber] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldError[]>([])
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setFormError(null)

    const errors = validateRegistration({ name, userNumber, mobileNumber, password })
    setFieldErrors(errors)
    if (errors.length > 0) return

    setIsSubmitting(true)
    const result = await register({ name, userNumber, mobileNumber, password })

    if (!result.success) {
      setIsSubmitting(false)
      setFormError(result.error ?? 'Registration failed. Please try again.')
      return
    }

    const loginResult = await login({ userNumber, password })
    setIsSubmitting(false)

    if (!loginResult.success) {
      navigate('/login', { replace: true })
      return
    }

    navigate('/', { replace: true })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f8fafc] px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-10 flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-xl shadow-brand-200 animate-in zoom-in duration-500">
            <FileStack className="h-8 w-8" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Create Account</h1>
          <p className="mt-2 text-sm font-medium text-slate-500 text-balance">
            Join the internal management system. All new accounts are standard employees.
          </p>
        </div>

        <div className="card overflow-hidden shadow-xl shadow-slate-200/50 animate-in slide-in-from-bottom-4 duration-700">
          <div className="p-8">
            <form onSubmit={handleSubmit} noValidate className="space-y-5">
              {formError && (
                <div className="animate-in fade-in slide-in-from-top-1">
                  <Alert variant="error">{formError}</Alert>
                </div>
              )}

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="name" className="form-label">
                    Full Name
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    placeholder="John Doe"
                    className={`form-input ${fieldMessage(fieldErrors, 'name') ? 'border-red-300 focus:border-red-500 focus:ring-red-500/10' : ''}`}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={isSubmitting}
                    aria-invalid={Boolean(fieldMessage(fieldErrors, 'name'))}
                  />
                  {fieldMessage(fieldErrors, 'name') && (
                    <p className="form-error">{fieldMessage(fieldErrors, 'name')}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="userNumber" className="form-label">
                    User Number
                  </label>
                  <input
                    id="userNumber"
                    name="userNumber"
                    type="text"
                    autoComplete="username"
                    placeholder="e.g. 1024"
                    className={`form-input ${fieldMessage(fieldErrors, 'userNumber') ? 'border-red-300 focus:border-red-500 focus:ring-red-500/10' : ''}`}
                    value={userNumber}
                    onChange={(e) => setUserNumber(e.target.value)}
                    disabled={isSubmitting}
                    aria-invalid={Boolean(fieldMessage(fieldErrors, 'userNumber'))}
                  />
                  {fieldMessage(fieldErrors, 'userNumber') && (
                    <p className="form-error">{fieldMessage(fieldErrors, 'userNumber')}</p>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="mobileNumber" className="form-label">
                  Mobile Number
                </label>
                <input
                  id="mobileNumber"
                  name="mobileNumber"
                  type="tel"
                  autoComplete="tel"
                  placeholder="+1 234 567 890"
                  className={`form-input ${fieldMessage(fieldErrors, 'mobileNumber') ? 'border-red-300 focus:border-red-500 focus:ring-red-500/10' : ''}`}
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  disabled={isSubmitting}
                  aria-invalid={Boolean(fieldMessage(fieldErrors, 'mobileNumber'))}
                />
                {fieldMessage(fieldErrors, 'mobileNumber') && (
                  <p className="form-error">{fieldMessage(fieldErrors, 'mobileNumber')}</p>
                )}
              </div>

              <div>
                <label htmlFor="password" className="form-label">
                  Password
                </label>
                <div className="relative group">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="••••••••"
                    className={`form-input pr-10 ${fieldMessage(fieldErrors, 'password') ? 'border-red-300 focus:border-red-500 focus:ring-red-500/10' : ''}`}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isSubmitting}
                    aria-invalid={Boolean(fieldMessage(fieldErrors, 'password'))}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600 transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {fieldMessage(fieldErrors, 'password') && (
                  <p className="form-error">{fieldMessage(fieldErrors, 'password')}</p>
                )}
                <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Minimum 8 characters with letters & numbers
                </p>
              </div>

              <button type="submit" className="btn-primary w-full py-2.5 h-11 mt-2" disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                ) : (
                  <>
                    Create Account
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="bg-slate-50 border-t border-slate-100 px-8 py-4 text-center">
            <p className="text-sm font-medium text-slate-500">
              Already have an account?{' '}
              <Link to="/login" className="font-bold text-brand-600 hover:text-brand-700 transition-colors">
                Sign in
              </Link>
            </p>
          </div>
        </div>

        <p className="mt-8 text-center text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
          Official AG Internal System
        </p>
      </div>
    </div>
  )
}
