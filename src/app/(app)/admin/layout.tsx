import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AdminLayoutClient } from './AdminLayoutClient'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('is_system_owner')
    .eq('id', user.id)
    .single()

  return (
    <AdminLayoutClient isSystemOwner={profile?.is_system_owner ?? false}>
      {children}
    </AdminLayoutClient>
  )
}
