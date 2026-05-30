import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/Card'
import {
  Library,
  FileText,
  Users,
  Building2,
  Search,
  BookOpen,
  Download,
  Shield,
} from 'lucide-react'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*, tenants(name)')
    .eq('id', user.id)
    .single()

  const tenantId = profile?.tenant_id

  const [{ count: sitesCount }, { count: sourcesCount }, { count: documentsCount }] = await Promise.all([
    supabase.from('sites').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId ?? ''),
    supabase.from('knowledge_sources').select('*', { count: 'exact', head: true }),
    supabase.from('documents').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId ?? ''),
  ])

  const tenantName = (profile as any)?.tenants?.name ?? 'Your Organisation'
  const displayName = profile?.full_name ?? user.email ?? 'User'

  const modules = [
    { label: 'Search', desc: 'Search compliance requirements', href: '/search', icon: Search, available: false },
    { label: 'Requirements', desc: 'Browse extracted requirements', href: '/requirements', icon: BookOpen, available: false },
    { label: 'Documents', desc: 'Manage uploaded documents', href: '/documents', icon: FileText, available: true },
    { label: 'Knowledge Sources', desc: 'Manage standards and sources', href: '/knowledge-sources', icon: Library, available: true },
    { label: 'Exports', desc: 'Generate compliance reports', href: '/exports', icon: Download, available: false },
    { label: 'Administration', desc: 'Users, sites and settings', href: '/admin/users', icon: Shield, available: true },
  ]

  return (
    <div className="max-w-6xl mx-auto">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-[#00171f]">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">
          Welcome back, <span className="font-medium text-[#00171f]">{displayName}</span>
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="py-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#003459]/10 rounded-lg">
                <Building2 className="h-5 w-5 text-[#003459]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[#00171f]">{sitesCount ?? 0}</p>
                <p className="text-xs text-gray-500">Sites</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#007ea7]/10 rounded-lg">
                <Library className="h-5 w-5 text-[#007ea7]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[#00171f]">{sourcesCount ?? 0}</p>
                <p className="text-xs text-gray-500">Knowledge Sources</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#00a8e8]/10 rounded-lg">
                <FileText className="h-5 w-5 text-[#00a8e8]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[#00171f]">{documentsCount ?? 0}</p>
                <p className="text-xs text-gray-500">Documents</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Users className="h-5 w-5 text-green-700" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[#00171f]">—</p>
                <p className="text-xs text-gray-500">Requirements</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modules */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Modules</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {modules.map((mod) => {
            const Icon = mod.icon
            if (!mod.available) {
              return (
                <div key={mod.label} className="bg-white border border-gray-200 rounded-lg p-5 opacity-40 cursor-not-allowed">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <Icon className="h-5 w-5 text-gray-400" />
                    </div>
                    <div>
                      <p className="font-medium text-[#00171f] text-sm">{mod.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{mod.desc}</p>
                      <span className="inline-block mt-2 text-xs text-gray-400">Coming soon</span>
                    </div>
                  </div>
                </div>
              )
            }
            return (
              <Link key={mod.label} href={mod.href} className="bg-white border border-gray-200 rounded-lg p-5 hover:border-[#007ea7] hover:shadow-sm transition-all group">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-[#003459]/10 rounded-lg group-hover:bg-[#003459]/20 transition-colors">
                    <Icon className="h-5 w-5 text-[#003459]" />
                  </div>
                  <div>
                    <p className="font-medium text-[#00171f] text-sm">{mod.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{mod.desc}</p>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
