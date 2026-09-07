import { ArrowLeft, Loader2, Search, FilePlus2, UserPlus, Info, Send, User, Calendar } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AppShell } from '../../components/layout/AppShell'
import { Alert } from '../../components/ui/Alert'
import { createVoucher, fetchVoucherTypes, searchProfiles } from '../../services/voucherService'
import type { VoucherType } from '../../types/database'
import { useAuth } from '../../context/AuthContext'

const MONTHS = [
  { value: 1, label: 'ජනවාරි' },
  { value: 2, label: 'පෙබරවාරි' },
  { value: 3, label: 'මාර්තු' },
  { value: 4, label: 'අප්‍රේල්' },
  { value: 5, label: 'මැයි' },
  { value: 6, label: 'ජුනි' },
  { value: 7, label: 'ජුලි' },
  { value: 8, label: 'අගෝස්තු' },
  { value: 9, label: 'සැප්තැම්බර්' },
  { value: 10, label: 'ඔක්තෝබර්' },
  { value: 11, label: 'නොවැම්බර්' },
  { value: 12, label: 'දෙසැම්බර්' },
]

export default function NewVoucherPage() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [voucherTypes, setVoucherTypes] = useState<VoucherType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [voucherNumber, setVoucherNumber] = useState('')
  const [voucherTypeId, setVoucherTypeId] = useState('')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')

  const now = new Date()
  const [voucherMonth, setVoucherMonth] = useState(now.getMonth() + 1)
  const [voucherYear, setVoucherYear] = useState(now.getFullYear())

  // Requester search state
  const [requesterQuery, setRequesterQuery] = useState('')
  const [searchResults, setSearchResults] = useState<{ id: string; name: string; user_number: string }[]>([])
  const [selectedRequester, setSelectedRequester] = useState<{ id: string; name: string; user_number: string } | null>(null)
  const [isSearching, setIsSearching] = useState(false)

  // Generate year options (e.g., from 2020 to current year + 1)
  const years = []
  const currentYear = new Date().getFullYear()
  for (let y = currentYear + 1; y >= 2020; y--) {
    years.push(y)
  }

  useEffect(() => {
    async function loadData() {
      try {
        const types = await fetchVoucherTypes()
        setVoucherTypes(types)
        if (profile) {
          // Default requester to self
          setSelectedRequester({
            id: profile.id,
            name: profile.name,
            user_number: profile.user_number
          })
          setRequesterQuery(`${profile.name} (${profile.user_number})`)
        }
      } catch (err) {
        setError('පෝරම දත්ත පූරණය කිරීමට අසමත් විය.')
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [profile])

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (requesterQuery.length >= 2 && (!selectedRequester || requesterQuery !== `${selectedRequester.name} (${selectedRequester.user_number})`)) {
        setIsSearching(true)
        try {
          const results = await searchProfiles(requesterQuery)
          setSearchResults(results)
        } catch (err) {
          console.error('Search failed', err)
        } finally {
          setIsSearching(false)
        }
      } else {
        setSearchResults([])
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [requesterQuery, selectedRequester])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (!voucherNumber || !selectedRequester || !voucherTypeId || !amount || !voucherMonth || !voucherYear) {
      setError('කරුණාකර අවශ්‍ය සියලුම ක්ෂේත්‍ර පුරවන්න.')
      return
    }

    setIsSubmitting(true)
    try {
      await createVoucher({
        voucherNumber: voucherNumber.toUpperCase(),
        requesterId: selectedRequester.id,
        voucherTypeId,
        amount: parseFloat(amount),
        description,
        voucherMonth,
        voucherYear,
      })
      navigate('/')
    } catch (err: any) {
      setError(err.message || 'වවුචරය නිර්මාණය කිරීමට අසමත් විය.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl space-y-8">
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="btn-ghost -ml-2 text-slate-500"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Vouchers
          </Link>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">New Voucher</h1>
            <p className="mt-1 text-sm font-medium text-slate-500">
              නව ගෙවීම් ඉල්ලීමක් සාදා අනුමත කිරීමේ වැඩ ප්‍රවාහය ආරම්භ කරන්න.
            </p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 shadow-sm shadow-brand-100">
            <FilePlus2 className="h-6 w-6" />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="card overflow-hidden shadow-xl shadow-slate-200/50">
              <form onSubmit={handleSubmit} className="divide-y divide-slate-100">
                <div className="p-8 space-y-6">
                  {error && (
                    <div className="animate-in fade-in slide-in-from-top-1">
                      <Alert variant="error">{error}</Alert>
                    </div>
                  )}

                  {/* Requester Selection */}
                  <div className="space-y-2">
                    <label htmlFor="requester" className="form-label flex items-center gap-2">
                      <UserPlus className="h-3 w-3 text-slate-400" />
                      අයදුම්කරු
                    </label>
                    <div className="relative group">
                      <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-brand-500" />
                      <input
                        id="requester"
                        type="text"
                        className={`form-input pl-10 h-11 ${!selectedRequester && requesterQuery.length >= 2 ? 'border-amber-200' : ''}`}
                        placeholder="නම හෝ සේවා අංකය අනුව සොයන්න..."
                        value={requesterQuery}
                        onChange={(e) => setRequesterQuery(e.target.value)}
                        required
                        autoComplete="off"
                      />
                      {isSearching && (
                        <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                          <Loader2 className="h-4 w-4 animate-spin text-brand-500" />
                        </div>
                      )}

                      {searchResults.length > 0 && (
                        <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                          <div className="p-2">
                            {searchResults.map((user) => (
                              <button
                                key={user.id}
                                type="button"
                                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-brand-50 group"
                                onClick={() => {
                                  setSelectedRequester(user)
                                  setRequesterQuery(`${user.name} (${user.user_number})`)
                                  setSearchResults([])
                                }}
                              >
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 group-hover:bg-brand-100 group-hover:text-brand-600 transition-colors">
                                  <User className="h-4 w-4" />
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-sm font-bold text-slate-900 group-hover:text-brand-900">{user.name}</span>
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-brand-600">{user.user_number}</span>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    {!selectedRequester && requesterQuery.length >= 2 && !isSearching && searchResults.length === 0 && (
                      <p className="mt-2 text-[11px] font-bold text-amber-600 uppercase tracking-wider flex items-center gap-1.5 animate-in fade-in">
                        <Info className="h-3 w-3" />
                        ඔබගේ සෙවුමට ගැලපෙන ක්‍රියාකාරී පරිශීලකයින් නැත.
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label htmlFor="voucherNumber" className="form-label">
                        වවුචර් අංකය
                      </label>
                      <input
                        id="voucherNumber"
                        type="text"
                        className="form-input h-11 font-mono uppercase"
                        placeholder="e.g. V-2026-001"
                        value={voucherNumber}
                        onChange={(e) => setVoucherNumber(e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="voucherType" className="form-label">
                        වවුචර් වර්ගය
                      </label>
                      <select
                        id="voucherType"
                        className="form-input h-11"
                        value={voucherTypeId}
                        onChange={(e) => setVoucherTypeId(e.target.value)}
                        required
                      >
                        <option value="">Select a type...</option>
                        {voucherTypes.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Voucher Month and Year Selection */}
                  <div className="space-y-2">
                    <label className="form-label flex items-center gap-2">
                      <Calendar className="h-3 w-3 text-slate-400" />
                      වවුචර් කාලය (මාසය/වසර)
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      <select
                        id="voucherMonth"
                        className="form-input h-11"
                        value={voucherMonth}
                        onChange={(e) => setVoucherMonth(parseInt(e.target.value))}
                        required
                      >
                        {MONTHS.map((m) => (
                          <option key={m.value} value={m.value}>
                            {m.label}
                          </option>
                        ))}
                      </select>
                      <select
                        id="voucherYear"
                        className="form-input h-11"
                        value={voucherYear}
                        onChange={(e) => setVoucherYear(parseInt(e.target.value))}
                        required
                      >
                        {years.map((y) => (
                          <option key={y} value={y}>
                            {y}
                          </option>
                        ))}
                      </select>
                    </div>
                    <p className="mt-1 text-[10px] font-medium text-slate-400">
                      මෙම වවුචරය අයත් වන මාසය සහ වර්ෂය සඳහන් කරන්න.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="amount" className="form-label">
                      Amount
                    </label>
                    <div className="relative group">
                      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold group-focus-within:text-brand-500 transition-colors">$</div>
                      <input
                        id="amount"
                        type="number"
                        step="0.01"
                        className="form-input pl-8 h-11 font-bold text-lg tabular-nums"
                        placeholder="0.00"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="description" className="form-label">
                      විස්තරය සහ අරමුණ
                    </label>
                    <textarea
                      id="description"
                      className="form-input min-h-[120px] py-3 leading-relaxed"
                      placeholder="ඉල්ලීම පිළිබඳ විස්තර සපයන්න..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>
                </div>

                <div className="bg-slate-50/50 p-8 flex justify-end">
                  <button
                    type="submit"
                    className="btn-primary px-8 h-12 text-base w-full sm:w-auto"
                    disabled={isSubmitting || isLoading || !selectedRequester}
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        Create Voucher
                        <Send className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>

          <div className="space-y-6">
            <div className="card p-6 border-dashed bg-brand-50/30 border-brand-200">
               <h3 className="text-xs font-black uppercase tracking-[0.2em] text-brand-600 mb-4 flex items-center gap-2">
                 <Info className="h-4 w-4" />
                 Guidelines
               </h3>
               <ul className="space-y-4">
                 <li className="flex gap-3">
                   <div className="h-5 w-5 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center text-[10px] font-bold shrink-0">1</div>
                   <p className="text-xs leading-relaxed text-slate-600 font-medium">Search for the employee who is requesting the payment using their Name or ID.</p>
                 </li>
                 <li className="flex gap-3">
                   <div className="h-5 w-5 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center text-[10px] font-bold shrink-0">2</div>
                   <p className="text-xs leading-relaxed text-slate-600 font-medium">Specify the correct Month and Year for accounting and tracking purposes.</p>
                 </li>
                 <li className="flex gap-3">
                   <div className="h-5 w-5 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center text-[10px] font-bold shrink-0">3</div>
                   <p className="text-xs leading-relaxed text-slate-600 font-medium">Be specific in the description to help approvers verify the request faster.</p>
                 </li>
               </ul>
            </div>

            <div className="card p-6 bg-slate-900 text-white">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">ඊළඟ පියවර</h3>
              <p className="text-sm font-medium leading-relaxed">
                නිර්මාණය කිරීමෙන් පසු, අනුමැතිය සඳහා පළමු අදියර සඳහා ඔබ මෙම වවුචරය බලයලත් නිලධාරියෙකුට පැවරිය යුතුය.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
