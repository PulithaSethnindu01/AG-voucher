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
} from '../../services/voucherService'
import type { VoucherHistory, VoucherWithDetails } from '../../types/database'

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

      // Load officers if current user is the responsible officer and it's not at completion
      if (vData && vData.status === 'PENDING' && vData.current_officer_id === profile?.id) {
        if (vData.current_stage !== 'FINAL_PAYMENT') {
          // Load potential next approvers
          const approvers = await fetchActiveApprovers('SECOND_APPROVER')
          setAvailableApprovers(approvers.filter(a => a.id !== profile?.id))

          // Load potential payers
          const payers = await fetchActiveApprovers('FINAL_PAYMENT_OFFICER')
          setAvailablePayers(payers)
        }
      }
    } catch (err) {
      setError('Failed to load voucher details.')
      console.error(err)
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
      await loadData() // Reload
      setShowRejectionInput(false)
      setRejectionReason('')
      setSelectedApproverId('')
      setSelectedPayerId('')
    } catch (err: any) {
      setError(err.message || 'Action failed.')
    } finally {
      setIsActionLoading(false)
    }
  }

  if (isLoading) {
    return (
      <AppShell>
        <div className="flex h-96 items-center justify-center">
          <Spinner label="Loading voucher details..." />
        </div>
      </AppShell>
    )
  }

  if (!voucher) {
    return (
      <AppShell>
        <div className="mx-auto max-w-2xl">
          <Alert variant="error">Voucher not found.</Alert>
          <Link to="/" className="mt-4 btn-secondary">
            <ArrowLeft className="h-4 w-4" />
            Back to Vouchers
          </Link>
        </div>
      </AppShell>
    )
  }

  const isCurrentOfficer = voucher.current_officer_id === profile?.id
  const isPending = voucher.status === 'PENDING'

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Link
            to="/"
            className="btn-ghost -ml-2 text-slate-500"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Vouchers
          </Link>
          <div className="flex items-center gap-3">
             <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Status</span>
             <VoucherStatusBadge status={voucher.status} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-8">
            <div className="card overflow-hidden">
              <div className="bg-slate-50/50 border-b border-slate-100 px-6 py-4 flex items-center justify-between">
                 <div className="flex items-center gap-2">
                   <FileText className="h-5 w-5 text-slate-400" />
                   <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600">Voucher Information</h2>
                 </div>
                 <span className="text-xs font-mono font-bold text-slate-400">#{voucher.voucher_number}</span>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 gap-x-8 gap-y-8 sm:grid-cols-2">
                  <div className="space-y-1">
                    <dt className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400">
                       <Tag className="h-3 w-3" />
                       Voucher Type
                    </dt>
                    <dd className="text-sm font-bold text-slate-900">{voucher.voucher_type_name}</dd>
                  </div>

                  <div className="space-y-1">
                    <dt className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400">
                       <User className="h-3 w-3" />
                       Requester
                    </dt>
                    <dd className="flex flex-col">
                      <span className="text-sm font-bold text-slate-900">{voucher.requester_name}</span>
                      <span className="text-xs font-medium text-slate-500">{voucher.requester_user_number}</span>
                    </dd>
                  </div>

                  <div className="space-y-1">
                    <dt className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400">
                       <DollarSign className="h-3 w-3" />
                       Amount
                    </dt>
                    <dd className="text-2xl font-black text-slate-900 tabular-nums">
                      {voucher.amount ? `$${voucher.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : 'Not set'}
                    </dd>
                  </div>

                  <div className="space-y-1">
                    <dt className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400">
                       <Clock className="h-3 w-3" />
                       Created On
                    </dt>
                    <dd className="text-sm font-bold text-slate-900">
                      {new Date(voucher.created_at).toLocaleDateString(undefined, { dateStyle: 'long' })}
                    </dd>
                  </div>

                  <div className="sm:col-span-2 space-y-2">
                    <dt className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400">
                       <Activity className="h-3 w-3" />
                       Description
                    </dt>
                    <dd className="rounded-xl bg-slate-50 p-4 text-sm font-medium leading-relaxed text-slate-600 border border-slate-100 italic">
                      {voucher.description || 'No detailed description provided for this voucher.'}
                    </dd>
                  </div>
                </div>
              </div>
            </div>

            {/* History */}
            <div className="card overflow-hidden">
               <div className="bg-slate-50/50 border-b border-slate-100 px-6 py-4 flex items-center gap-2">
                 <History className="h-5 w-5 text-slate-400" />
                 <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600">Workflow Timeline</h2>
              </div>
              <div className="p-6">
                <div className="flow-root">
                  <ul className="-mb-8">
                    {history.map((item, idx) => (
                      <li key={item.id}>
                        <div className="relative pb-8">
                          {idx !== history.length - 1 && (
                            <span className="absolute left-5 top-5 -ml-px h-full w-0.5 bg-slate-100" aria-hidden="true" />
                          )}
                          <div className="relative flex items-start space-x-4">
                            <div className="relative">
                              <span className={`flex h-10 w-10 items-center justify-center rounded-full ring-8 ring-white ${
                                item.action === 'REJECTED' ? 'bg-red-50 text-red-600' :
                                item.action === 'PAID' ? 'bg-emerald-50 text-emerald-600' :
                                'bg-slate-50 text-slate-400'
                              }`}>
                                <Clock className="h-5 w-5" />
                              </span>
                            </div>
                            <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1">
                              <div>
                                <p className="text-sm font-bold text-slate-900">
                                  {item.action.replace(/_/g, ' ')}
                                </p>
                                <div className="mt-1 flex items-center gap-2 text-xs font-medium text-slate-500">
                                  <span>By {item.actor?.name || 'System'}</span>
                                  <span>•</span>
                                  <span>{new Date(item.created_at).toLocaleString()}</span>
                                </div>
                                {item.notes && (
                                  <p className="mt-2 text-xs font-medium text-slate-500 bg-slate-50 rounded-lg p-2 border border-slate-100">
                                    {item.notes}
                                  </p>
                                )}
                                {item.rejection_reason && (
                                  <p className="mt-2 text-xs font-bold text-red-600 bg-red-50 rounded-lg p-2 border border-red-100">
                                    Reason: {item.rejection_reason}
                                  </p>
                                )}
                                {item.assigned_to && (
                                  <div className="mt-2 flex items-center gap-2">
                                     <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Assigned To:</span>
                                     <span className="text-xs font-bold text-slate-700">{item.assigned_to.name}</span>
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

          {/* Sidebar / Actions */}
          <div className="space-y-6">
            <div className="card p-6 bg-slate-900 text-white shadow-xl shadow-slate-200">
              <h2 className="mb-6 text-xs font-black uppercase tracking-[0.2em] text-slate-400">Live Status</h2>
              <div className="space-y-6">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Current Stage</p>
                  <p className="text-lg font-black tracking-tight">{voucher.current_stage.replace(/_/g, ' ')}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Pending With</p>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-brand-500 animate-pulse" />
                    <p className="text-sm font-bold">{voucher.current_officer_name || 'Unassigned'}</p>
                  </div>
                </div>
              </div>

              {isPending && isCurrentOfficer && (
                <div className="mt-8 space-y-6 border-t border-slate-800 pt-8">
                  {error && <Alert variant="error">{error}</Alert>}

                  {/* Flexible Approval Chain */}
                  {voucher.current_stage !== 'FINAL_PAYMENT' && (
                    <div className="space-y-6">
                      {/* Option 1: Forward to next person */}
                      <div className="space-y-3">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Forward to Next Approver</label>
                        {availableApprovers.length > 0 ? (
                          <select
                            className="form-input bg-slate-800 border-slate-700 text-white focus:ring-brand-500/20"
                            value={selectedApproverId}
                            onChange={(e) => setSelectedApproverId(e.target.value)}
                          >
                            <option value="">Select officer...</option>
                            {availableApprovers.map(a => (
                              <option key={a.id} value={a.id} className="text-slate-900">
                                {a.name} ({a.user_number})
                              </option>
                            ))}
                          </select>
                        ) : (
                          <p className="text-xs font-bold text-amber-500 italic">No other eligible approvers available</p>
                        )}
                        <button
                          className="btn-secondary w-full justify-center bg-white text-slate-900 border-transparent hover:bg-slate-100"
                          disabled={isActionLoading || !selectedApproverId || availableApprovers.length === 0}
                          onClick={() => handleAction(() => approveAndForward(voucher.id, selectedApproverId))}
                        >
                          {isActionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                          Approve & Forward
                        </button>
                      </div>

                      <div className="relative">
                        <div className="absolute inset-0 flex items-center" aria-hidden="true">
                          <div className="w-full border-t border-slate-800"></div>
                        </div>
                        <div className="relative flex justify-center text-[10px] font-black uppercase">
                          <span className="bg-slate-900 px-2 text-slate-600">OR</span>
                        </div>
                      </div>

                      {/* Option 2: Final approval to payment */}
                      <div className="space-y-3">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Assign Paying Officer</label>
                        {availablePayers.length > 0 ? (
                          <select
                            className="form-input bg-slate-800 border-slate-700 text-white focus:ring-brand-500/20"
                            value={selectedPayerId}
                            onChange={(e) => setSelectedPayerId(e.target.value)}
                          >
                            <option value="">Select payer...</option>
                            {availablePayers.map(p => (
                              <option key={p.id} value={p.id} className="text-slate-900">
                                {p.name} ({p.user_number})
                              </option>
                            ))}
                          </select>
                        ) : (
                          <p className="text-xs font-bold text-amber-500 italic">No eligible paying officers found</p>
                        )}
                        <button
                          className="btn-primary w-full justify-center shadow-lg shadow-brand-900/20"
                          disabled={isActionLoading || !selectedPayerId || availablePayers.length === 0}
                          onClick={() => handleAction(() => approveToPayment(voucher.id, selectedPayerId))}
                        >
                          {isActionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                          Send to Final Payment
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Payment stage */}
                  {voucher.current_stage === 'FINAL_PAYMENT' && (
                    <div className="space-y-4">
                       <input
                        type="number"
                        placeholder="Confirm Amount"
                        className="form-input bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                      />
                      <input
                        type="text"
                        placeholder="Payment Reference"
                        className="form-input bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                        value={paymentRef}
                        onChange={(e) => setPaymentRef(e.target.value)}
                      />
                      <button
                        className="btn-primary w-full justify-center bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-900/20"
                        disabled={isActionLoading || !paymentAmount || !paymentRef}
                        onClick={() => handleAction(() => markPaid(voucher.id, parseFloat(paymentAmount), paymentRef))}
                      >
                        <CreditCard className="h-4 w-4" />
                        Complete Payment
                      </button>
                    </div>
                  )}

                  {/* Rejection */}
                  {!showRejectionInput ? (
                    <button
                      className="btn-ghost w-full justify-center text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                      onClick={() => setShowRejectionInput(true)}
                    >
                      <XCircle className="h-4 w-4" />
                      Reject Voucher
                    </button>
                  ) : (
                    <div className="space-y-3 border-t border-slate-800 pt-6">
                      <textarea
                        className="form-input bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                        placeholder="Reason for rejection..."
                        rows={3}
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                      />
                      <div className="flex gap-2">
                        <button
                          className="btn-danger flex-1"
                          disabled={isActionLoading || !rejectionReason.trim()}
                          onClick={() => handleAction(() => rejectVoucher(voucher.id, rejectionReason))}
                        >
                          Confirm
                        </button>
                        <button
                          className="btn-ghost flex-1 text-slate-400 hover:text-white"
                          onClick={() => setShowRejectionInput(false)}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {voucher.status === 'REJECTED' && isCurrentOfficer && (
                <div className="mt-8 border-t border-slate-800 pt-8">
                  <button
                    className="btn-primary w-full justify-center shadow-lg shadow-brand-900/20"
                    disabled={isActionLoading}
                    onClick={() => handleAction(() => resubmitVoucher(voucher.id))}
                  >
                    <RotateCcw className="h-4 w-4" />
                    Resubmit for Approval
                  </button>
                </div>
              )}
            </div>

            {/* Help / Info Card */}
            <div className="card p-6 border-dashed bg-slate-50/50">
               <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Workflow Help</h3>
               <p className="text-xs leading-relaxed text-slate-400">
                 As an authorized officer, you can either forward this request to another approver for additional verification, or send it directly to the Final Payment stage if all criteria are met.
               </p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
