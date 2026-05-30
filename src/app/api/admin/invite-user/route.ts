import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  // Verify the calling user is an admin
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: callerProfile } = await supabase
    .from('user_profiles')
    .select('tenant_id, role, is_system_owner')
    .eq('id', user.id)
    .single()

  if (!['platform_admin', 'tenant_admin'].includes(callerProfile?.role ?? '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { email, fullName, role, tenantId } = await req.json()
  if (!email || !tenantId) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })

  // Only the system owner can assign platform_admin
  if (role === 'platform_admin' && !callerProfile?.is_system_owner) {
    return NextResponse.json({ error: 'Only the system owner can assign the Platform Admin role' }, { status: 403 })
  }

  // Use service role to create the user
  const adminSupabase = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: newUser, error: createError } = await adminSupabase.auth.admin.createUser({
    email,
    password: 'Compass2025!',
    email_confirm: true,
    user_metadata: { full_name: fullName },
  })

  if (createError) return NextResponse.json({ error: createError.message }, { status: 400 })

  // Update the auto-created profile
  const { data: profile, error: profileError } = await adminSupabase
    .from('user_profiles')
    .update({ tenant_id: tenantId, full_name: fullName || null, role, status: 'active' })
    .eq('id', newUser.user.id)
    .select()
    .single()

  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 })

  return NextResponse.json({ user: profile })
}
