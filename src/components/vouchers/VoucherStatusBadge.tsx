import type { VoucherStatus } from '../../types/database'
import { Badge } from '../ui/Badge'
import { Circle, CheckCircle2, XCircle, Clock } from 'lucide-react'

export function VoucherStatusBadge({ status }: { status: VoucherStatus }) {
  switch (status) {
    case 'PENDING':
      return (
        <Badge tone="amber">
          <Clock className="h-3 w-3 mr-1" />
          Pending
        </Badge>
      )
    case 'PAID':
      return (
        <Badge tone="green">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Paid
        </Badge>
      )
    case 'REJECTED':
      return (
        <Badge tone="red">
          <XCircle className="h-3 w-3 mr-1" />
          Rejected
        </Badge>
      )
    default:
      return (
        <Badge>
          <Circle className="h-3 w-3 mr-1" />
          {status}
        </Badge>
      )
  }
}
