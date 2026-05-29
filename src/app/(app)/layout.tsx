import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*, tenants(name)')
    .eq('id', user.id)
    .single()

  const tenantName = (profile as any)?.tenants?.name

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <TopBar
        tenantName={tenantName}
        userFullName={profile?.full_name ?? undefined}
        userEmail={user.email}
      />
      <main className="ml-60 pt-14 min-h-screen">
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  )
}
