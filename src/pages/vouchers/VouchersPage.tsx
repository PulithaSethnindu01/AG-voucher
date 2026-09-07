import { Plus, Search, Filter, FileText, CheckCircle2, Clock, ListChecks, Calendar, Download, X, Loader2, Inbox, Send, User } from 'lucide-react'
import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { AppShell } from '../../components/layout/AppShell'
import { Alert } from '../../components/ui/Alert'
import { Spinner } from '../../components/ui/Spinner'
import { VoucherStatusBadge } from '../../components/vouchers/VoucherStatusBadge'
import { useAuth } from '../../context/AuthContext'
import { fetchVouchers, fetchVouchersForExport } from '../../services/voucherService'
import type { VoucherWithDetails } from '../../types/database'

const MONTH_NAMES = [
  '', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
]

type TabType = 'desk' | 'approved' | 'requested' | 'all'

export default function VouchersPage() {
  const { profile, hasRole } = useAuth()
  const isSupervisor = hasRole('SUPERVISOR')
  const isAdmin = hasRole('ADMIN')
  const isAdminOrSupervisor = isAdmin || isSupervisor

  const [vouchers, setVouchers] = useState<VoucherWithDetails[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState<TabType>('desk')

  // Export Modal State
  const [showExportModal, setShowExportModal] = useState(false)
  const [exportYear, setExportYear] = useState(new Date().getFullYear())
  const [exportMonth, setExportMonth] = useState<number | 'all'>('all')
  const [isExporting, setIsExporting] = useState(false)

  const loadVouchers = async () => {
    try {
      setIsLoading(true)
      const data = await fetchVouchers()
      setVouchers(data)
    } catch (err) {
      setError('වවුචර් පූරණය කිරීමට අසමත් විය.')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadVouchers()
  }, [])

  // Filter vouchers based on tab and search
  const filteredVouchers = useMemo(() => {
    let result = vouchers

    if (activeTab === 'desk') {
      result = vouchers.filter(v => v.current_officer_id === profile?.id && v.status === 'PENDING')
    } else if (activeTab === 'requested') {
      result = vouchers.filter(v => v.requester_id === profile?.id)
    } else if (activeTab === 'approved') {
      result = vouchers.filter(v => v.current_officer_id !== profile?.id || v.status === 'PAID')
    }

    return result.filter((v) =>
      v.voucher_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.requester_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.requester_user_number?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [vouchers, searchTerm, activeTab, profile?.id])

  const stats = useMemo(() => {
    return {
      total: vouchers.length,
      pending: vouchers.filter(v => v.status === 'PENDING').length,
      paid: vouchers.filter(v => v.status === 'PAID').length
    }
  }, [vouchers])

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const data = await fetchVouchersForExport(exportYear, exportMonth === 'all' ? undefined : exportMonth)
      if (data.length === 0) return alert('දත්ත නැත.')

      const headers = ['Voucher #', 'Year', 'Month', 'Requester', 'Amount', 'Status']
      const csv = [headers.join(','), ...data.map(v => [v.voucher_number, v.voucher_year, v.voucher_month, v.requester_name, v.amount, v.status].join(','))].join('\n')
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `report_${exportYear}.csv`
      a.click()
      setShowExportModal(false)
    } catch (err) {
      alert('අපනයනය අසාර්ථකයි.')
    } finally {
      setIsExporting(false)
    }
  }

  const tabs = [
    { id: 'desk', label: 'මගේ මේසය මත', icon: Inbox },
    ...(isAdminOrSupervisor ? [{ id: 'approved', label: 'මා අනුමත කළ', icon: Send }] : []),
    { id: 'requested', label: 'මගේ ඉල්ලීම්', icon: User },
    ...(isSupervisor ? [{ id: 'all', label: 'සියලුම', icon: ListChecks }] : []),
  ]

  // canCreate logic: Only Admins or Supervisors can create vouchers
  const canCreate = isAdminOrSupervisor

  return (
    <AppShell>
      <div className="space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Vouchers</h1>
            <p className="mt-1 text-sm font-medium text-slate-500">ගෙවීම් වවුචර කළමනාකරණය</p>
          </div>
          <div className="flex items-center gap-3">
            {isSupervisor && (
              <button onClick={() => setShowExportModal(true)} className="btn-secondary">
                <Download className="h-4 w-4" />
                Export
              </button>
            )}
            {canCreate && (
              <Link to="/vouchers/new" className="btn-primary">
                <Plus className="h-4 w-4" />
                නව වවුචරය
              </Link>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl w-fit">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                  activeTab === tab.id
                    ? 'bg-white text-brand-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            )
          })}
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative flex-1 group">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500" />
            <input
              type="text"
              placeholder="සොයන්න..."
              className="form-input pl-10 h-11"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex h-64 items-center justify-center"><Spinner /></div>
        ) : filteredVouchers.length > 0 ? (
          <div className="table-container shadow-xl shadow-slate-200/50">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100">
                <thead>
                  <tr>
                    <th className="table-header px-6 py-4">වවුචරය #</th>
                    <th className="table-header px-6 py-4">කාලය</th>
                    <th className="table-header px-6 py-4">ඉල්ලුම්කරු</th>
                    <th className="table-header px-6 py-4 text-center">තත්ත්වය</th>
                    <th className="table-header px-6 py-4 text-right">ක්‍රියා</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {filteredVouchers.map((voucher) => (
                    <tr key={voucher.id} className="table-row group">
                      <td className="table-cell font-bold text-slate-900">{voucher.voucher_number}</td>
                      <td className="table-cell text-slate-500 font-medium">
                        {voucher.voucher_month ? MONTH_NAMES[voucher.voucher_month] : '-'} {voucher.voucher_year}
                      </td>
                      <td className="table-cell">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-700">{voucher.requester_name}</span>
                          <span className="text-[11px] text-slate-400 font-bold uppercase">{voucher.requester_user_number}</span>
                        </div>
                      </td>
                      <td className="table-cell text-center"><VoucherStatusBadge status={voucher.status} /></td>
                      <td className="table-cell text-right">
                        <Link to={`/vouchers/${voucher.id}`} className="btn-ghost text-brand-600 font-bold">විස්තර</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 card border-dashed">
            <FileText className="h-10 w-10 text-slate-300 mb-4" />
            <h3 className="text-lg font-bold text-slate-900">දත්ත කිසිවක් නැත</h3>
          </div>
        )}

        {/* Export Modal */}
        {showExportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="card w-full max-w-md p-8 animate-in zoom-in-95 duration-300">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-black text-slate-900">දත්ත අපනයනය</h2>
                <button onClick={() => setShowExportModal(false)}><X className="h-5 w-5 text-slate-400" /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="form-label">වර්ෂය</label>
                  <input type="number" className="form-input" value={exportYear} onChange={e => setExportYear(parseInt(e.target.value))} />
                </div>
                <button onClick={handleExport} disabled={isExporting} className="btn-primary w-full h-12">
                  {isExporting ? <Loader2 className="animate-spin h-5 w-5" /> : 'බාගත කරන්න (CSV)'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
