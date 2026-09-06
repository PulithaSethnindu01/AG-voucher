import { Plus, Search, Filter, FileText, CheckCircle2, Clock, ListChecks, Calendar } from 'lucide-react'
import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { AppShell } from '../../components/layout/AppShell'
import { Alert } from '../../components/ui/Alert'
import { Spinner } from '../../components/ui/Spinner'
import { VoucherStatusBadge } from '../../components/vouchers/VoucherStatusBadge'
import { useAuth } from '../../context/AuthContext'
import { fetchVouchers } from '../../services/voucherService'
import type { VoucherWithDetails } from '../../types/database'

const MONTH_NAMES = [
  '', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
]

export default function VouchersPage() {
  const { hasRole } = useAuth()
  const [vouchers, setVouchers] = useState<VoucherWithDetails[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    async function loadVouchers() {
      try {
        setIsLoading(true)
        const data = await fetchVouchers()
        setVouchers(data)
      } catch (err) {
        setError('Failed to load vouchers. Please try again.')
        console.error(err)
      } finally {
        setIsLoading(false)
      }
    }
    loadVouchers()
  }, [])

  const filteredVouchers = useMemo(() => {
    return vouchers.filter((v) =>
      v.voucher_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.requester_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.requester_user_number?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [vouchers, searchTerm])

  const stats = useMemo(() => {
    const total = vouchers.length
    const pending = vouchers.filter(v => v.status === 'PENDING').length
    const paid = vouchers.filter(v => v.status === 'PAID').length
    return { total, pending, paid }
  }, [vouchers])

  const canCreate = hasRole('FIRST_RECEIVER') || hasRole('ADMIN')

  return (
    <AppShell>
      <div className="space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Vouchers</h1>
            <p className="mt-1 text-sm font-medium text-slate-500 text-balance">
              Manage and track all payment vouchers in the system.
            </p>
          </div>
          {canCreate && (
            <Link to="/vouchers/new" className="btn-primary">
              <Plus className="h-4 w-4" />
              New Voucher
            </Link>
          )}
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="card p-6 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-sm">
              <ListChecks className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Vouchers</p>
              <p className="text-2xl font-black text-slate-900 tabular-nums">{stats.total}</p>
            </div>
          </div>
          <div className="card p-6 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shadow-sm">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Pending Approval</p>
              <p className="text-2xl font-black text-slate-900 tabular-nums">{stats.pending}</p>
            </div>
          </div>
          <div className="card p-6 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-sm">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Completed / Paid</p>
              <p className="text-2xl font-black text-slate-900 tabular-nums">{stats.paid}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative flex-1 group">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-brand-500" />
            <input
              type="text"
              placeholder="Search by voucher number or requester..."
              className="form-input pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="btn-secondary sm:w-auto">
            <Filter className="h-4 w-4" />
            Filters
          </button>
        </div>

        {error && <Alert variant="error">{error}</Alert>}

        {isLoading ? (
          <div className="flex h-96 items-center justify-center card bg-white/50 backdrop-blur-sm border-dashed">
            <Spinner label="Loading your vouchers..." />
          </div>
        ) : filteredVouchers.length > 0 ? (
          <div className="table-container">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100">
                <thead>
                  <tr>
                    <th className="table-header px-6 py-4">Voucher #</th>
                    <th className="table-header px-6 py-4">Period</th>
                    <th className="table-header px-6 py-4">Requester</th>
                    <th className="table-header px-6 py-4">Type</th>
                    <th className="table-header px-6 py-4">Amount</th>
                    <th className="table-header px-6 py-4 text-center">Status</th>
                    <th className="table-header px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {filteredVouchers.map((voucher) => (
                    <tr key={voucher.id} className="table-row group">
                      <td className="table-cell font-bold text-slate-900 tabular-nums">
                        {voucher.voucher_number}
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                          <Calendar className="h-3.5 w-3.5 text-slate-400" />
                          <span>
                            {voucher.voucher_month ? MONTH_NAMES[voucher.voucher_month] : '-'} {voucher.voucher_year || '-'}
                          </span>
                        </div>
                      </td>
                      <td className="table-cell">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-700">{voucher.requester_name}</span>
                          <span className="text-[11px] text-slate-400 font-medium">{voucher.requester_user_number}</span>
                        </div>
                      </td>
                      <td className="table-cell text-slate-500 font-medium">
                        {voucher.voucher_type_name}
                      </td>
                      <td className="table-cell font-bold text-slate-900 tabular-nums">
                        {voucher.amount ? `$${voucher.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '-'}
                      </td>
                      <td className="table-cell text-center">
                        <VoucherStatusBadge status={voucher.status} />
                      </td>
                      <td className="table-cell text-right">
                        <Link
                          to={`/vouchers/${voucher.id}`}
                          className="btn-ghost text-brand-600 hover:bg-brand-50 hover:text-brand-700 font-bold"
                        >
                          Details
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white py-20 px-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 mb-4">
              <FileText className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">No vouchers found</h3>
            <p className="mt-1 text-sm text-slate-500 max-w-xs">
              {searchTerm
                ? `We couldn't find any vouchers matching "${searchTerm}". Try a different search term.`
                : "It looks like there are no vouchers here yet. Click the 'New Voucher' button to get started."}
            </p>
            {searchTerm && (
               <button onClick={() => setSearchTerm('')} className="mt-6 btn-secondary">
                 Clear Search
               </button>
            )}
          </div>
        )}
      </div>
    </AppShell>
  )
}
