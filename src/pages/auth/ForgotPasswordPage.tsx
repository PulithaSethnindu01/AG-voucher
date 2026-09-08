import { Eye, EyeOff, FileStack, Loader2, ArrowLeft, Key, User, Phone } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Alert } from '../../components/ui/Alert'
import { resetPasswordSelfService } from '../../services/authService'
import { validateUserNumber, validateMobileNumber, validatePassword, type FieldError } from '../../lib/validation'

export default function ForgotPasswordPage() {
  const navigate = useNavigate()

  const [userNumber, setUserNumber] = useState('')
  const [mobileNumber, setMobileNumber] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldError[]>([])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setFormError(null)
    setFormSuccess(null)
    setFieldErrors([])

    // Validation
    const errors: FieldError[] = []
    const uErr = validateUserNumber(userNumber)
    if (uErr) errors.push({ field: 'userNumber', message: uErr })

    const mErr = validateMobileNumber(mobileNumber)
    if (mErr) errors.push({ field: 'mobileNumber', message: mErr })

    const pErr = validatePassword(newPassword)
    if (pErr) errors.push({ field: 'newPassword', message: pErr })

    if (newPassword !== confirmPassword) {
      errors.push({ field: 'confirmPassword', message: 'මුරපද එකිනෙකට නොගැලපේ.' })
    }

    if (errors.length > 0) {
      setFieldErrors(errors)
      return
    }

    setIsSubmitting(true)
    const result = await resetPasswordSelfService({
      userNumber,
      mobileNumber,
      newPassword
    })
    setIsSubmitting(false)

    if (result.success) {
      setFormSuccess('මුරපදය සාර්ථකව යාවත්කාලීන කරන ලදී. දැන් ඔබට නව මුරපදය සමඟ පුරනය විය හැක.')
      setTimeout(() => navigate('/login'), 3000)
    } else {
      setFormError(result.error || 'Identity verification failed. Please check your data.')
    }
  }

  const getFieldError = (field: string) => fieldErrors.find(e => e.field === field)?.message

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f8fafc] px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-10 flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-xl shadow-brand-200">
            <Key className="h-8 w-8" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 text-balance uppercase">මුරපදය අමතකද?</h1>
          <p className="mt-2 text-sm font-medium text-slate-500">ඔබගේ සේවා අංකය සහ දුරකථන අංකය භාවිතා කර මුරපදය නැවත සකසන්න.</p>
        </div>

        <div className="card overflow-hidden shadow-xl shadow-slate-200/50 animate-in slide-in-from-bottom-4 duration-700">
          <div className="p-8">
            <form onSubmit={handleSubmit} noValidate className="space-y-5">
              {formError && <Alert variant="error">{formError}</Alert>}
              {formSuccess && <Alert variant="success">{formSuccess}</Alert>}

              <div>
                <label htmlFor="userNumber" className="form-label flex items-center gap-2">
                  <User className="h-3 w-3 text-slate-400" />
                  සේවා අංකය
                </label>
                <input
                  id="userNumber"
                  type="text"
                  placeholder="e.g. 1024"
                  className={`form-input ${getFieldError('userNumber') ? 'border-red-300' : ''}`}
                  value={userNumber}
                  onChange={(e) => setUserNumber(e.target.value)}
                  disabled={isSubmitting}
                />
                {getFieldError('userNumber') && <p className="form-error">{getFieldError('userNumber')}</p>}
              </div>

              <div>
                <label htmlFor="mobileNumber" className="form-label flex items-center gap-2">
                  <Phone className="h-3 w-3 text-slate-400" />
                  දුරකථන අංකය
                </label>
                <input
                  id="mobileNumber"
                  type="tel"
                  placeholder="+94 70 123 4567"
                  className={`form-input ${getFieldError('mobileNumber') ? 'border-red-300' : ''}`}
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  disabled={isSubmitting}
                />
                {getFieldError('mobileNumber') && <p className="form-error">{getFieldError('mobileNumber')}</p>}
              </div>

              <div className="border-t border-slate-100 pt-5 space-y-5">
                <div>
                  <label htmlFor="newPassword" className="form-label">නව මුරපදය</label>
                  <div className="relative group">
                    <input
                      id="newPassword"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      className={`form-input pr-10 ${getFieldError('newPassword') ? 'border-red-300' : ''}`}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      disabled={isSubmitting}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {getFieldError('newPassword') && <p className="form-error">{getFieldError('newPassword')}</p>}
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="form-label">නව මුරපදය තහවුරු කරන්න</label>
                  <input
                    id="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    className={`form-input ${getFieldError('confirmPassword') ? 'border-red-300' : ''}`}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isSubmitting}
                  />
                  {getFieldError('confirmPassword') && <p className="form-error">{getFieldError('confirmPassword')}</p>}
                </div>
              </div>

              <button type="submit" className="btn-primary w-full h-11" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : 'මුරපදය යාවත්කාලීන කරන්න'}
              </button>
            </form>
          </div>

          <div className="bg-slate-50 border-t border-slate-100 px-8 py-4 text-center">
            <Link to="/login" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-brand-600 transition-colors">
              <ArrowLeft className="h-4 w-4" />
              නැවත පුරනය වන්න
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
