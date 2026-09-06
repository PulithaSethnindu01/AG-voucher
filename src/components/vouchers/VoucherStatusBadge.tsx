import type { VoucherStatus } from '../../types/database'
import { Badge } from '../ui/Badge'

export function VoucherStatusBadge({ status }: { status: VoucherStatus }) {
  switch (status) {
    case 'PENDING':
      return <Badge tone="amber">Pending</Badge>
    case 'PAID':
      return <Badge tone="green">Paid</Badge>
    case 'REJECTED':
      return <Badge tone="red">Rejected</Badge>
    default:
      return <Badge>{status}</Badge>
  }
}
