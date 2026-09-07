import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  CreditCard,
  History,
  Loader2,
  RotateCcw,
  Send,
  XCircle,
  FileText,
  User,
  Tag,
  DollarSign,
  Activity,
  Calendar,
  ThumbsUp,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AppShell } from '../../components/layout/AppShell'
import { Alert } from '../../components/ui/Alert'
import { Spinner } from '../../components/ui/Spinner'
import { VoucherStatusBadge } from '../../components/vouchers/VoucherStatusBadge'
import { useAuth } from '../../context/AuthContext'
import {
  fetchActiveApprovers,
  fetchVoucherById,
  fetchVoucherHistory,
  approveAndForward,
  approveToPayment,
  markPaid,
  rejectVoucher,
  resubmitVoucher,
  confirmReceipt,
} from '../../services/voucherService'
import type { VoucherHistory, VoucherWithDetails } from '../../types/database'

const MONTH_NAMES = [
  '', 'ජනවාරි', 'පෙබරවාරි', 'මාර්තු', 'අප්‍රේල්', 'මැයි', 'ජුනි',
  'ජුලි', 'අගෝස්තු', 'සැප්තැම්බර්', 'ඔක්තෝබර්', 'නොවැම්බර්', 'දෙසැම්බර්'
]

const STAGE_LABELS: Record<string, string> = {
  FIRST_APPROVAL: 'පළමු අනුමැතිය',
  SECOND_APPROVAL: 'දෙවන අනුමැතිය',
  THIRD_APPROVAL: 'තෙවන අනුමැතිය',
  FOURTH_APPROVAL: 'හතරවන අනුමැතිය',
  FIFTH_APPROVAL: 'පස්වන අනුමැතිය',
  FINAL_PAYMENT: 'අවසාන ගෙවීම',
  COMPLETED: 'සම්පූර්ණයි',
}

const ACTION_LABELS: Record<string, string> = {
  CREATED: 'නිර්මාණය කරන ලදී',
  APPROVED_AND_FORWARDED: 'අනුමත කර ඉදිරියට යොමු කරන ලදී',
  FINAL_APPROVED: 'අවසාන අනුමැතිය ලබා දෙන ලදී',
  PAID: 'ගෙවීම් සම්පූර්ණ කරන ලදී',
  REJECTED: 'ප්‍රතික්ෂේප කරන ලදී',
  RESUBMITTED: 'නැවත ඉදිරිපත් කරන ලදී',
  RECEIVED: 'ලැබුණු බව තහවුරු කරන ලදී',
}

const PREVIOUS_STAGE: Record<string, string> = {
  SECOND_APPROVAL: 'FIRST_APPROVAL',
  THIRD_APPROVAL: 'SECOND_APPROVAL',
  FOURTH_APPROVAL: 'THIRD_APPROVAL',
  FIFTH_APPROVAL: 'FOURTH_APPROVAL',
  FINAL_PAYMENT: 'FIFTH_APPROVAL',
}

