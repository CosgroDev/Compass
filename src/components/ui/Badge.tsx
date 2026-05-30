interface BadgeProps {
  status: string
  label?: string
}

const statusMap: Record<string, string> = {
  active: 'badge-active',
  approved: 'badge-approved',
  draft: 'badge-draft',
  staging: 'badge-staging',
  review_required: 'badge-review',
  rejected: 'badge-rejected',
  superseded: 'badge-superseded',
  inactive: 'badge-inactive',
  pending: 'badge-pending',
  pending_review: 'badge-pending',
  not_required: 'badge-draft',
  // document statuses
  uploaded: 'badge-draft',
  queued: 'badge-pending',
  processing: 'badge-staging',
  completed: 'badge-approved',
  failed: 'badge-rejected',
  published: 'badge-active',
  // job statuses
  running: 'badge-staging',
  queued_job: 'badge-pending',
}

const labelMap: Record<string, string> = {
  active: 'Active',
  approved: 'Approved',
  draft: 'Draft',
  staging: 'Staging',
  review_required: 'Review Required',
  rejected: 'Rejected',
  superseded: 'Superseded',
  inactive: 'Inactive',
  pending: 'Pending',
  pending_review: 'Pending Review',
  not_required: 'Not Required',
  uploaded: 'Uploaded',
  queued: 'Queued',
  processing: 'Processing',
  completed: 'Completed',
  failed: 'Failed',
  published: 'Published',
  running: 'Running',
}

export function Badge({ status, label }: BadgeProps) {
  const cls = statusMap[status] ?? 'badge-draft'
  const text = label ?? labelMap[status] ?? status
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${cls}`}>
      {text}
    </span>
  )
}
