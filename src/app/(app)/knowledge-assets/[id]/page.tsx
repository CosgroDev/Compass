import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent } from '@/components/ui/Card'
import { ArrowLeft, Calendar, CheckCircle } from 'lucide-react'
import Link from 'next/link'

export default async function KnowledgeAssetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: asset } = await supabase
    .from('knowledge_assets')
    .select('*, knowledge_sources(*)')
    .eq('id', id)
    .single()

  if (!asset) notFound()

  const source = (asset as any).knowledge_sources

  return (
    <div className="max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6 text-sm">
        <Link href="/knowledge-sources" className="text-[#007ea7] hover:text-[#003459]">Knowledge Sources</Link>
        <span className="text-gray-400">/</span>
        <Link href={`/knowledge-sources/${source?.id}`} className="text-[#007ea7] hover:text-[#003459]">
          {source?.name}
        </Link>
        <span className="text-gray-400">/</span>
        <span className="text-gray-600">{asset.version_label}</span>
      </div>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-semibold text-[#00171f]">{asset.title}</h1>
          <Badge status={asset.status} />
          {asset.is_active && (
            <span className="flex items-center gap-1 text-green-600 text-xs font-medium bg-green-50 border border-green-200 rounded px-2 py-0.5">
              <CheckCircle className="h-3.5 w-3.5" /> Active Version
            </span>
          )}
        </div>
        <p className="text-gray-500 text-sm">
          {source?.name} · {asset.version_label}
        </p>
      </div>

      {/* Metadata */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-gray-500 mb-1">Version</p>
            <p className="font-bold text-[#003459]">{asset.version_label}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-gray-500 mb-1">Issue Date</p>
            <p className="font-medium text-[#00171f]">
              {asset.issue_date
                ? new Date(asset.issue_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                : '—'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-gray-500 mb-1">Effective Date</p>
            <p className="font-medium text-[#00171f]">
              {asset.effective_date
                ? new Date(asset.effective_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                : '—'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-gray-500 mb-1">Source Type</p>
            <p className="font-medium text-[#00171f]">{source?.source_type ?? '—'}</p>
          </CardContent>
        </Card>
      </div>

      {/* Source info */}
      <Card>
        <CardContent className="py-5">
          <h2 className="font-semibold text-[#00171f] mb-3">Source Information</h2>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-gray-500">Knowledge Source</dt>
              <dd className="font-medium text-[#00171f] mt-0.5">{source?.name ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Owner / Body</dt>
              <dd className="font-medium text-[#00171f] mt-0.5">{source?.owner ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Requires Licence</dt>
              <dd className="font-medium text-[#00171f] mt-0.5">{source?.requires_license ? 'Yes' : 'No'}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Asset Status</dt>
              <dd className="mt-0.5"><Badge status={asset.status} /></dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <div className="mt-6 p-4 bg-[#00a8e8]/5 border border-[#00a8e8]/20 rounded-lg">
        <p className="text-sm text-gray-600">
          <span className="font-medium text-[#003459]">Document processing</span> for this asset will be available in Sprint 3.
          Once documents are uploaded and processed, requirements, clauses and tables will appear here.
        </p>
      </div>
    </div>
  )
}