export default function VoucherDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { profile } = useAuth()

  const [voucher, setVoucher] = useState<VoucherWithDetails | null>(null)
  const [history, setHistory] = useState<(VoucherHistory & { actor: any; assigned_to: any })[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isActionLoading, setIsActionLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Action states
  const [rejectionReason, setRejectionReason] = useState('')
  const [showRejectionInput, setShowRejectionInput] = useState(false)

  const [selectedApproverId, setSelectedApproverId] = useState('')
  const [availableApprovers, setAvailableApprovers] = useState<{ id: string; name: string; user_number: string }[]>([])

  const [selectedPayerId, setSelectedPayerId] = useState('')
  const [availablePayers, setAvailablePayers] = useState<{ id: string; name: string; user_number: string }[]>([])

  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentRef, setPaymentRef] = useState('')

  const loadData = async () => {
    if (!id) return
    try {
      setIsLoading(true)
      const [vData, hData] = await Promise.all([
        fetchVoucherById(id),
        fetchVoucherHistory(id)
      ])
      setVoucher(vData)
      setHistory(hData)

      if (vData && vData.status === 'PENDING' && vData.current_officer_id === profile?.id && vData.is_received) {
        if (vData.current_stage !== 'FINAL_PAYMENT' && vData.current_stage !== 'FIFTH_APPROVAL') {
           const approvers = await fetchActiveApprovers()
           setAvailableApprovers(approvers.filter(a => a.id !== profile?.id))
        }

        if (vData.current_stage !== 'FINAL_PAYMENT') {
           const payers = await fetchActiveApprovers('FINAL_PAYMENT_OFFICER')
           setAvailablePayers(payers)
        }
      }
    } catch (err) {
      setError('වවුචර් විස්තර පූරණය කිරීමට අසමත් විය.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [id, profile?.id])

  const handleAction = async (actionFn: () => Promise<void>) => {
    setError(null)
    setIsActionLoading(true)
    try {
      await actionFn()
      await loadData()
      setShowRejectionInput(false)
      setRejectionReason('')
      setSelectedApproverId('')
      setSelectedPayerId('')
    } catch (err: any) {
      setError(err.message || 'ක්‍රියාව අසාර්ථකයි.')
    } finally {
      setIsActionLoading(false)
    }
  }

  if (isLoading) {
    return (
      <AppShell>
        <div className="flex h-96 items-center justify-center">
          <Spinner label="විස්තර පූරණය වෙමින්..." />
        </div>
      </AppShell>
    )
  }

  if (!voucher) {
    return (
      <AppShell>
        <div className="mx-auto max-w-2xl">
          <Alert variant="error">වවුචරය හමු නොවීය.</Alert>
          <Link to="/" className="mt-4 btn-secondary">
            <ArrowLeft className="h-4 w-4" />
            නැවත වවුචර් ලැයිස්තුවට
          </Link>
        </div>
      </AppShell>
    )
  }

  const isCurrentOfficer = voucher.current_officer_id === profile?.id
  const isPending = voucher.status === 'PENDING'

  const getDisplayStage = () => {
    if (isPending && !voucher.is_received) {
      const prevStageKey = PREVIOUS_STAGE[voucher.current_stage]
      if (prevStageKey) {
        return `${STAGE_LABELS[prevStageKey]} (යොමු කරමින්...)`
      }
    }
    return STAGE_LABELS[voucher.current_stage]
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-8 animate-in fade-in duration-500">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Link to="/" className="btn-ghost -ml-2 text-slate-500">
            <ArrowLeft className="h-4 w-4" />
            නැවත පුවරුවට
          </Link>
          <div className="flex items-center gap-3">
             <span className="text-xs font-bold uppercase tracking-widest text-slate-400">තත්ත්වය</span>
             <VoucherStatusBadge status={voucher.status} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-8">
            <div className="card overflow-hidden shadow-xl shadow-slate-200/50">
              <div className="bg-slate-50/50 border-b border-slate-100 px-6 py-4 flex items-center justify-between">
                 <div className="flex items-center gap-2">
                   <FileText className="h-5 w-5 text-slate-400" />
                   <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600">වවුචර් තොරතුරු</h2>
                 </div>
                 <span className="text-xs font-mono font-bold text-slate-400">#{voucher.voucher_number}</span>
              </div>

              <div className="p-8">
                <div className="grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <dt className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
                       <Tag className="h-3.5 w-3.5" />
                       වවුචර් වර්ගය
                    </dt>
                    <dd className="text-sm font-black text-slate-900">{voucher.voucher_type_name}</dd>
                  </div>

                  <div className="space-y-1.5">
                    <dt className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
                       <User className="h-3.5 w-3.5" />
                       අයදුම්කරු
                    </dt>
                    <dd className="flex flex-col">
                      <span className="text-sm font-black text-slate-900">{voucher.requester_name}</span>
                      <span className="text-xs font-bold text-brand-600 uppercase tracking-wider">{voucher.requester_user_number}</span>
                    </dd>
                  </div>

                  <div className="space-y-1.5">
                    <dt className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
                       <Calendar className="h-3.5 w-3.5" />
                       වවුචර් කාල සීමාව
                    </dt>
                    <dd className="text-sm font-black text-slate-900">
                      {voucher.voucher_month ? MONTH_NAMES[voucher.voucher_month] : '-'} {voucher.voucher_year || '-'}
                    </dd>
                  </div>

                  <div className="space-y-1.5">
                    <dt className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
                       <Clock className="h-3.5 w-3.5" />
                       නිර්මාණය කළ දිනය
                    </dt>
                    <dd className="text-sm font-black text-slate-900">
                      {new Date(voucher.created_at).toLocaleDateString(undefined, { dateStyle: 'long' })}
                    </dd>
                  </div>

                  <div className="sm:col-span-2 space-y-2.5">
                    <dt className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
                       <Activity className="h-3.5 w-3.5" />
                       විස්තරය
                    </dt>
                    <dd className="rounded-2xl bg-slate-50 p-5 text-sm font-medium leading-relaxed text-slate-600 border border-slate-100 italic shadow-inner">
                      {voucher.description || 'විස්තරයක් සපයා නැත.'}
                    </dd>
                  </div>
                </div>
              </div>
            </div>

            <div className="card overflow-hidden shadow-lg shadow-slate-200/50">
               <div className="bg-slate-50/50 border-b border-slate-100 px-6 py-4 flex items-center gap-2">
                 <History className="h-5 w-5 text-slate-400" />
                 <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600">කාර්ය ප්‍රවාහ කාලරේඛාව</h2>
              </div>
              <div className="p-8">
                <div className="flow-root">
                  <ul className="-mb-8">
                    {history.map((item, idx) => (
                      <li key={item.id}>
                        <div className="relative pb-10">
                          {idx !== history.length - 1 && (
                            <span className="absolute left-5 top-5 -ml-px h-full w-0.5 bg-slate-100" aria-hidden="true" />
                          )}
                          <div className="relative flex items-start space-x-4">
                            <div className="relative">
                              <span className={`flex h-10 w-10 items-center justify-center rounded-full ring-8 ring-white shadow-sm ${
                                item.action === 'REJECTED' ? 'bg-red-50 text-red-600' :
                                item.action === 'PAID' ? 'bg-emerald-50 text-emerald-600' :
                                item.action === 'RECEIVED' ? 'bg-blue-50 text-blue-600' :
                                'bg-slate-100 text-slate-500'
                              }`}>
                                <Clock className="h-5 w-5" />
                              </span>
                            </div>
                            <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1">
                              <div>
                                <p className="text-sm font-black text-slate-900">
                                  {ACTION_LABELS[item.action] || item.action.replace(/_/g, ' ')}
                                </p>
                                <div className="mt-1 flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-tight">
                                  <span>{item.actor?.name || 'පද්ධතිය'}</span>
                                  <span>•</span>
                                  <span>{new Date(item.created_at).toLocaleString()}</span>
                                </div>
                                {item.rejection_reason && (
                                  <p className="mt-3 text-xs font-bold text-red-600 bg-red-50 rounded-xl p-3 border border-red-100 animate-in slide-in-from-left-2">
                                    හේතුව: {item.rejection_reason}
                                  </p>
                                )}
                                {item.assigned_to && (
                                  <div className="mt-3 flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-1.5 w-fit border border-slate-100">
                                     <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">පවරන ලද්දේ:</span>
                                     <span className="text-xs font-black text-slate-700">{item.assigned_to.name}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="card p-8 bg-slate-900 text-white shadow-2xl shadow-slate-300">
              <h2 className="mb-8 text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">සජීවී තත්ත්වය</h2>
              <div className="space-y-8">
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">වත්මන් අදියර</p>
                  <p className="text-xl font-black tracking-tight text-white">{getDisplayStage()}</p>
                </div>
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">භාරව සිටින නිලධාරියා</p>
                  <div className="flex items-center gap-3">
                    <div className="h-2.5 w-2.5 rounded-full bg-brand-500 animate-pulse shadow-[0_0_12px_rgba(59,130,246,0.5)]" />
                    <p className="text-base font-bold text-slate-200">{voucher.current_officer_name || 'තවම පවරා නැත'}</p>
                  </div>
                </div>
              </div>

              {isPending && isCurrentOfficer && (
                <div className="mt-10 space-y-6 border-t border-slate-800 pt-10">
                  {error && <Alert variant="error">{error}</Alert>}

                  {!voucher.is_received ? (
                    <div className="space-y-4 animate-in fade-in duration-500">
                       <p className="text-xs font-bold text-slate-400 italic leading-relaxed text-balance">
                         ඔබට මෙම වවුචරය ලැබී ඇත. ක්‍රියාමාර්ග ගැනීමට කරුණාකර ලැබුණු බව තහවුරු කරන්න.
                       </p>
                       <button
                        className="btn-primary w-full h-12 text-base font-black shadow-lg shadow-brand-900/50"
                        disabled={isActionLoading}
                        onClick={() => handleAction(() => confirmReceipt(voucher.id))}
                      >
                        {isActionLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ThumbsUp className="h-5 w-5" />}
                        ලැබුණු බව තහවුරු කරන්න
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-500">
                      {voucher.current_stage !== 'FINAL_PAYMENT' && (
                        <div className="space-y-8">
                          {voucher.current_stage !== 'FIFTH_APPROVAL' && (
                            <div className="space-y-4">
                              <label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500">ඊළඟ අනුමත කරන්නා වෙත යොමු කරන්න</label>
                              <select
                                className="form-input h-12 bg-slate-800 border-slate-700 text-white focus:ring-brand-500/20 font-bold"
                                value={selectedApproverId}
                                onChange={(e) => setSelectedApproverId(e.target.value)}
                              >
                                <option value="" className="text-slate-900">නිලධාරියා තෝරන්න...</option>
                                {availableApprovers.map(a => (
                                  <option key={a.id} value={a.id} className="text-slate-900">
                                    {a.name} ({a.user_number})
                                  </option>
                                ))}
                              </select>
                              <button
                                className="btn-secondary w-full h-12 bg-white text-slate-900 border-transparent hover:bg-slate-100 font-black text-sm"
                                disabled={isActionLoading || !selectedApproverId}
                                onClick={() => handleAction(() => approveAndForward(voucher.id, selectedApproverId))}
                              >
                                {isActionLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-4 w-4" />}
                                ඉදිරියට යවන්න
                              </button>
                            </div>
                          )}

                          <div className="relative">
                            <div className="absolute inset-0 flex items-center" aria-hidden="true">
                              <div className="w-full border-t border-slate-800"></div>
                            </div>
                            <div className="relative flex justify-center text-[10px] font-black uppercase">
                              <span className="bg-slate-900 px-3 text-slate-600 tracking-[0.2em]">හෝ (OR)</span>
                            </div>
                          </div>

                          <div className="space-y-4">
                            <label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500">ගෙවීම් සඳහා සරප් නිලධාරියා තෝරන්න</label>
                            <select
                              className="form-input h-12 bg-slate-800 border-slate-700 text-white focus:ring-brand-500/20 font-bold"
                              value={selectedPayerId}
                              onChange={(e) => setSelectedPayerId(e.target.value)}
                            >
                              <option value="" className="text-slate-900">තෝරන්න...</option>
                              {availablePayers.map(p => (
                                <option key={p.id} value={p.id} className="text-slate-900">
                                  {p.name} ({p.user_number})
                                </option>
                              ))}
                            </select>
                            <button
                              className="btn-primary w-full h-12 shadow-lg shadow-brand-900/50 font-black text-sm"
                              disabled={isActionLoading || !selectedPayerId}
                              onClick={() => handleAction(() => approveToPayment(voucher.id, selectedPayerId))}
                            >
                              {isActionLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                              අවසාන ගෙවීමට යවන්න
                            </button>
                          </div>
                        </div>
                      )}

                      {voucher.current_stage === 'FINAL_PAYMENT' && (
                        <div className="space-y-5">
                           <div className="space-y-1.5">
                              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">අනුමත මුදල</label>
                              <input
                                type="number"
                                placeholder="මුදල තහවුරු කරන්න"
                                className="form-input h-12 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 font-bold text-lg"
                                value={paymentAmount}
                                onChange={(e) => setPaymentAmount(e.target.value)}
                              />
                           </div>
                           <div className="space-y-1.5">
                              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">ගෙවීම් අංකය (Reference)</label>
                              <input
                                type="text"
                                placeholder="Ref Number"
                                className="form-input h-12 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 font-bold"
                                value={paymentRef}
                                onChange={(e) => setPaymentRef(e.target.value)}
                              />
                           </div>
                          <button
                            className="btn-primary w-full h-12 bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-900/30 font-black text-base mt-2"
                            disabled={isActionLoading || !paymentAmount || !paymentRef}
                            onClick={() => handleAction(() => markPaid(voucher.id, parseFloat(paymentAmount), paymentRef))}
                          >
                            <CreditCard className="h-5 w-5" />
                            ගෙවීම සම්පූර්ණ කරන්න
                          </button>
                        </div>
                      )}

                      <div className="pt-4 border-t border-slate-800">
                        {!showRejectionInput ? (
                          <button
                            className="btn-ghost w-full h-10 text-slate-500 hover:text-red-400 hover:bg-red-500/10 font-bold text-xs"
                            onClick={() => setShowRejectionInput(true)}
                          >
                            <XCircle className="h-4 w-4" />
                            වවුචරය ප්‍රතික්ෂේප කරන්න
                          </button>
                        ) : (
                          <div className="space-y-4 animate-in slide-in-from-top-2">
                            <textarea
                              className="form-input bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 text-sm py-3"
                              placeholder="ප්‍රතික්ෂේප කිරීමට හේතුව..."
                              rows={3}
                              value={rejectionReason}
                              onChange={(e) => setRejectionReason(e.target.value)}
                            />
                            <div className="flex gap-3">
                              <button
                                className="btn-danger flex-1 h-11 font-black text-xs"
                                disabled={isActionLoading || !rejectionReason.trim()}
                                onClick={() => handleAction(() => rejectVoucher(voucher.id, rejectionReason))}
                              >
                                තහවුරු කරන්න
                              </button>
                              <button
                                className="btn-ghost flex-1 h-11 text-slate-400 hover:text-white font-bold text-xs"
                                onClick={() => setShowRejectionInput(false)}
                              >
                                අවලංගු කරන්න
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {voucher.status === 'REJECTED' && isCurrentOfficer && (
                <div className="mt-10 border-t border-slate-800 pt-10">
                  <button
                    className="btn-primary w-full h-12 shadow-lg shadow-brand-900/50 font-black text-base"
                    disabled={isActionLoading}
                    onClick={() => handleAction(() => resubmitVoucher(voucher.id))}
                  >
                    <RotateCcw className="h-5 w-5" />
                    නැවත ඉදිරිපත් කරන්න
                  </button>
                </div>
              )}
            </div>

            <div className="card p-8 border-dashed bg-slate-50/50 border-slate-200">
               <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">කාර්ය ප්‍රවාහ උපදෙස්</h3>
               <p className="text-xs leading-relaxed text-slate-400 font-medium text-balance">
                 බලයලත් නිලධාරියෙකු ලෙස, ඔබට එය අනුමත කිරීමට, ඉදිරියට යැවීමට හෝ සැකසීමට පෙර වවුචරය භෞතිකව හෝ ඩිජිටල් ලෙස ලැබුණු බව පළමුව තහවුරු කළ යුතුය.
               </p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
