import { Plus, Search, FileText, CheckCircle2, Clock, ListChecks, Download, X, Loader2, Inbox, User } from 'lucide-react'
import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { AppShell } from '../../components/layout/AppShell'
import { Spinner } from '../../components/ui/Spinner'
import { VoucherStatusBadge } from '../../components/vouchers/VoucherStatusBadge'
import { useAuth } from '../../context/AuthContext'
import { fetchVouchers, fetchVouchersForExport } from '../../services/voucherService'
import type { VoucherWithDetails } from '../../types/database'

const MONTH_NAMES = [
  '', 'ජනවාරි', 'පෙබරවාරි', 'මාර්තු', 'අප්‍රේල්', 'මැයි', 'ජුනි',
  'ජුලි', 'අගෝස්තු', 'සැප්තැම්බර්', 'ඔක්තෝබර්', 'නොවැම්බර්', 'දෙසැම්බර්'
]

const MONTH_NAMES_EN = [
  '', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
]

type TabType = 'my' | 'all'

export default function VouchersPage() {
  const { profile, hasRole } = useAuth()
  const isSupervisor = hasRole('SUPERVISOR')
  const isAdmin = hasRole('ADMIN')
  const isAdminOrSupervisor = isAdmin || isSupervisor

  const [vouchers, setVouchers] = useState<VoucherWithDetails[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState<TabType>('my')

  const [showExportModal, setShowExportModal] = useState(false)
  const [exportYear, setExportYear] = useState(new Date().getFullYear())
  const [exportMonth, setExportMonth] = useState<number | 'all'>('all')
  const [isExporting, setIsExporting] = useState(false)

  const loadVouchers = async () => {
    try {
      setIsLoading(true)
      const data = await fetchVouchers()
      setVouchers(data)
    } catch {
      setError('වවුචර් පූරණය කිරීමට අසමත් විය.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadVouchers()
  }, [])

  const filteredVouchers = useMemo(() => {
    let result = vouchers

    // Non-Supervisors only see vouchers they are involved in (handled by RLS)
    // We just provide an additional filter if the supervisor wants to see ONLY their own
    if (isSupervisor && activeTab === 'my') {
      result = vouchers.filter(v => v.requester_id === profile?.id || v.current_officer_id === profile?.id)
    }

    return result.filter((v) =>
      (v.voucher_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (v.requester_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (v.requester_user_number || '').toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [vouchers, searchTerm, activeTab, isSupervisor, profile?.id])

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
      if (data.length === 0) return alert('තෝරාගත් කාල සීමාව සඳහා දත්ත කිසිවක් නැත.')
      const headers = ['Voucher #', 'Year', 'Month', 'Requester', 'User Number', 'Type', 'Amount', 'Status', 'Stage', 'Created At']
      const csv = [headers.join(','), ...data.map(v => [v.voucher_number, v.voucher_year, v.voucher_month ? MONTH_NAMES_EN[v.voucher_month] : '-', `"${v.requester_name}"`, v.requester_user_number, v.voucher_type_name, v.amount || 0, v.status, v.current_stage, new Date(v.created_at).toLocaleDateString()].join(','))].join('\n')
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `vouchers_report_${exportYear}.csv`
      link.click()
      setShowExportModal(false)
    } catch {
      alert('බාගත කරගැනීම අසාර්ථකයි.')
    } finally {
      setIsExporting(false)
    }
  }

  const years = []
  for (let y = new Date().getFullYear(); y >= 2024; y--) { years.push(y) }

  return (
    <AppShell>
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900">වවුචර් පුවරුව</h1>
            <p className="mt-1 text-sm font-medium text-slate-500">ගෙවීම් වවුචර කළමනාකරණය සහ නිරීක්ෂණය</p>
          </div>
          <div className="flex items-center gap-3">
            {isSupervisor && (
              <button onClick={() => setShowExportModal(true)} className="btn-secondary h-11 px-6">
                <Download className="h-4 w-4" />
                දත්ත බාගත කරගැනීම
              </button>
            )}
            {isAdminOrSupervisor && (
              <Link to="/vouchers/new" className="btn-primary h-11 px-6 shadow-lg shadow-brand-200">
                <Plus className="h-4 w-4" />
                නව වවුචරය
              </Link>
            )}
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="card p-6 flex items-center gap-4 bg-white shadow-sm border-slate-100">
            <div className="h-12 w-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-sm"><ListChecks className="h-6 w-6" /></div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">මුළු වවුචර්</p>
              <p className="text-2xl font-black text-slate-900 tabular-nums">{stats.total}</p>
            </div>
          </div>
          <div className="card p-6 flex items-center gap-4 bg-white shadow-sm border-slate-100">
            <div className="h-12 w-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shadow-sm"><Clock className="h-6 w-6" /></div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">අනුමැතියට ඇති</p>
              <p className="text-2xl font-black text-slate-900 tabular-nums">{stats.pending}</p>
            </div>
          </div>
          <div className="card p-6 flex items-center gap-4 bg-white shadow-sm border-slate-100">
            <div className="h-12 w-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-sm"><CheckCircle2 className="h-6 w-6" /></div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">ගෙවා ඇති</p>
              <p className="text-2xl font-black text-slate-900 tabular-nums">{stats.paid}</p>
            </div>
          </div>
        </div>

        {isSupervisor && (
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl w-fit">
            <button onClick={() => setActiveTab('my')} className={`flex items-center gap-2 px-6 py-2 rounded-lg text-xs font-bold uppercase transition-all ${activeTab === 'my' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500'}`}><User className="h-3.5 w-3.5" />මගේ වවුචර්</button>
            <button onClick={() => setActiveTab('all')} className={`flex items-center gap-2 px-6 py-2 rounded-lg text-xs font-bold uppercase transition-all ${activeTab === 'all' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500'}`}><Inbox className="h-3.5 w-3.5" />සියලුම</button>
          </div>
        )}

        <div className="relative group flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-brand-500" />
          <input type="text" placeholder="වවුචර් අංකය හෝ නම සොයන්න..." className="form-input pl-10 h-12 text-base shadow-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>

        {isLoading ? (
          <div className="flex h-96 items-center justify-center card border-dashed"><Spinner label="පූරණය වෙමින්..." /></div>
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
                      <td className="table-cell font-bold text-slate-900 tabular-nums">{voucher.voucher_number}</td>
                      <td className="table-cell text-slate-500 font-bold">{voucher.voucher_month ? MONTH_NAMES[voucher.voucher_month] : '-'} {voucher.voucher_year}</td>
                      <td className="table-cell">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-700">{voucher.requester_name}</span>
                          <span className="text-[10px] text-brand-600 font-black uppercase">{voucher.requester_user_number}</span>
                        </div>
                      </td>
                      <td className="table-cell text-center"><VoucherStatusBadge status={voucher.status} /></td>
                      <td className="table-cell text-right">
                        <Link to={`/vouchers/${voucher.id}`} className="btn-ghost text-brand-600 font-black px-6">විස්තර</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 card border-dashed border-2">
            <FileText className="h-16 w-16 text-slate-200 mb-6" />
            <h3 className="text-xl font-black text-slate-900">දත්ත කිසිවක් නැත</h3>
            <p className="mt-2 text-sm text-slate-400 font-medium">ඔබට අදාළ කිසිදු වවුචරයක් මෙම ලැයිස්තුවේ නොමැත.</p>
          </div>
        )}

        {showExportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="card w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <h2 className="text-lg font-black text-slate-900">වාර්තා බාගත කරගැනීම</h2>
                <button onClick={() => setShowExportModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><X className="h-6 w-6" /></button>
              </div>
              <div className="p-8 space-y-6">
                <div className="space-y-4">
                  <div><label className="form-label">වර්ෂය</label><select className="form-input h-12 font-bold" value={exportYear} onChange={e => setExportYear(parseInt(e.target.value))}>{years.map(y => <option key={y} value={y}>{y}</option>)}</select></div>
                  <div><label className="form-label">මාසය</label><select className="form-input h-12 font-bold" value={exportMonth} onChange={e => setExportMonth(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}><option value="all">සියලුම මාස</option>{MONTH_NAMES.map((m, i) => m ? <option key={i} value={i}>{m}</option> : null)}</select></div>
                </div>
                <button onClick={handleExport} disabled={isExporting} className="btn-primary w-full h-12 text-base font-black uppercase tracking-wider">{isExporting ? <Loader2 className="animate-spin h-5 w-5" /> : 'බාගත කරන්න (CSV)'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
