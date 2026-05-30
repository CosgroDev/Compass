import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ProfileClient } from './ProfileClient'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('full_name, role, is_system_owner')
    .eq('id', user.id)
    .single()

  return (
    <ProfileClient
      userEmail={user.email ?? ''}
      fullName={profile?.full_name ?? ''}
      role={profile?.role ?? ''}
      isSystemOwner={profile?.is_system_owner ?? false}
    />
  )
}
